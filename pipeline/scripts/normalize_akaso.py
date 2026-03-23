#!/usr/bin/env python3
"""
normalize_akaso.py

Chunks AKASO camera footage into 5-minute segments with calibrated UTC
timestamps and writes them to pipeline/data/raw/ as akaso_YYYYMMDD_HHMMSSz.mov.

Calibration anchor
------------------
  astoria tower.MOV  fake creation_time = 2020-01-05T08:13:41Z
  Timeline shows user at Astoria Column   = 2021-05-29T19:04:00Z (UTC)
  Offset = +44,103,019 seconds (510 days + 10h 50m 19s)

All three card dumps from the same camera share this single offset.

Sources
-------
  AKASO 1/VIDEO  — May 29 (Astoria) through ~May 31
  Card Dump/     — May 30–31 Oregon coast (loose .MOV files only, not subfolders)
  AKASO 2/VIDEO  — June 1 (Point Reyes) onward
"""

import json
import math
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

AKASO_SOURCES = [
    "/mnt/d/Photos/West Coast Trip/AKASO 1/VIDEO",
    "/mnt/d/Photos/West Coast Trip/AKASO 2/VIDEO",
]
# Loose .MOV files directly in Card Dump root (not subfolders)
CARD_DUMP_ROOT = "/mnt/d/Photos/West Coast Trip/Card Dump"

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "raw"
CHUNK_SECONDS = 300  # 5-minute chunks

# Calibration: real_utc = fake_creation_time + OFFSET
OFFSET = timedelta(seconds=44_103_019)

# ---------------------------------------------------------------------------


def probe(path: str) -> dict:
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
        capture_output=True, text=True, check=True,
    )
    return json.loads(r.stdout)["format"]


def split_clip(src_path: str, real_start: datetime, duration_s: float) -> None:
    num_chunks = math.ceil(duration_s / CHUNK_SECONDS)
    src_name = os.path.basename(src_path)

    for i in range(num_chunks):
        seek_offset = i * CHUNK_SECONDS
        chunk_start = real_start + timedelta(seconds=seek_offset)
        chunk_dur = min(CHUNK_SECONDS, duration_s - seek_offset)

        ts = chunk_start.strftime("%Y%m%d_%H%M%SZ")
        out_name = f"akaso_{ts}.mov"
        out_path = OUTPUT_DIR / out_name

        if out_path.exists():
            print(f"  [skip] {out_name} already exists")
            continue

        print(f"  {src_name}  chunk {i+1}/{num_chunks}  -> {out_name}  "
              f"(offset={seek_offset}s, dur={chunk_dur:.1f}s)")

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel", "error",
                "-ss", str(seek_offset),
                "-i", src_path,
                "-t", str(chunk_dur),
                "-map", "0",
                "-c", "copy",
                str(out_path),
            ],
            check=True,
        )


def collect_sources() -> list[tuple[str, str]]:
    """Return list of (label, filepath) sorted by fake creation_time."""
    files = []

    for src_dir in AKASO_SOURCES:
        label = os.path.basename(os.path.dirname(src_dir))  # "AKASO 1" or "AKASO 2"
        if not os.path.isdir(src_dir):
            print(f"[WARN] Not found, skipping: {src_dir}", file=sys.stderr)
            continue
        for fname in os.listdir(src_dir):
            if fname.lower().endswith((".mp4", ".mov")):
                files.append((label, os.path.join(src_dir, fname)))

    # Card Dump: only loose files in root (skip subfolders like 100PDR02, 113_FUJI)
    if os.path.isdir(CARD_DUMP_ROOT):
        for fname in os.listdir(CARD_DUMP_ROOT):
            fpath = os.path.join(CARD_DUMP_ROOT, fname)
            if os.path.isfile(fpath) and fname.lower().endswith((".mp4", ".mov")):
                files.append(("CardDump", fpath))
    else:
        print(f"[WARN] Card Dump not found: {CARD_DUMP_ROOT}", file=sys.stderr)

    # Sort by fake creation_time so output is chronological
    def sort_key(item):
        _, fpath = item
        try:
            fmt = probe(fpath)
            return fmt.get("tags", {}).get("creation_time", "")
        except Exception:
            return ""

    files.sort(key=sort_key)
    return files


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    sources = collect_sources()
    print(f"Found {len(sources)} AKASO source files")
    print(f"Calibration offset: +{OFFSET.total_seconds():.0f}s "
          f"({OFFSET.days}d {OFFSET.seconds//3600}h {(OFFSET.seconds%3600)//60}m)\n")

    for label, fpath in sources:
        try:
            fmt = probe(fpath)
        except Exception as e:
            print(f"[ERROR] ffprobe failed for {os.path.basename(fpath)}: {e}")
            continue

        duration_s = float(fmt.get("duration", 0))
        ct_str = fmt.get("tags", {}).get("creation_time", "")
        if not ct_str:
            print(f"[WARN] {os.path.basename(fpath)}: no creation_time — skipping")
            continue

        fake_time = datetime.fromisoformat(ct_str.replace("Z", "+00:00")).astimezone(timezone.utc)
        real_start = fake_time + OFFSET

        num_chunks = math.ceil(duration_s / CHUNK_SECONDS)
        print(f"[{label}] {os.path.basename(fpath)}  "
              f"dur={duration_s:.0f}s  "
              f"real_start={real_start.strftime('%Y-%m-%dT%H:%M:%SZ')}  "
              f"-> {num_chunks} chunk(s)")

        split_clip(fpath, real_start, duration_s)

    print("\nDone.")


if __name__ == "__main__":
    main()