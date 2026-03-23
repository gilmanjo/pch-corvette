#!/usr/bin/env python3
"""
Build route_pdr.geojson from PDR track files.

Reads clip_index.json, walks each clip's track file in chronological order,
and assembles a single LineString GeoJSON from all GPS fixes.

Output: pipeline/data/processed/route_pdr.geojson
        (copy to web/public/route_pdr.geojson for dev)
"""

import json
import sys
from pathlib import Path

PROCESSED = Path(__file__).parent.parent / "data" / "processed"
INDEX_PATH = PROCESSED / "clip_index.json"
OUTPUT_PATH = PROCESSED / "route_pdr.geojson"


def main():
    if not INDEX_PATH.exists():
        sys.exit(f"clip_index.json not found at {INDEX_PATH}")

    with INDEX_PATH.open() as f:
        index = json.load(f)

    chunks = index["chunks"]
    print(f"Processing {len(chunks)} clips…")

    # Keep one GPS point per KEEP_EVERY_N to stay web-friendly.
    # PDR GPS is ~10 Hz; keeping every 200th gives ~1 point per 20 seconds.
    KEEP_EVERY_N = 200

    # Build a MultiLineString — one line per clip — so there are no
    # straight-line artifacts between clips (overnight stops, parking, etc.).
    segments = []
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

        # GPS point format: [t, lat, lng, alt_m, hdg_deg]
        gps = track.get("gps", [])
        total_pts += len(gps)
        seg = []
        for i, pt in enumerate(gps):
            if i % KEEP_EVERY_N == 0:
                _t, lat, lng = pt[0], pt[1], pt[2]
                seg.append([lng, lat])
        # Always include the last point so each segment ends where the clip ends
        if gps and (len(gps) - 1) % KEEP_EVERY_N != 0:
            _t, lat, lng = gps[-1][0], gps[-1][1], gps[-1][2]
            seg.append([lng, lat])
        if len(seg) >= 2:
            segments.append(seg)
            total_kept += len(seg)

    print(f"  {total_pts} total pts → {total_kept} kept across {len(segments)} segments, {skipped} tracks missing")

    geojson = {
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
                "geometry": {
                    "type": "MultiLineString",
                    "coordinates": segments,
                },
            }
        ],
    }

    with OUTPUT_PATH.open("w") as f:
        json.dump(geojson, f, separators=(",", ":"))

    print(f"Written → {OUTPUT_PATH}  ({OUTPUT_PATH.stat().st_size // 1024} KB)")
    print(f"\nCopy to web/public for dev:")
    print(f"  cp {OUTPUT_PATH} web/public/route_pdr.geojson")


if __name__ == "__main__":
    main()