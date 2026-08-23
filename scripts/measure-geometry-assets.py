#!/usr/bin/env python3
"""Measure local mesh/point-cloud assets without silently assuming metric scale.

The extractor is intentionally dependency-light. It handles OBJ, ASCII PLY,
XYZ/PTS/CSV/TXT point lists, NPY/NPZ arrays, and LAS headers. Every result
keeps a scale-status field because a bounding box in model units is not a
building measurement until the source provides control or a verified scale.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import struct
from datetime import datetime, timezone
from pathlib import Path

try:
    import numpy as np
except ImportError as error:  # pragma: no cover - the bundled runtime includes numpy.
    raise SystemExit("numpy is required for geometry asset measurement") from error


POINT_EXTENSIONS = {".xyz", ".pts", ".txt", ".csv", ".tsv"}
MESH_EXTENSIONS = {".obj", ".ply"}
ARRAY_EXTENSIONS = {".npy", ".npz"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def finite_points(values: list[list[float]]) -> np.ndarray:
    array = np.asarray(values, dtype=float)
    if array.ndim != 2 or array.shape[1] < 3:
        raise ValueError("at least three numeric coordinate columns are required")
    array = array[:, :3]
    array = array[np.isfinite(array).all(axis=1)]
    if not len(array):
        raise ValueError("no finite XYZ rows found")
    return array


def bounds_for(points: np.ndarray) -> dict:
    lower = points.min(axis=0)
    upper = points.max(axis=0)
    extent = upper - lower
    return {
        "min": [float(round(value, 9)) for value in lower],
        "max": [float(round(value, 9)) for value in upper],
        "extent": [float(round(value, 9)) for value in extent],
        "diagonal": float(round(float(np.linalg.norm(extent)), 9)),
    }


def parse_obj(path: Path) -> tuple[np.ndarray, int]:
    points: list[list[float]] = []
    faces = 0
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            if line.startswith("v "):
                parts = line.split()
                if len(parts) >= 4:
                    points.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif line.startswith("f "):
                faces += 1
    return finite_points(points), faces


def parse_ascii_ply(path: Path) -> tuple[np.ndarray, int]:
    with path.open("rb") as handle:
        header: list[str] = []
        while True:
            line = handle.readline()
            if not line:
                raise ValueError("PLY header has no end_header")
            decoded = line.decode("ascii", errors="replace").strip()
            header.append(decoded)
            if decoded == "end_header":
                break
        if any(line.startswith("format binary") for line in header):
            raise ValueError("binary PLY requires a dedicated decoder; ASCII PLY is supported")
        vertex_count = 0
        face_count = 0
        section = None
        for line in header:
            match = re.match(r"element\s+(\w+)\s+(\d+)", line)
            if match:
                section = match.group(1)
                if section == "vertex":
                    vertex_count = int(match.group(2))
                elif section == "face":
                    face_count = int(match.group(2))
        if vertex_count <= 0:
            raise ValueError("PLY has no vertex element")
        points = []
        for _ in range(vertex_count):
            parts = handle.readline().decode("ascii", errors="replace").split()
            points.append([float(parts[0]), float(parts[1]), float(parts[2])])
        return finite_points(points), face_count


def parse_text_points(path: Path) -> np.ndarray:
    rows: list[list[float]] = []
    delimiter = "\t" if path.suffix.lower() == ".tsv" else None
    with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
        if path.suffix.lower() in {".csv", ".tsv"}:
            reader = csv.reader(handle, delimiter=delimiter or ",")
            for row in reader:
                try:
                    rows.append([float(row[index]) for index in range(3)])
                except (ValueError, IndexError):
                    continue
        else:
            for line in handle:
                parts = re.split(r"[\s,;]+", line.strip())
                if len(parts) < 3:
                    continue
                try:
                    rows.append([float(parts[0]), float(parts[1]), float(parts[2])])
                except ValueError:
                    continue
    return finite_points(rows)


def parse_array(path: Path) -> np.ndarray:
    arrays = []
    if path.suffix.lower() == ".npy":
        arrays.append(np.load(path, allow_pickle=False))
    else:
        with np.load(path, allow_pickle=False) as archive:
            arrays.extend(archive[name] for name in archive.files)
    candidates = []
    for array in arrays:
        values = np.asarray(array)
        if values.ndim >= 2 and values.shape[-1] >= 3:
            reshaped = values.reshape(-1, values.shape[-1])[:, :3]
            candidates.append(reshaped)
    if not candidates:
        raise ValueError("NPY/NPZ contains no array with at least three coordinate columns")
    return finite_points(np.vstack(candidates).tolist())


def parse_las_header(path: Path) -> tuple[dict, int]:
    with path.open("rb") as handle:
        header = handle.read(375)
    if header[:4] != b"LASF":
        raise ValueError("not a LAS file")
    point_offset = struct.unpack_from("<I", header, 96)[0]
    point_format = header[104] & 0x3F
    record_length = struct.unpack_from("<H", header, 105)[0]
    legacy_count = struct.unpack_from("<I", header, 107)[0]
    scales = struct.unpack_from("<ddd", header, 131)
    offsets = struct.unpack_from("<ddd", header, 155)
    max_values = struct.unpack_from("<ddd", header, 179)
    min_values = struct.unpack_from("<ddd", header, 203)
    count = legacy_count
    if len(header) >= 255 and header[24] == 1 and header[25] >= 4:
        count = struct.unpack_from("<Q", header, 247)[0]
    lower = [min_values[i] * 1 for i in range(3)]
    upper = [max_values[i] * 1 for i in range(3)]
    return {
        "pointOffset": point_offset,
        "pointFormat": point_format,
        "recordLength": record_length,
        "scale": list(scales),
        "offset": list(offsets),
        "bounds": {"min": lower, "max": upper, "extent": [upper[i] - lower[i] for i in range(3)], "diagonal": math.sqrt(sum((upper[i] - lower[i]) ** 2 for i in range(3)))},
    }, int(count)


def measure_file(path: Path, root: Path) -> dict:
    suffix = path.suffix.lower()
    result = {
        "path": path.relative_to(root).as_posix(),
        "sizeBytes": path.stat().st_size,
        "sha256": sha256(path),
        "format": suffix.lstrip(".") or "unknown",
        "measurementStatus": "unread",
        "scaleStatus": "unknown-until-control-is-verified",
    }
    try:
        if suffix == ".obj":
            points, faces = parse_obj(path)
            result["faceCount"] = faces
        elif suffix == ".ply":
            points, faces = parse_ascii_ply(path)
            result["faceCount"] = faces
        elif suffix in POINT_EXTENSIONS:
            points = parse_text_points(path)
        elif suffix in ARRAY_EXTENSIONS:
            points = parse_array(path)
        elif suffix in {".las", ".laz"}:
            if suffix == ".laz":
                raise ValueError("LAZ requires a decompressor such as laspy or PDAL")
            header, count = parse_las_header(path)
            result.update({"pointCount": count, "lasHeader": header, "bounds": header["bounds"], "measurementStatus": "header-bounds-read"})
            return result
        else:
            result["measurementStatus"] = "unsupported-format"
            return result
        result.update({"pointCount": int(len(points)), "bounds": bounds_for(points), "measurementStatus": "bounds-read"})
    except Exception as error:  # retain a record so one bad asset cannot hide the rest.
        result["measurementStatus"] = "error"
        result["error"] = f"{type(error).__name__}: {error}"
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="research/raw", help="Directory containing local geometry assets")
    parser.add_argument("--output", default="research/asset-measurements.json", help="Output JSON path")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output).resolve()
    if not root.exists():
        raise SystemExit(f"Asset root does not exist: {root}")
    assets = [path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in (POINT_EXTENSIONS | MESH_EXTENSIONS | ARRAY_EXTENSIONS | {".las", ".laz"})]
    records = [measure_file(path, root) for path in sorted(assets)]
    payload = {
        "title": "Sacred Geometry Atlas local geometry asset measurements",
        "generatedBy": "scripts/measure-geometry-assets.py",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "root": root.relative_to(Path.cwd()).as_posix() if root.is_relative_to(Path.cwd()) else str(root),
        "note": "Bounds are file/model coordinates until scale and control are verified. They are not automatically building dimensions.",
        "records": records,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    readable = sum(record["measurementStatus"] in {"bounds-read", "header-bounds-read"} for record in records)
    print(f"Geometry asset measurement pass: {readable}/{len(records)} supported assets; output at {output.relative_to(Path.cwd()) if output.is_relative_to(Path.cwd()) else output}.")


if __name__ == "__main__":
    main()
