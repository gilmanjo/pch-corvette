#!/usr/bin/env python3
"""
Build route_pdr.geojson and route_pdr_points.geojson from PDR track files.

route_pdr.geojson      — MultiLineString for the route overlay (one segment per clip)
route_pdr_points.geojson — Point features with time/speed/heading for hover tooltips

Outputs: pipeline/data/processed/route_pdr.geojson
         pipeline/data/processed/route_pdr_points.geojson
         (copy both to web/public/ for dev)
"""

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROCESSED = Path(__file__).parent.parent / "data" / "processed"
INDEX_PATH = PROCESSED / "clip_index.json"
OUTPUT_PATH = PROCESSED / "route_pdr.geojson"
POINTS_PATH = PROCESSED / "route_pdr_points.geojson"

# Keep one GPS point per KEEP_EVERY_N for the route line (~17K points).
# Also used for the hover points layer.
KEEP_EVERY_N = 200


def utc_at_seek(t_start: str, seek_seconds: float) -> str:
    ms = datetime.fromisoformat(t_start.replace("Z", "+00:00")).timestamp()
    return datetime.fromtimestamp(ms + seek_seconds, tz=timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )


def nearest_speed(speed_records: list, t: float) -> float | None:
    """Return speed in km/h for the GPS timestamp t, or None."""
    if not speed_records:
        return None
    # speed_records is [[t, raw], ...] sorted by t; raw ÷ 100 = km/h
    best = min(speed_records, key=lambda r: abs(r[0] - t))
    if abs(best[0] - t) > 2.0:  # >2s away, don't use
        return None
    return round(best[1] / 100, 1)


def main():
    if not INDEX_PATH.exists():
        sys.exit(f"clip_index.json not found at {INDEX_PATH}")

    with INDEX_PATH.open() as f:
        index = json.load(f)

    chunks = index["chunks"]
    print(f"Processing {len(chunks)} clips…")

    segments = []       # for MultiLineString
    point_features = [] # for hover FeatureCollection
    skipped = 0
    total_pts = 0
    total_kept = 0

    for chunk in chunks:
        track_path = PROCESSED / chunk["track"]
        if not track_path.exists():
            skipped += 1
            continue

        with track_path.open() as f:
            track = json.load(f)

        gps = track.get("gps", [])
        speed_records = track.get("telemetry", {}).get("speed", [])
        total_pts += len(gps)

        seg = []
        indices = set(range(0, len(gps), KEEP_EVERY_N))
        if gps:
            indices.add(len(gps) - 1)  # always include last point

        for i in sorted(indices):
            pt = gps[i]
            t, lat, lng = pt[0], pt[1], pt[2]
            seg.append([lng, lat])

            speed_kmh = nearest_speed(speed_records, t)
            point_features.append({
                "type": "Feature",
                "properties": {
                    "utc": utc_at_seek(chunk["t_start"], t),
                    "speed_kmh": speed_kmh,
                    "speed_mph": round(speed_kmh * 0.621371, 1) if speed_kmh is not None else None,
                    "heading": round(pt[4], 0) if len(pt) > 4 else None,
                },
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
            })

        if len(seg) >= 2:
            segments.append(seg)
            total_kept += len(seg)

    print(f"  {total_pts} total pts → {total_kept} kept across {len(segments)} segments, {skipped} tracks missing")

    # Route MultiLineString
    route_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "source": "pdr_telemetry",
                    "trip_start": chunks[0]["t_start"][:10] if chunks else "",
                    "trip_end": chunks[-1]["t_end"][:10] if chunks else "",
                    "point_count": total_kept,
                    "segment_count": len(segments),
                },
                "geometry": {"type": "MultiLineString", "coordinates": segments},
            }
        ],
    }

    with OUTPUT_PATH.open("w") as f:
        json.dump(route_geojson, f, separators=(",", ":"))
    print(f"Written → {OUTPUT_PATH}  ({OUTPUT_PATH.stat().st_size // 1024} KB)")

    # Hover points FeatureCollection
    points_geojson = {
        "type": "FeatureCollection",
        "features": point_features,
    }
    with POINTS_PATH.open("w") as f:
        json.dump(points_geojson, f, separators=(",", ":"))
    print(f"Written → {POINTS_PATH}  ({POINTS_PATH.stat().st_size // 1024} KB)")

    print(f"\nCopy to web/public for dev:")
    print(f"  cp {OUTPUT_PATH} {POINTS_PATH} web/public/")


if __name__ == "__main__":
    main()