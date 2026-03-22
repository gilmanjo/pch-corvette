"""
build_clip_index.py

Parses the Cougar PDR 2.0 telemetry stream from every .mov chunk in
pipeline/data/raw/ and produces:

  pipeline/data/processed/clip_index.json
    One entry per clip: filename, UTC start/end, duration, GPS bounding box,
    and a pointer to the per-clip track file.

  pipeline/data/processed/tracks/<filename>.json
    Per-clip telemetry track. GPS points drive map interaction; all other
    channels are stored for future visualization features (speed heatmap,
    g-force overlay, tire temps, etc.).

Telemetry channel map (Cougar PDR 2.0, channels 1-67):
  GPS (3 Hz):       lat=0x26, lng=0x27, alt=0x28, heading=0x29
  Vehicle (10 Hz):  speed=0x1C, accel_lat=0x23, accel_lon=0x24, accel_vert=0x25
  Steering (57 Hz): steering_angle=0x1A
  Wheel speeds (35 Hz): lf=0x3B, rf=0x3C, lr=0x3D, rr=0x3E
  Engine:           rpm=0x06, throttle=0x07, brake=0x09
  Temps:            coolant=0x02, oil=0x05, trans=0x17, tyre_lf/rf/lr/rr=0x12-15
  Tyre pressures:   lf/rf/lr/rr=0x0A-0D
  Other:            gear=0x16, fuel_level=0x18, battery=0x22, perf_mode=0x21
                    gps_fix=0x2A, gps_precision=0x2B, gps_satellites=0x2C
                    yaw_rate=0x43, distance=0x1B
"""

import json
import struct
import subprocess
from datetime import datetime, timezone
from pathlib import Path

RAW_DIR   = Path(__file__).parent.parent / "data" / "raw"
OUT_DIR   = Path(__file__).parent.parent / "data" / "processed"
TRACK_DIR = OUT_DIR / "tracks"
INDEX_OUT = OUT_DIR / "clip_index.json"

# --- Channel definitions -------------------------------------------------

# Channels stored in the GPS-rate track (3 Hz) — these drive map interaction
GPS_CHANNELS = {
    0x26: "lat",      # ÷ 1e7  → degrees
    0x27: "lng",      # ÷ 1e7  → degrees
    0x28: "alt",      # ÷ 100  → meters
    0x29: "gps_hdg",  # ÷ 100  → degrees
}

# All other channels stored raw — units noted for future scaling
ALL_CHANNELS = {
    0x01: "boost_pressure_ind",
    0x02: "coolant_temp",           # raw °C
    0x03: "intake_boost_pressure",
    0x04: "oil_pressure",           # raw (PSI?)
    0x05: "oil_temp",               # raw °C
    0x06: "rpm",                    # raw (needs scaling)
    0x07: "throttle_pos",           # raw 0-100?
    0x08: "clutch_pos",
    0x09: "brake_pos",              # raw 0-100?
    0x0A: "tyre_pressure_lf",       # raw (PSI?)
    0x0B: "tyre_pressure_rf",
    0x0C: "tyre_pressure_lr",
    0x0D: "tyre_pressure_rr",
    0x0E: "tyre_pressure_status_lf",
    0x0F: "tyre_pressure_status_rf",
    0x10: "tyre_pressure_status_lr",
    0x11: "tyre_pressure_status_rr",
    0x12: "tyre_temp_lf",           # raw °C
    0x13: "tyre_temp_rf",
    0x14: "tyre_temp_lr",
    0x15: "tyre_temp_rr",
    0x16: "gear",
    0x17: "trans_oil_temp",         # raw °C
    0x18: "fuel_level",             # raw 0-100?
    0x19: "fuel_capacity",
    0x1A: "steering_angle",         # raw centidegrees from offset
    0x1B: "distance",               # raw (0.01 mi?)
    0x1C: "speed",                  # ÷ 100  → km/h
    0x1D: "abs_active",
    0x1E: "traction_active",
    0x1F: "stability_active",
    0x20: "ptm_active",
    0x21: "perf_mode",
    0x22: "battery_voltage",        # raw (÷ 10 → V?)
    0x23: "accel_lateral",          # ÷ 1000 → g
    0x24: "accel_longitudinal",     # ÷ 1000 → g
    0x25: "accel_vertical",         # ÷ 1000 → g (needs offset calibration)
    0x26: "gps_lat",                # ÷ 1e7  → degrees (also in GPS track)
    0x27: "gps_lng",
    0x28: "gps_altitude",
    0x29: "gps_heading",
    0x2A: "gps_fix",
    0x2B: "gps_precision",
    0x2C: "gps_satellites",
    0x2D: "beacon",
    0x2E: "temp_cpu",
    0x2F: "sd_write_speed",
    0x30: "sd_read_speed",
    0x31: "sd_metric_4",
    0x32: "sd_metric_5",
    0x33: "sd_metric_6",
    0x34: "sd_metric_7",
    0x35: "sd_metric_8",
    0x36: "sd_metric_9",
    0x37: "sd_metric_10",
    0x38: "sd_metric_11",
    0x39: "sd_metric_12",
    0x3A: "recording_odometer",
    0x3B: "wheel_speed_lf",         # raw (cm/s?)
    0x3C: "wheel_speed_rf",
    0x3D: "wheel_speed_lr",
    0x3E: "wheel_speed_rr",
    0x3F: "outside_air_temp",
    0x40: "intake_air_temp",        # raw °F?
    0x41: "temp_internal_board",
    0x42: "temp_camera",
    0x43: "yaw_rate",
}

# --- Parsing helpers ------------------------------------------------------

def ffprobe_clip(path: Path) -> tuple[float, list[dict]]:
    """Return (duration_s, list of data-stream packets with pts_time and size)."""
    # Duration
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default", str(path)],
        capture_output=True, text=True, check=True,
    )
    duration = float(r.stdout.split("=")[1].split("\n")[0].strip())

    # Data stream packet timestamps + sizes
    r2 = subprocess.run(
        ["ffprobe", "-v", "quiet", "-select_streams", "2",
         "-show_packets", "-print_format", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    packets = json.loads(r2.stdout).get("packets", [])
    return duration, packets


def extract_telemetry_binary(path: Path) -> bytes:
    """Extract the raw data stream from the .mov file."""
    r = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-i", str(path),
         "-map", "0:2", "-f", "data", "pipe:1"],
        capture_output=True, check=True,
    )
    return r.stdout


def parse_telemetry(raw: bytes, packets: list[dict]) -> dict[int, list[tuple[float, int]]]:
    """
    Parse the flat 16-byte record stream into per-channel lists of
    (seek_t, value) tuples.

    Each ffprobe packet covers ~1.81 s. Records within a packet are assigned
    the packet's pts_time; GPS records within a packet are linearly
    interpolated across the packet duration for sub-second precision.
    """
    # Build offset→pts_time map from packet sizes
    offset_map: list[tuple[int, int, float]] = []  # (start_byte, end_byte, pts_t)
    cursor = 0
    for pkt in packets:
        pts = float(pkt.get("pts_time", 0))
        size = int(pkt["size"])
        if pts < 0:
            cursor += size
            continue
        offset_map.append((cursor, cursor + size, pts))
        cursor += size

    # Collect per-channel records
    channels: dict[int, list[tuple[float, int]]] = {}
    for chan_id in ALL_CHANNELS:
        channels[chan_id] = []

    def pts_for_offset(byte_offset: int) -> float:
        for start, end, pts in offset_map:
            if start <= byte_offset < end:
                return pts
        return 0.0

    i = 0
    while i + 16 <= len(raw):
        if raw[i] == 0xE0 and raw[i + 1] == 0x00:
            chan = struct.unpack_from(">H", raw, i + 2)[0]
            val  = struct.unpack_from(">i", raw, i + 4)[0]
            if chan in channels:
                t = pts_for_offset(i)
                channels[chan].append((t, val))
        i += 16

    # Within each packet, linearly interpolate GPS timestamps
    if channels.get(0x26):
        _interpolate_within_packets(channels[0x26], offset_map)
    if channels.get(0x27):
        _interpolate_within_packets(channels[0x27], offset_map)
    if channels.get(0x28):
        _interpolate_within_packets(channels[0x28], offset_map)
    if channels.get(0x29):
        _interpolate_within_packets(channels[0x29], offset_map)

    return channels


def _interpolate_within_packets(
    records: list[tuple[float, int]],
    offset_map: list[tuple[int, int, float]],
) -> None:
    """
    Mutate (t, val) list so that points within the same packet are spread
    evenly across the packet's duration rather than all sharing one timestamp.
    """
    # Group by packet start time, then redistribute
    from collections import defaultdict

    pkt_duration = 1.81  # approximate; packets are ~1.81 s each
    grouped: dict[float, list[int]] = defaultdict(list)
    for t, val in records:
        grouped[t].append(val)

    out: list[tuple[float, int]] = []
    for t, vals in sorted(grouped.items()):
        n = len(vals)
        for idx, val in enumerate(vals):
            frac = (idx / n) * pkt_duration if n > 1 else 0.0
            out.append((round(t + frac, 3), val))

    records[:] = out


# --- Track file builder ---------------------------------------------------

def build_track(
    channels: dict[int, list[tuple[float, int]]],
    duration: float,
) -> dict:
    """
    Produce the track dict written to the per-clip JSON.

    GPS section: compact array-of-arrays [t, lat, lng, alt_m, hdg]
    Telemetry section: all other channels as {name: [[t, raw_val], ...]}
                       Only channels with >0 records are included.
                       SD card diagnostic channels are omitted.
    """
    SD_CHANNELS = {0x2E, 0x2F, 0x30, 0x31, 0x32, 0x33,
                   0x34, 0x35, 0x36, 0x37, 0x38, 0x39}

    lats = dict(channels.get(0x26, []))
    lngs = dict(channels.get(0x27, []))
    alts = dict(channels.get(0x28, []))
    hdgs = dict(channels.get(0x29, []))

    # Align GPS points by matching times
    gps_times = sorted(set(lats) & set(lngs))
    gps_points = []
    for t in gps_times:
        lat = lats[t] / 1e7
        lng = lngs[t] / 1e7
        alt = round(alts.get(t, 0) / 100, 1)   # cm → m
        hdg = round(hdgs.get(t, 0) / 100, 1)   # centideg → deg
        gps_points.append([t, round(lat, 7), round(lng, 7), alt, hdg])

    # All other telemetry (skip GPS channels and SD diagnostics)
    telemetry = {}
    for chan_id, name in ALL_CHANNELS.items():
        if chan_id in {0x26, 0x27, 0x28, 0x29}:
            continue
        if chan_id in SD_CHANNELS:
            continue
        records = channels.get(chan_id, [])
        if records:
            telemetry[name] = [[round(t, 3), v] for t, v in records]

    return {
        "duration": duration,
        "gps": gps_points,          # [[t, lat, lng, alt_m, hdg_deg], ...]
        "telemetry": telemetry,     # {channel_name: [[t, raw_val], ...]}
    }


# --- Clip index entry builder ---------------------------------------------

def build_index_entry(
    mov_path: Path,
    track: dict,
    track_rel_path: str,
) -> dict | None:
    """Build one clip_index.json entry from a processed track."""
    gps = track["gps"]
    if not gps:
        return None

    lats = [p[1] for p in gps]
    lngs = [p[2] for p in gps]

    # UTC start time from filename: pdr_YYYYMMDD_HHMMSSz.mov
    stem = mov_path.stem  # e.g. pdr_20210529_085856Z
    date_part = stem[4:12]   # 20210529
    time_part = stem[13:19]  # 085856
    dt_str = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}T" \
             f"{time_part[:2]}:{time_part[2:4]}:{time_part[4:6]}Z"

    start_dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    end_dt_ts = start_dt.timestamp() + track["duration"]
    end_dt = datetime.fromtimestamp(end_dt_ts, tz=timezone.utc)

    return {
        "file": mov_path.name,
        "t_start": dt_str,
        "t_end": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "duration": round(track["duration"], 3),
        "bbox": [
            round(min(lngs), 6), round(min(lats), 6),
            round(max(lngs), 6), round(max(lats), 6),
        ],
        "start": [round(gps[0][2], 6), round(gps[0][1], 6)],  # [lng, lat]
        "end":   [round(gps[-1][2], 6), round(gps[-1][1], 6)],
        "gps_count": len(gps),
        "track": track_rel_path,
    }


# --- Main ----------------------------------------------------------------

def main():
    TRACK_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    mov_files = sorted(RAW_DIR.glob("pdr_*.mov"))
    print(f"Found {len(mov_files)} .mov chunks")

    index_entries = []
    errors = []

    for i, mov in enumerate(mov_files, 1):
        print(f"[{i:3d}/{len(mov_files)}] {mov.name} ...", end=" ", flush=True)

        try:
            duration, packets = ffprobe_clip(mov)
            if not packets:
                print("SKIP (no data stream)")
                continue

            raw = extract_telemetry_binary(mov)
            channels = parse_telemetry(raw, packets)
            track = build_track(channels, duration)

            if not track["gps"]:
                print("SKIP (no GPS data)")
                continue

            track_name = mov.stem + ".json"
            track_path = TRACK_DIR / track_name
            with open(track_path, "w") as f:
                json.dump(track, f, separators=(",", ":"))

            entry = build_index_entry(mov, track, f"tracks/{track_name}")
            if entry:
                index_entries.append(entry)

            gps_count = track["gps_count"] if "gps_count" in track else len(track["gps"])
            print(f"OK  ({gps_count} GPS pts, {len(track['telemetry'])} channels)")

        except Exception as e:
            print(f"ERROR: {e}")
            errors.append((mov.name, str(e)))

    # Sort index by UTC start time
    index_entries.sort(key=lambda e: e["t_start"])

    index = {
        "version": 1,
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "clip_count": len(index_entries),
        "chunks": index_entries,
    }

    with open(INDEX_OUT, "w") as f:
        json.dump(index, f, indent=2)

    print(f"\nDone. {len(index_entries)} clips indexed → {INDEX_OUT}")
    if errors:
        print(f"Errors ({len(errors)}):")
        for name, err in errors:
            print(f"  {name}: {err}")


if __name__ == "__main__":
    main()
