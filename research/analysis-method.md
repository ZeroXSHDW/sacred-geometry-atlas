# Geometry and attribution method

The current Atlas geometry values are still intentionally schematic. The analysis is a transparent calculator for the next phase, not a claim that every record has been measured.

For each record, `scripts/analyze-geometry.js` calculates:

- `L / W` — the plan length-to-span ratio.
- `H / W` — the section height-to-span ratio.
- `r / W` — the supplied radial reach relative to span.
- `module / W` and `L / module` — module-scale comparisons.
- `bayCount × module / L` — a check of the supplied rhythm against the supplied envelope.
- a nearest simple fraction with denominator ≤ 24.
- the three nearest comparisons among 1:1, 3:2, φ, √2, √3, 2:1, 3:1, and 4:1.

A ratio is only a candidate pattern. A close match does not prove that a historical designer intended that constant, nor does it identify a builder. A metric result is only promoted to `reference-dimension` or `scan-derived` when the field is linked to a published dimension or a registered, scale-controlled dataset in [`measurement-register.json`](measurement-register.json). The current output therefore keeps most fields `schematic` and keeps constructor results `not-determined-by-geometry`.

The annotated atlas is a visual explanation of those calculations. Its math panel is normalized from the data and deliberately not registered to the photograph; the photograph is real visual evidence, not a hidden survey.
