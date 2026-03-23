import { nearestPoint } from "@turf/nearest-point";
import { point, featureCollection } from "@turf/helpers";
import type { ClipEntry, ClipIndex } from "./clipIndex";

// Base URL for track files and video.
// In dev: empty string → served from web/public/.
// In prod: set NEXT_PUBLIC_MEDIA_BASE_URL to the R2 public bucket URL.
const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "";

export interface ResolvedClip {
  /** Original .mov filename, e.g. "pdr_20210529_085856Z.mov" */
  file: string;
  /** Transcoded video URL (R2 in prod, local stub in dev) */
  videoUrl: string;
  /** Seek offset in seconds within the clip */
  seekSeconds: number;
  /** UTC timestamp string at this point in the trip */
  utcTime: string;
}

// GPS point as stored in the track file: [t, lat, lng, alt_m, hdg_deg]
type GpsPoint = [number, number, number, number, number];

interface TrackFile {
  duration: number;
  gps: GpsPoint[];
}

const trackCache = new Map<string, TrackFile>();

async function fetchTrack(trackPath: string): Promise<TrackFile> {
  if (trackCache.has(trackPath)) return trackCache.get(trackPath)!;
  const url = `${MEDIA_BASE}/${trackPath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Track fetch failed: ${res.status} ${url}`);
  const data = (await res.json()) as TrackFile;
  trackCache.set(trackPath, data);
  return data;
}

/** Convert clip filename to video URL. */
function videoUrl(file: string): string {
  const mp4 = file.replace(".mov", ".mp4");
  return `${MEDIA_BASE}/video/${mp4}`;
}

/** Derive UTC time string from clip start + seek offset. */
function utcAtSeek(tStart: string, seekSeconds: number): string {
  const ms = new Date(tStart).getTime() + seekSeconds * 1000;
  return new Date(ms).toISOString();
}

/** Bbox pre-filter with a small padding for edge clicks. */
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

/**
 * Given a clicked LngLat and the loaded clip index, returns the best
 * matching clip and seek offset, or null if no clip is nearby.
 *
 * Strategy:
 *   1. Filter chunks by expanded bounding box (fast).
 *   2. Fetch GPS track for each candidate (cached after first fetch).
 *   3. Use turf nearestPoint to find the closest GPS fix.
 *   4. Return the clip + seek offset for the globally closest fix.
 */
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
        best = {
          file: chunk.file,
          videoUrl: videoUrl(chunk.file),
          seekSeconds,
          utcTime: utcAtSeek(chunk.t_start, seekSeconds),
        };
      }
    })
  );

  // Reject if the nearest GPS point is > 2 km from the click.
  // 2 km (vs 1 km) accounts for drift between Timeline route and PDR GPS.
  if (bestDistKm > 2) return null;

  return best;
}
