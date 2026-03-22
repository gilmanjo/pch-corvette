#!/usr/bin/env python3
"""
normalize_clips.py

Reads raw PDR .mp4 files from SOURCE_DIR, splits each into fixed-length
chunks using ffmpeg stream copy (no re-encode), and writes them to
OUTPUT_DIR with filenames derived from the UTC start timestamp of each chunk.

Output filename format: pdr_YYYYMMDD_HHMMSSZ.mp4
  e.g. pdr_20210529_085856Z.mp4 = clip starting at 2021-05-29 08:58:56 UTC

Nothing in SOURCE_DIR is modified.
"""

import subprocess
import json
import os
import sys
import math
from datetime import datetime, timedelta, timezone

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SOURCE_DIRS = [
    "/mnt/d/Photos/West Coast Trip/Card Dump/100PDR02",
    "/mnt/d/Photos/West Coast Trip/DCIM/100PDR02",
]
OUTPUT_DIR = "/home/jgilman/pch-corvette/pipeline/data/raw"
CHUNK_SECONDS = 300  # 5-minute chunks

# ---------------------------------------------------------------------------


def probe(path: str) -> dict:
    """Return ffprobe format dict for a file."""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)["format"]


def split_clip(src_path: str, creation_time: datetime, duration_s: float) -> None:
    """Split src_path into CHUNK_SECONDS-length pieces, stream-copied to OUTPUT_DIR."""
    num_chunks = math.ceil(duration_s / CHUNK_SECONDS)
    src_name = os.path.basename(src_path)

    for i in range(num_chunks):
        seek_offset = i * CHUNK_SECONDS
        chunk_start_utc = creation_time + timedelta(seconds=seek_offset)
        # Actual duration of this chunk (last chunk may be shorter)
        chunk_dur = min(CHUNK_SECONDS, duration_s - seek_offset)

        ts = chunk_start_utc.strftime("%Y%m%d_%H%M%SZ")
        out_name = f"pdr_{ts}.mov"
        out_path = os.path.join(OUTPUT_DIR, out_name)

        if os.path.exists(out_path):
            print(f"  [skip] {out_name} already exists")
            continue

        print(f"  {src_name}  chunk {i+1}/{num_chunks}  -> {out_name}  "
              f"(offset={seek_offset}s, dur={chunk_dur:.1f}s)")

        subprocess.run(
            [
                "ffmpeg",
                "-loglevel", "error",
                "-ss", str(seek_offset),
                "-i", src_path,
                "-t", str(chunk_dur),
                "-map", "0",            # copy ALL streams (video, audio, data/telemetry)
                "-c", "copy",           # stream copy — no re-encode
                "-tag:d:0", "marl",     # preserve Cougar PDR 2.0 data track tag
                out_path,
            ],
            check=True,
        )


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Collect all .mp4 files across all source dirs, track which dir each came from
    all_files = []
    for src_dir in SOURCE_DIRS:
        if not os.path.isdir(src_dir):
            print(f"[WARN] Source dir not found, skipping: {src_dir}", file=sys.stderr)
            continue
        for fname in sorted(f for f in os.listdir(src_dir) if f.lower().endswith(".mp4")):
            all_files.append((src_dir, fname))

    if not all_files:
        print("No .mp4 files found in any source directory.", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(all_files)} source clips across {len(SOURCE_DIRS)} directories")
    print(f"Output dir: {OUTPUT_DIR}")
    print(f"Chunk size: {CHUNK_SECONDS}s ({CHUNK_SECONDS//60}m)\n")

    for src_dir, fname in all_files:
        fpath = os.path.join(src_dir, fname)
        fmt = probe(fpath)

        duration_s = float(fmt["duration"])
        ctime_str = fmt.get("tags", {}).get("creation_time")
        if not ctime_str:
            print(f"[WARN] {fname}: no creation_time metadata — skipping")
            continue

        creation_time = datetime.fromisoformat(
            ctime_str.replace("Z", "+00:00")
        ).astimezone(timezone.utc).replace(tzinfo=None)
        # creation_time is now a naive UTC datetime

        num_chunks = math.ceil(duration_s / CHUNK_SECONDS)
        print(f"{fname}  dur={duration_s:.0f}s  created={ctime_str}  -> {num_chunks} chunks")
        split_clip(fpath, creation_time, duration_s)

    print("\nDone.")


if __name__ == "__main__":
    main()
