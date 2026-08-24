#!/usr/bin/env python3
"""Measure a COLMAP scene without silently converting reconstruction units to metres.

The St Paul's public IMC sequence contains a COLMAP sparse reconstruction and
PatchMatchStereo depth maps. This reader records the complete sparse scene
counts, camera/image metadata, point-cloud bounds, every depth-map header and
valid-value summary, and a deterministic world-space sample back-projected
from the depth maps. The raw files remain the authoritative data source.

COLMAP reconstructions are up to a similarity transform. Until a surveyed
control point, known baseline, or documented metric calibration is matched to
the model, all computed bounds are explicitly labelled native scene units.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np


CAMERA_MODELS = {
    0: ("SIMPLE_PINHOLE", 3),
    1: ("PINHOLE", 4),
    2: ("SIMPLE_RADIAL", 4),
    3: ("RADIAL", 5),
    4: ("OPENCV", 8),
    5: ("OPENCV_FISHEYE", 8),
    6: ("FULL_OPENCV", 12),
    7: ("FOV", 5),
    8: ("SIMPLE_RADIAL_FISHEYE", 4),
    9: ("RADIAL_FISHEYE", 5),
    10: ("THIN_PRISM_FISHEYE", 12),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_struct(handle, fmt: str):
    size = struct.calcsize(fmt)
    data = handle.read(size)
    if len(data) != size:
        raise ValueError(f"unexpected end of file while reading {fmt}")
    return struct.unpack(fmt, data)


def read_c_string(handle) -> str:
    chunks = bytearray()
    while True:
        byte = handle.read(1)
        if not byte:
            raise ValueError("unexpected end of file while reading image name")
        if byte == b"\x00":
            return chunks.decode("utf-8", errors="replace")
        chunks.extend(byte)


def quaternion_to_rotation(qvec: np.ndarray) -> np.ndarray:
    w, x, y, z = qvec
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ], dtype=float)


def round_value(value: float) -> float:
    return float(round(float(value), 9))


def rounded_vector(values) -> list[float]:
    return [round_value(value) for value in np.asarray(values, dtype=float)]


def bounds_summary(points: np.ndarray) -> dict:
    if len(points) == 0:
        return {"pointCount": 0}
    finite = points[np.isfinite(points).all(axis=1)]
    if len(finite) == 0:
        return {"pointCount": 0}
    lower = finite.min(axis=0)
    upper = finite.max(axis=0)
    extent = upper - lower
    robust_lower = np.percentile(finite, 1, axis=0)
    robust_upper = np.percentile(finite, 99, axis=0)
    robust_extent = robust_upper - robust_lower
    return {
        "pointCount": int(len(finite)),
        "centroid": rounded_vector(finite.mean(axis=0)),
        "min": rounded_vector(lower),
        "max": rounded_vector(upper),
        "extent": rounded_vector(extent),
        "diagonal": round_value(np.linalg.norm(extent)),
        "robustP01P99": {
            "min": rounded_vector(robust_lower),
            "max": rounded_vector(robust_upper),
            "extent": rounded_vector(robust_extent),
            "diagonal": round_value(np.linalg.norm(robust_extent)),
        },
    }


def pca_summary(points: np.ndarray, max_points: int = 200_000) -> dict:
    if len(points) < 3:
        return {"status": "insufficient-points"}
    finite = points[np.isfinite(points).all(axis=1)]
    if len(finite) > max_points:
        indices = np.linspace(0, len(finite) - 1, max_points, dtype=np.int64)
        finite = finite[indices]
    centroid = finite.mean(axis=0)
    centered = finite - centroid
    covariance = np.cov(centered, rowvar=False)
    eigenvalues, eigenvectors = np.linalg.eigh(covariance)
    order = np.argsort(eigenvalues)[::-1]
    eigenvalues = eigenvalues[order]
    axes = eigenvectors[:, order].T
    projections = centered @ axes.T
    lower = np.percentile(projections, 1, axis=0)
    upper = np.percentile(projections, 99, axis=0)
    extent = upper - lower
    ratios = []
    for left, right in zip(extent[:-1], extent[1:]):
        ratios.append(None if abs(right) < 1e-12 else round_value(left / right))
    return {
        "status": "computed-from-native-coordinates",
        "sampleCount": int(len(finite)),
        "centroid": rounded_vector(centroid),
        "eigenvalues": rounded_vector(eigenvalues),
        "axes": [rounded_vector(axis) for axis in axes],
        "robustPrincipalExtentP01P99": rounded_vector(extent),
        "robustPrincipalExtentRatios": ratios,
    }


def read_cameras(path: Path) -> dict[int, dict]:
    cameras = {}
    with path.open("rb") as handle:
        (count,) = read_struct(handle, "<Q")
        for _ in range(count):
            camera_id, model_id = read_struct(handle, "<Ii")
            width, height = read_struct(handle, "<QQ")
            if model_id not in CAMERA_MODELS:
                raise ValueError(f"unsupported COLMAP camera model id {model_id}")
            model_name, parameter_count = CAMERA_MODELS[model_id]
            params = read_struct(handle, f"<{parameter_count}d")
            cameras[int(camera_id)] = {
                "id": int(camera_id),
                "modelId": int(model_id),
                "model": model_name,
                "width": int(width),
                "height": int(height),
                "params": rounded_vector(params),
            }
    return cameras


def read_images(path: Path) -> dict[str, dict]:
    images = {}
    with path.open("rb") as handle:
        (count,) = read_struct(handle, "<Q")
        for _ in range(count):
            (image_id,) = read_struct(handle, "<I")
            qvec = np.asarray(read_struct(handle, "<4d"), dtype=float)
            tvec = np.asarray(read_struct(handle, "<3d"), dtype=float)
            (camera_id,) = read_struct(handle, "<I")
            name = read_c_string(handle)
            (point_count,) = read_struct(handle, "<Q")
            observed = 0
            for _ in range(point_count):
                x, y, point3d_id = read_struct(handle, "<2dq")
                del x, y
                if point3d_id >= 0:
                    observed += 1
            rotation = quaternion_to_rotation(qvec)
            center = -rotation.T @ tvec
            images[name] = {
                "id": int(image_id),
                "name": name,
                "cameraId": int(camera_id),
                "observationCount": int(point_count),
                "registeredPoint3DCount": int(observed),
                "qvec": rounded_vector(qvec),
                "tvec": rounded_vector(tvec),
                "cameraCenter": rounded_vector(center),
                "rotationWorldToCamera": [rounded_vector(row) for row in rotation],
            }
    return images


def read_points3d(path: Path) -> tuple[np.ndarray, dict]:
    points = []
    errors = []
    tracks = []
    colors = []
    with path.open("rb") as handle:
        (count,) = read_struct(handle, "<Q")
        for _ in range(count):
            (point_id,) = read_struct(handle, "<Q")
            xyz = read_struct(handle, "<3d")
            rgb = read_struct(handle, "<3B")
            (error,) = read_struct(handle, "<d")
            (track_length,) = read_struct(handle, "<Q")
            handle.seek(int(track_length) * struct.calcsize("<2I"), 1)
            del point_id
            points.append(xyz)
            colors.append(rgb)
            errors.append(float(error))
            tracks.append(int(track_length))
    array = np.asarray(points, dtype=float)
    error_array = np.asarray(errors, dtype=float)
    track_array = np.asarray(tracks, dtype=float)
    color_array = np.asarray(colors, dtype=np.uint8)
    return array, {
        "declaredPointCount": int(count),
        "reprojectionError": {
            "min": round_value(error_array.min()) if len(error_array) else None,
            "median": round_value(np.median(error_array)) if len(error_array) else None,
            "max": round_value(error_array.max()) if len(error_array) else None,
        },
        "trackLength": {
            "min": int(track_array.min()) if len(track_array) else 0,
            "median": round_value(np.median(track_array)) if len(track_array) else 0,
            "max": int(track_array.max()) if len(track_array) else 0,
        },
        "meanRgb": rounded_vector(color_array.mean(axis=0)) if len(color_array) else [],
    }


def camera_intrinsics(camera: dict, depth_width: int, depth_height: int) -> tuple[float, float, float, float] | None:
    params = camera["params"]
    model = camera["model"]
    if model in {"SIMPLE_PINHOLE", "SIMPLE_RADIAL", "SIMPLE_RADIAL_FISHEYE"}:
        fx = fy = params[0]
        cx, cy = params[1:3]
    elif len(params) >= 4:
        fx, fy, cx, cy = params[:4]
    else:
        return None
    scale_x = depth_width / camera["width"]
    scale_y = depth_height / camera["height"]
    return fx * scale_x, fy * scale_y, cx * scale_x, cy * scale_y


def parse_depth_header(handle) -> tuple[int, int, int, int]:
    header = bytearray()
    separators = 0
    while separators < 3:
        byte = handle.read(1)
        if not byte:
            raise ValueError("depth map header is truncated")
        header.extend(byte)
        if byte == b"&":
            separators += 1
    values = header.decode("ascii").split("&")
    if len(values) < 4:
        raise ValueError("depth map header does not contain width, height, channels")
    width, height, channels = (int(values[index]) for index in range(3))
    return width, height, channels, len(header)


def sampled_indices(width: int, height: int, target: int) -> np.ndarray:
    total = width * height
    if total <= target:
        return np.arange(total, dtype=np.int64)
    stride = max(1, int(math.ceil(math.sqrt(total / target))))
    rows = np.arange(0, height, stride, dtype=np.int64)
    columns = np.arange(0, width, stride, dtype=np.int64)
    return (rows[:, None] * width + columns[None, :]).reshape(-1)


def inspect_depth_maps(
    depth_dir: Path,
    images: dict[str, dict],
    cameras: dict[int, dict],
    scene_root: Path,
    max_samples_per_map: int,
) -> tuple[dict, np.ndarray]:
    records = []
    depth_samples = []
    world_samples = []
    dimension_counts = Counter()
    unknown_images = 0
    missing_intrinsics = 0
    total_values = 0
    total_valid = 0
    global_min = None
    global_max = None
    for path in sorted(depth_dir.glob("*.photometric.bin")):
        with path.open("rb") as handle:
            width, height, channels, data_offset = parse_depth_header(handle)
            expected_values = width * height * channels
            handle.seek(data_offset)
            values = np.fromfile(handle, dtype="<f4", count=expected_values)
        if len(values) != expected_values:
            raise ValueError(f"{path} contains {len(values)} values; expected {expected_values}")
        plane = values[: width * height * channels].reshape(height, width, channels)[..., 0]
        valid = plane[np.isfinite(plane) & (plane > 0)]
        total_values += int(plane.size)
        total_valid += int(len(valid))
        if len(valid):
            local_min = float(valid.min())
            local_max = float(valid.max())
            global_min = local_min if global_min is None else min(global_min, local_min)
            global_max = local_max if global_max is None else max(global_max, local_max)
        indices = sampled_indices(width, height, max_samples_per_map)
        sampled = plane.reshape(-1)[indices]
        sampled = sampled[np.isfinite(sampled) & (sampled > 0)]
        depth_samples.append(sampled)
        image_name = path.name.removesuffix(".photometric.bin")
        image = images.get(image_name)
        world_count = 0
        if image is None:
            unknown_images += 1
        else:
            camera = cameras.get(image["cameraId"])
            intrinsics = camera_intrinsics(camera, width, height) if camera else None
            if intrinsics is None:
                missing_intrinsics += 1
            elif len(sampled):
                # Re-use the same deterministic pixel grid, retaining only valid depth values.
                sampled_values = plane.reshape(-1)[indices]
                valid_mask = np.isfinite(sampled_values) & (sampled_values > 0)
                valid_indices = indices[valid_mask]
                depths = sampled_values[valid_mask].astype(float)
                fx, fy, cx, cy = intrinsics
                pixels_x = valid_indices % width
                pixels_y = valid_indices // width
                camera_points = np.column_stack([
                    (pixels_x - cx) * depths / fx,
                    (pixels_y - cy) * depths / fy,
                    depths,
                ])
                rotation = quaternion_to_rotation(np.asarray(image["qvec"], dtype=float))
                translation = np.asarray(image["tvec"], dtype=float)
                world_points = (rotation.T @ (camera_points - translation).T).T
                world_samples.append(world_points)
                world_count = int(len(world_points))
        dimension_counts[f"{width}x{height}x{channels}"] += 1
        records.append({
            "path": path.relative_to(scene_root).as_posix(),
            "imageName": image_name,
            "sizeBytes": int(path.stat().st_size),
            "sha256": sha256(path),
            "width": int(width),
            "height": int(height),
            "channels": int(channels),
            "headerBytes": int(data_offset),
            "expectedValueCount": int(expected_values),
            "valueCount": int(len(values)),
            "validValueCount": int(len(valid)),
            "validRatio": round_value(len(valid) / plane.size) if plane.size else 0,
            "minPositiveDepth": round_value(valid.min()) if len(valid) else None,
            "maxPositiveDepth": round_value(valid.max()) if len(valid) else None,
            "backProjectedWorldSampleCount": world_count,
        })
    all_depth_samples = np.concatenate(depth_samples) if depth_samples else np.empty(0, dtype=float)
    all_world_samples = np.vstack(world_samples) if world_samples else np.empty((0, 3), dtype=float)
    depth_summary = {
        "mapCount": len(records),
        "dimensionCounts": dict(dimension_counts),
        "totalPlaneValueCount": total_values,
        "totalValidPositiveValueCount": total_valid,
        "validRatio": round_value(total_valid / total_values) if total_values else 0,
        "minPositiveDepth": round_value(global_min) if global_min is not None else None,
        "maxPositiveDepth": round_value(global_max) if global_max is not None else None,
        "sampleCountForPercentiles": int(len(all_depth_samples)),
        "samplePercentiles": {
            "p01": round_value(np.percentile(all_depth_samples, 1)) if len(all_depth_samples) else None,
            "p50": round_value(np.percentile(all_depth_samples, 50)) if len(all_depth_samples) else None,
            "p99": round_value(np.percentile(all_depth_samples, 99)) if len(all_depth_samples) else None,
        },
        "imageNameMisses": unknown_images,
        "missingCameraIntrinsics": missing_intrinsics,
        "records": records,
    }
    return depth_summary, all_world_samples


def relative_path(path: Path, project_root: Path) -> str:
    try:
        return path.resolve().relative_to(project_root.resolve()).as_posix()
    except ValueError:
        return str(path.resolve())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--scene-root",
        default="research/raw/st-pauls/extracted/st_pauls_cathedral",
        help="Extracted COLMAP scene directory",
    )
    parser.add_argument(
        "--output",
        default="research/st-pauls-colmap.json",
        help="Measurement JSON output",
    )
    parser.add_argument(
        "--max-depth-samples",
        type=int,
        default=4096,
        help="Maximum deterministic depth pixels back-projected per map",
    )
    args = parser.parse_args()
    project_root = Path.cwd().resolve()
    scene_root = Path(args.scene_root).resolve()
    output = Path(args.output).resolve()
    sparse_dir = scene_root / "dense" / "sparse"
    depth_dir = scene_root / "dense" / "stereo" / "depth_maps"
    required = [sparse_dir / "cameras.bin", sparse_dir / "images.bin", sparse_dir / "points3D.bin", depth_dir]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise SystemExit(f"COLMAP scene is incomplete; missing: {', '.join(missing)}")
    if args.max_depth_samples <= 0:
        raise SystemExit("--max-depth-samples must be positive")

    cameras = read_cameras(sparse_dir / "cameras.bin")
    images = read_images(sparse_dir / "images.bin")
    points, point_stats = read_points3d(sparse_dir / "points3D.bin")
    camera_centers = np.asarray([record["cameraCenter"] for record in images.values()], dtype=float)
    depth_summary, dense_world_samples = inspect_depth_maps(
        depth_dir,
        images,
        cameras,
        scene_root,
        args.max_depth_samples,
    )
    sparse_bounds = bounds_summary(points)
    camera_bounds = bounds_summary(camera_centers)
    dense_bounds = bounds_summary(dense_world_samples)
    sparse_pca = pca_summary(points)
    camera_pca = pca_summary(camera_centers)
    dense_pca = pca_summary(dense_world_samples)
    payload = {
        "title": "St Paul's Cathedral COLMAP and dense depth-map measurement record",
        "generatedBy": "scripts/measure-colmap-scene.py",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "churchId": "st-pauls",
        "source": {
            "archivePath": "research/raw/st-pauls/st_pauls_cathedral.tar.gz",
            "datasetUrl": "https://www.cs.ubc.ca/research/kmyi_data/imw2020/TestData/st_pauls_cathedral.tar.gz",
            "datasetPage": "https://www.cs.ubc.ca/~kmyi/imw2020/data.html",
            "archiveSha256": sha256(Path("research/raw/st-pauls/st_pauls_cathedral.tar.gz")),
            "sceneRoot": relative_path(scene_root, project_root),
            "format": "COLMAP sparse reconstruction plus PatchMatchStereo photometric depth maps",
        },
        "coverageBoundary": "This is a photogrammetric image-matching sequence, not LiDAR. The record does not infer complete interior or exterior coverage from the files; raw images and reconstruction remain the source data.",
        "scaleBoundary": "All sparse and dense bounds are native COLMAP reconstruction units. The St Paul's published dimensions are retained separately as reference control; no scale factor is applied because no verified correspondence between a model extent/control landmark and the published envelope has been established.",
        "files": {
            "cameras": {"path": relative_path(sparse_dir / "cameras.bin", project_root), "sizeBytes": (sparse_dir / "cameras.bin").stat().st_size, "sha256": sha256(sparse_dir / "cameras.bin")},
            "images": {"path": relative_path(sparse_dir / "images.bin", project_root), "sizeBytes": (sparse_dir / "images.bin").stat().st_size, "sha256": sha256(sparse_dir / "images.bin")},
            "points3D": {"path": relative_path(sparse_dir / "points3D.bin", project_root), "sizeBytes": (sparse_dir / "points3D.bin").stat().st_size, "sha256": sha256(sparse_dir / "points3D.bin")},
        },
        "sparse": {
            "cameraCount": len(cameras),
            "imageCount": len(images),
            "point3DCount": int(len(points)),
            "cameras": list(cameras.values()),
            "images": list(images.values()),
            "pointStats": point_stats,
            "pointCloud": {
                "coordinateSystem": "COLMAP model coordinates",
                "scaleStatus": "unscaled-reconstruction",
                "bounds": sparse_bounds,
                "principalAxes": sparse_pca,
            },
            "cameraCenters": {
                "coordinateSystem": "COLMAP world coordinates",
                "scaleStatus": "unscaled-reconstruction",
                "bounds": camera_bounds,
                "principalAxes": camera_pca,
            },
        },
        "denseDepthMaps": depth_summary,
        "denseWorldSample": {
            "coordinateSystem": "COLMAP world coordinates from calibrated camera poses and first-channel camera-z depths",
            "scaleStatus": "unscaled-reconstruction",
            "sampleStrategy": f"Up to {args.max_depth_samples} deterministic pixel samples per map; every map was read and its complete valid-value count/minimum/maximum was recorded.",
            "backProjectionAssumptions": [
                "PatchMatchStereo first channel is treated as camera-z depth.",
                "COLMAP camera intrinsics are resized to the depth-map dimensions.",
                "Distortion correction is not applied in this lightweight reader; use a calibrated COLMAP/photogrammetry tool for survey-grade reprojection.",
            ],
            "bounds": dense_bounds,
            "principalAxes": dense_pca,
        },
        "publishedReferenceControl": {
            "sourceUrl": "https://www.cityoflondon.gov.uk/assets/Services-Environment/ed-htb34-protected-views-spd.pdf",
            "page": 14,
            "dimensionsMetres": {"length": 169.2, "greatestBreadth": 75.0, "height": 111.6},
            "scaleFactorApplied": None,
            "status": "reference-only-unmatched-to-model",
        },
        "mathReadings": {
            "nativeSparseRobustAxisExtentRatios": sparse_pca.get("robustPrincipalExtentRatios", []),
            "nativeDenseRobustAxisExtentRatios": dense_pca.get("robustPrincipalExtentRatios", []),
            "publishedLengthToBreadth": round_value(169.2 / 75.0),
            "publishedHeightToBreadth": round_value(111.6 / 75.0),
            "interpretation": "Principal-axis extents and ratios describe the reconstruction's native shape distribution. They are useful for testing proportions, but they do not identify the historical constructor and are not metric until control is matched.",
        },
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"COLMAP measurement pass: {len(cameras)} cameras, {len(images)} images, "
        f"{len(points)} sparse points, {depth_summary['mapCount']} depth maps, "
        f"{len(dense_world_samples)} back-projected samples; output at {relative_path(output, project_root)}."
    )


if __name__ == "__main__":
    main()
