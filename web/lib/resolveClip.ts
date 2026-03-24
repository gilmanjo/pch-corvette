import { nearestPoint } from "@turf/nearest-point";
import { point, featureCollection } from "@turf/helpers";
import type { ClipEntry, ClipIndex } from "./clipIndex";

// R2 base URL for video files only.
// Track files are always served from the same origin (/tracks/).
const VIDEO_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "";

// ── Telemetry types ───────────────────────────────────────────────────────────

export interface TelemetryData {
  // Movement
  speed_mph: number | null;
  heading: number | null;
  lat: number | null;
  lng: number | null;
  altitude_m: number | null;
  // Dynamics (g-forces, steering)
  g_lat: number | null;      // g, positive = right
  g_lon: number | null;      // g, positive = forward/acceleration
  steering_deg: number | null;
  // Driver inputs
  throttle_pct: number | null;
  brake_pct: number | null;
  // Powertrain
  rpm: number | null;
  gear: number | null;       // 0=N, 1-8=gear, 9=R
  // Engine health
  oil_temp_c: number | null;
  oil_pressure: number | null;
  coolant_temp_c: number | null;
  // Tyres (raw units — likely PSI; may need calibration)
  tyre_press_lf: number | null;
  tyre_press_rf: number | null;
  tyre_press_lr: number | null;
  tyre_press_rr: number | null;
  tyre_temp_lf: number | null;
  tyre_temp_rf: number | null;
  tyre_temp_lr: number | null;
  tyre_temp_rr: number | null;
  // Other
  fuel_pct: number | null;
}

export interface ResolvedClip {
  file: string;
  videoUrl: string;
  seekSeconds: number;
  utcTime: string;
  telemetry: TelemetryData;
  /** Full track data for dynamic telemetry lookups as the video plays. */
  track: TrackFile;
}

// ── Track file types (exported for VideoModal dynamic lookups) ────────────────

type TelemetrySeries = [number, number][];  // [t, raw_value]

export interface TrackFile {
  duration: number;
  gps: [number, number, number, ...number[]][];
  telemetry?: {
    speed?: TelemetrySeries;
    accel_lateral?: TelemetrySeries;     // raw / 1000 = g
    accel_longitudinal?: TelemetrySeries; // raw / 1000 = g
    throttle_pos?: TelemetrySeries;
    brake_pos?: TelemetrySeries;
    rpm?: TelemetrySeries;
    gear?: TelemetrySeries;
    oil_temp?: TelemetrySeries;           // raw °C
    oil_pressure?: TelemetrySeries;       // raw PSI
    coolant_temp?: TelemetrySeries;       // raw °C
    steering_angle?: TelemetrySeries;     // (raw - 32768) / 100 = degrees
    tyre_pressure_lf?: TelemetrySeries;
    tyre_pressure_rf?: TelemetrySeries;
    tyre_pressure_lr?: TelemetrySeries;
    tyre_pressure_rr?: TelemetrySeries;
    tyre_temp_lf?: TelemetrySeries;
    tyre_temp_rf?: TelemetrySeries;
    tyre_temp_lr?: TelemetrySeries;
    tyre_temp_rr?: TelemetrySeries;
    fuel_level?: TelemetrySeries;
    [key: string]: TelemetrySeries | undefined;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const trackCache = new Map<string, TrackFile>();

export async function fetchTrack(trackPath: string): Promise<TrackFile> {
  if (trackCache.has(trackPath)) return trackCache.get(trackPath)!;
  const url = `/${trackPath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Track fetch failed: ${res.status} ${url}`);
  const data = (await res.json()) as TrackFile;
  trackCache.set(trackPath, data);
  return data;
}

/**
 * Find the value nearest to time t in a telemetry series.
 * Returns null if no sample within maxGapS seconds.
 */
export function nearestVal(
  records: TelemetrySeries | undefined,
  t: number,
  maxGapS = 5,
  scale = 1
): number | null {
  if (!records?.length) return null;
  let best = records[0];
  for (const r of records) {
    if (Math.abs(r[0] - t) < Math.abs(best[0] - t)) best = r;
  }
  if (Math.abs(best[0] - t) > maxGapS) return null;
  return best[1] * scale;
}

function videoUrl(file: string): string {
  const mp4 = file.replace(".mov", ".mp4");
  return `${VIDEO_BASE}/video/${mp4}`;
}

function utcAtSeek(tStart: string, seekSeconds: number): string {
  const ms = new Date(tStart).getTime() + seekSeconds * 1000;
  return new Date(ms).toISOString();
}

function inBbox(
  lng: number,
  lat: number,
  [minLng, minLat, maxLng, maxLat]: ClipEntry["bbox"],
  pad = 0.02
): boolean {
  return (
    lng >= minLng - pad &&
    lng <= maxLng + pad &&
    lat >= minLat - pad &&
    lat <= maxLat + pad
  );
}

/** Extract a full TelemetryData snapshot from a track at seek time t. */
export function extractTelemetry(track: TrackFile, t: number): TelemetryData {
  const tel = track.telemetry ?? {};
  const rawSpeed = nearestVal(tel.speed, t, 5);
  // Raw speed is in hundredths of mph (not km/h), so divide by 100 only.
  const speedMph = rawSpeed !== null ? Math.round(rawSpeed / 10) / 10 : null;

  const rawGear = nearestVal(tel.gear, t, 10);
  const gear = rawGear !== null && rawGear >= 0 && rawGear <= 9 ? rawGear : null;

  const rawSteering = nearestVal(tel.steering_angle, t, 2);
  const steeringDeg =
    rawSteering !== null ? Math.round((rawSteering - 32768) / 100) : null;

  return {
    speed_mph: speedMph,
    heading: null, // filled from GPS below
    lat: null,
    lng: null,
    altitude_m: null,
    g_lat: nearestVal(tel.accel_lateral, t, 2, 1 / 1000),
    g_lon: nearestVal(tel.accel_longitudinal, t, 2, 1 / 1000),
    steering_deg: steeringDeg,
    throttle_pct: nearestVal(tel.throttle_pos, t, 5, 100 / 255),
    brake_pct: nearestVal(tel.brake_pos, t, 5, 100 / 255),
    rpm: nearestVal(tel.rpm, t, 2, 0.25),
    gear,
    oil_temp_c: nearestVal(tel.oil_temp, t, 10),
    oil_pressure: nearestVal(tel.oil_pressure, t, 10),
    coolant_temp_c: nearestVal(tel.coolant_temp, t, 10),
    tyre_press_lf: nearestVal(tel.tyre_pressure_lf, t, 10, 0.5),
    tyre_press_rf: nearestVal(tel.tyre_pressure_rf, t, 10, 0.5),
    tyre_press_lr: nearestVal(tel.tyre_pressure_lr, t, 10, 0.5),
    tyre_press_rr: nearestVal(tel.tyre_pressure_rr, t, 10, 0.5),
    tyre_temp_lf: nearestVal(tel.tyre_temp_lf, t, 10),
    tyre_temp_rf: nearestVal(tel.tyre_temp_rf, t, 10),
    tyre_temp_lr: nearestVal(tel.tyre_temp_lr, t, 10),
    tyre_temp_rr: nearestVal(tel.tyre_temp_rr, t, 10),
    fuel_pct: nearestVal(tel.fuel_level, t, 10),
  };
}

/** Find the GPS point nearest to seek time t. */
export function nearestGps(
  track: TrackFile,
  t: number
): { lat: number; lng: number; alt: number | null; heading: number | null } | null {
  if (!track.gps.length) return null;
  let best = track.gps[0];
  for (const pt of track.gps) {
    if (Math.abs(pt[0] - t) < Math.abs(best[0] - t)) best = pt;
  }
  if (Math.abs(best[0] - t) > 5) return null;
  return {
    lat: best[1],
    lng: best[2],
    alt: best.length > 3 ? best[3] : null,
    heading: best.length > 4 ? best[4] : null,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function resolveClip(
  lng: number,
  lat: number,
  index: ClipIndex
): Promise<ResolvedClip | null> {
  const candidates = index.chunks.filter((c) => inBbox(lng, lat, c.bbox));
  if (candidates.length === 0) return null;

  const clicked = point([lng, lat]);
  let bestDistKm = Infinity;
  let best: ResolvedClip | null = null;

  await Promise.all(
    candidates.map(async (chunk) => {
      let track: TrackFile;
      try {
        track = await fetchTrack(chunk.track);
      } catch {
        return;
      }

      if (track.gps.length === 0) return;

      const features = track.gps.map(([t, glat, glng]) =>
        point([glng, glat], { t })
      );
      const nearest = nearestPoint(clicked, featureCollection(features));
      const distKm = nearest.properties.distanceToPoint ?? Infinity;

      if (distKm < bestDistKm) {
        bestDistKm = distKm;
        const seekSeconds = nearest.properties.t as number;

        const telemetry = extractTelemetry(track, seekSeconds);
        const gps = nearestGps(track, seekSeconds);
        if (gps) {
          telemetry.lat = gps.lat;
          telemetry.lng = gps.lng;
          telemetry.altitude_m = gps.alt;
          telemetry.heading = gps.heading;
        }

        best = {
          file: chunk.file,
          videoUrl: videoUrl(chunk.file),
          seekSeconds,
          utcTime: utcAtSeek(chunk.t_start, seekSeconds),
          telemetry,
          track,
        };
      }
    })
  );

  if (bestDistKm > 2) return null;
  return best;
}

/** Resolve the next clip in chronological order after currentFile. */
export async function resolveNextClip(
  currentFile: string,
  index: ClipIndex
): Promise<ResolvedClip | null> {
  const sorted = [...index.chunks].sort(
    (a, b) => new Date(a.t_start).getTime() - new Date(b.t_start).getTime()
  );
  const idx = sorted.findIndex((c) => c.file === currentFile);
  if (idx === -1 || idx >= sorted.length - 1) return null;

  const next = sorted[idx + 1];
  let track: TrackFile;
  try {
    track = await fetchTrack(next.track);
  } catch {
    return null;
  }

  const seekSeconds = 0;
  const telemetry = extractTelemetry(track, seekSeconds);
  const gps = nearestGps(track, seekSeconds);
  if (gps) {
    telemetry.lat = gps.lat;
    telemetry.lng = gps.lng;
    telemetry.altitude_m = gps.alt;
    telemetry.heading = gps.heading;
  }

  return {
    file: next.file,
    videoUrl: videoUrl(next.file),
    seekSeconds,
    utcTime: next.t_start,
    telemetry,
    track,
  };
}