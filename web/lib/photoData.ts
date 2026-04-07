export interface DslrPhoto {
  id: string;
  filename: string;
  locationId: string;
  takenAt: string;         // ISO UTC string
  camera: string;
  lens: string | null;
  fNumber: number | null;
  focalLength: number | null;
  focalLength35mm: number | null;
  iso: number | null;
  exposureTime: number | null;
  thumbW: number;
  thumbH: number;
  fullW: number;
  fullH: number;
}

let cache: DslrPhoto[] | null = null;

export async function loadDslrPhotos(): Promise<DslrPhoto[]> {
  if (cache) return cache;
  const res = await fetch("/photos/dslr/index.json");
  if (!res.ok) throw new Error(`Failed to load photo index: ${res.status}`);
  cache = await res.json();
  return cache!;
}

export function photosForLocation(photos: DslrPhoto[], locationId: string): DslrPhoto[] {
  return photos.filter((p) => p.locationId === locationId);
}

/** Returns a map of locationId → photo count, computed from the loaded index. */
export function photoCountsByLocation(photos: DslrPhoto[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of photos) {
    map.set(p.locationId, (map.get(p.locationId) ?? 0) + 1);
  }
  return map;
}

/** Format exposure time as a human-readable string e.g. "1/7500s" or "2.5s" */
export function fmtExposure(t: number): string {
  if (t >= 1) return `${t.toFixed(1)}s`;
  const denom = Math.round(1 / t);
  return `1/${denom}s`;
}

/** Format f-number as "f/1.4" */
export function fmtFStop(f: number): string {
  return `f/${f % 1 === 0 ? f.toFixed(0) : f}`;
}