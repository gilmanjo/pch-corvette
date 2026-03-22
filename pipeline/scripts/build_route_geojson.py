"""
build_route_geojson.py

Builds route_timeline.geojson from the Google Maps Timeline excerpt.
Parses all timelinePath segments into a chronologically ordered, deduplicated
GeoJSON LineString. Only timelinePath segments are used — visit/activity
segments provide no coordinate breadcrumbs.

Output: pipeline/data/processed/route_timeline.geojson
"""

import json
from datetime import datetime
from pathlib import Path

EXCERPT = Path(__file__).parent.parent / "data" / "raw" / "timeline_trip_excerpt.json"
OUT = Path(__file__).parent.parent / "data" / "processed" / "route_timeline.geojson"


def parse_point(s: str) -> tuple[float, float]:
    """Parse '45.520094°, -122.680175°' → (lng, lat) for GeoJSON."""
    parts = s.replace("°", "").split(",")
    lat = float(parts[0].strip())
    lng = float(parts[1].strip())
    return lng, lat


def parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def main():
    with open(EXCERPT) as f:
        data = json.load(f)

    # Collect all (timestamp, lng, lat) from timelinePath segments
    points: list[tuple[datetime, float, float]] = []
    path_segment_count = 0

    for seg in data["semanticSegments"]:
        if "timelinePath" not in seg:
            continue
        path_segment_count += 1
        for pt in seg["timelinePath"]:
            dt = parse_dt(pt["time"])
            lng, lat = parse_point(pt["point"])
            points.append((dt, lng, lat))

    # Sort chronologically
    points.sort(key=lambda p: p[0])

    # Deduplicate consecutive identical coordinates
    coords: list[list[float]] = []
    prev = None
    for _, lng, lat in points:
        if (lng, lat) != prev:
            coords.append([lng, lat])
            prev = (lng, lat)

    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "source": "google_maps_timeline",
                    "trip_start": "2021-05-29",
                    "trip_end": "2021-06-13",
                    "point_count": len(coords),
                    "path_segments_used": path_segment_count,
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords,
                },
            }
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(geojson, f, separators=(",", ":"))

    print(f"timelinePath segments: {path_segment_count}")
    print(f"Total points (after dedup): {len(coords)}")
    print(f"Written to: {OUT}")


if __name__ == "__main__":
    main()
