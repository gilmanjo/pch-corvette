#!/usr/bin/env python3
"""
transcode_web.py

Remux raw .mov clips (already H.264/AAC) into web-compatible MP4 containers.
Uses stream copy — no re-encoding, so it's fast and lossless.

Input:  pipeline/data/raw/*.mov
Output: pipeline/data/processed/video/*.mp4

Usage:
    python3 pipeline/scripts/transcode_web.py [--workers N] [--filter SUBSTR]
"""

import argparse
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
VIDEO_DIR = Path(__file__).parent.parent / "data" / "processed" / "video"


def has_pcm_audio(src: Path) -> bool:
    """Return True if any audio stream uses a PCM codec."""
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", str(src)],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        return False
    import json
    streams = json.loads(r.stdout).get("streams", [])
    return any(s.get("codec_name", "").startswith("pcm_") for s in streams)


def remux(src: Path) -> tuple[str, bool, str]:
    """Remux src .mov -> .mp4. Returns (name, success, message).
    PCM audio is transcoded to AAC; everything else is stream-copied."""
    dst = VIDEO_DIR / src.with_suffix(".mp4").name
    if dst.exists():
        return (src.name, True, "skip")

    if has_pcm_audio(src):
        audio_flags = ["-c:a", "aac", "-b:a", "128k"]
    else:
        audio_flags = ["-c:a", "copy"]

    result = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel", "error",
            "-i", str(src),
            "-c:v", "copy",
            *audio_flags,
            "-movflags", "+faststart",
            str(dst),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return (src.name, False, result.stderr.strip())
    return (src.name, True, f"{dst.stat().st_size // (1024*1024)}MB")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=4, help="Parallel ffmpeg workers")
    parser.add_argument("--filter", default="", help="Only process files matching this substring")
    args = parser.parse_args()

    VIDEO_DIR.mkdir(parents=True, exist_ok=True)

    sources = sorted(RAW_DIR.glob("*.mov"))
    if args.filter:
        sources = [s for s in sources if args.filter in s.name]

    if not sources:
        sys.exit(f"No .mov files found in {RAW_DIR}")

    total = len(sources)
    done = 0
    errors = []

    print(f"Remuxing {total} clips with {args.workers} workers...")

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(remux, src): src for src in sources}
        for future in as_completed(futures):
            name, ok, msg = future.result()
            done += 1
            if not ok:
                errors.append((name, msg))
                print(f"  [{done}/{total}] ERROR {name}: {msg}")
            elif msg != "skip":
                print(f"  [{done}/{total}] OK {name} -> {msg}")

    skipped = sum(1 for f in sources if (VIDEO_DIR / f.with_suffix(".mp4").name).exists()
                  and f.name not in [e[0] for e in errors])
    print(f"\nDone. {total - len(errors)} total, {len(errors)} failed.")
    if errors:
        print("Errors:")
        for name, msg in errors:
            print(f"  {name}: {msg}")
        sys.exit(1)


if __name__ == "__main__":
    main()