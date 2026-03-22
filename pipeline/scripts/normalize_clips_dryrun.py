#!/usr/bin/env python3
"""Dry-run: shows what normalize_clips.py would produce without writing anything."""

import subprocess, json, os, math
from datetime import datetime, timedelta, timezone

SOURCE_DIR = "/mnt/d/Photos/West Coast Trip/Card Dump/100PDR02"
CHUNK_SECONDS = 300

def probe(path):
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)["format"]

files = sorted(f for f in os.listdir(SOURCE_DIR) if f.lower().endswith(".mp4"))
total_chunks = 0

for fname in files:
    fmt = probe(os.path.join(SOURCE_DIR, fname))
    duration_s = float(fmt["duration"])
    ctime_str = fmt.get("tags", {}).get("creation_time", "MISSING")
    creation_time = datetime.fromisoformat(
        ctime_str.replace("Z", "+00:00")
    ).astimezone(timezone.utc).replace(tzinfo=None)
    num_chunks = math.ceil(duration_s / CHUNK_SECONDS)
    total_chunks += num_chunks
    print(f"\n{fname}  ({duration_s:.0f}s / {duration_s/60:.1f}m)  -> {num_chunks} chunks")
    for i in range(num_chunks):
        offset = i * CHUNK_SECONDS
        ts = (creation_time + timedelta(seconds=offset)).strftime("%Y%m%d_%H%M%SZ")
        chunk_dur = min(CHUNK_SECONDS, duration_s - offset)
        print(f"  pdr_{ts}.mp4   ({chunk_dur:.0f}s)")

print(f"\nTotal output chunks: {total_chunks}")
