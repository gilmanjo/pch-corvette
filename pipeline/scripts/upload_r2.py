#!/usr/bin/env python3
"""
upload_r2.py

Upload pipeline outputs to Cloudflare R2 bucket 'pch-corvette'.

R2 bucket layout:
  video/pdr_*.mp4          — dashcam clips (remuxed)
  video/akaso_*.mp4        — AKASO clips (remuxed)
  tracks/pdr_*.json        — per-clip telemetry
  route_pdr.geojson
  route_pdr_points.geojson
  route_timeline.geojson
  clip_index.json

Required env vars (or .env file in repo root):
  R2_ACCOUNT_ID
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY

Usage:
    python3 pipeline/scripts/upload_r2.py [--what video|tracks|geojson|all] [--dry-run]
"""

import argparse
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError
except ImportError:
    sys.exit("boto3 not installed. Run: pip3 install boto3")

REPO_ROOT = Path(__file__).parent.parent.parent
PROCESSED = REPO_ROOT / "pipeline" / "data" / "processed"
BUCKET = "pch-corvette"


def load_env():
    env_file = REPO_ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def make_client():
    account_id = os.environ.get("R2_ACCOUNT_ID", "")
    access_key = os.environ.get("R2_ACCESS_KEY_ID", "")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY", "")

    missing = [k for k, v in [
        ("R2_ACCOUNT_ID", account_id),
        ("R2_ACCESS_KEY_ID", access_key),
        ("R2_SECRET_ACCESS_KEY", secret_key),
    ] if not v]
    if missing:
        sys.exit(f"Missing env vars: {', '.join(missing)}\nSet them in .env or export them.")

    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_file(client, local_path: Path, key: str, dry_run: bool) -> tuple[str, bool, str]:
    if dry_run:
        return (key, True, f"dry-run {local_path.stat().st_size // (1024*1024)}MB")
    try:
        # Skip if already uploaded with same size
        try:
            head = client.head_object(Bucket=BUCKET, Key=key)
            if head["ContentLength"] == local_path.stat().st_size:
                return (key, True, "skip")
        except ClientError:
            pass  # not found, proceed with upload

        content_type = "video/mp4" if key.endswith(".mp4") else (
            "application/json" if key.endswith(".json") else
            "application/geo+json" if key.endswith(".geojson") else
            "application/octet-stream"
        )
        client.upload_file(
            str(local_path),
            BUCKET,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return (key, True, f"{local_path.stat().st_size // (1024*1024)}MB")
    except Exception as e:
        return (key, False, str(e))


def collect_files(what: str) -> list[tuple[Path, str]]:
    """Returns list of (local_path, r2_key)."""
    files = []

    if what in ("video", "all"):
        video_dir = PROCESSED / "video"
        if video_dir.exists():
            for p in sorted(video_dir.glob("*.mp4")):
                files.append((p, f"video/{p.name}"))
        else:
            print(f"[WARN] {video_dir} not found — run transcode_web.py first")

    if what in ("tracks", "all"):
        tracks_dir = PROCESSED / "tracks"
        if tracks_dir.exists():
            for p in sorted(tracks_dir.glob("*.json")):
                files.append((p, f"tracks/{p.name}"))
        else:
            print(f"[WARN] {tracks_dir} not found")

    if what in ("geojson", "all"):
        for fname in [
            "route_pdr.geojson",
            "route_pdr_points.geojson",
            "route_timeline.geojson",
            "clip_index.json",
        ]:
            p = PROCESSED / fname
            if p.exists():
                files.append((p, fname))
            else:
                print(f"[WARN] {p} not found")

    return files


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--what", choices=["video", "tracks", "geojson", "all"], default="all")
    parser.add_argument("--dry-run", action="store_true", help="List files without uploading")
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    load_env()
    client = make_client()

    files = collect_files(args.what)
    if not files:
        sys.exit("No files to upload.")

    total = len(files)
    print(f"{'[DRY RUN] ' if args.dry_run else ''}Uploading {total} files to R2 bucket '{BUCKET}'...")

    done = 0
    errors = []

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(upload_file, client, local, key, args.dry_run): key
            for local, key in files
        }
        for future in as_completed(futures):
            key, ok, msg = future.result()
            done += 1
            if not ok:
                errors.append((key, msg))
                print(f"  [{done}/{total}] ERROR {key}: {msg}")
            elif msg != "skip":
                print(f"  [{done}/{total}] {key} -> {msg}")

    print(f"\nDone. {total - len(errors)} uploaded, {len(errors)} failed.")
    if errors:
        for key, msg in errors:
            print(f"  {key}: {msg}")
        sys.exit(1)


if __name__ == "__main__":
    main()