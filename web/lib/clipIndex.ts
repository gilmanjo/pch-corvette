export interface ClipEntry {
  file: string;
  t_start: string;
  t_end: string;
  duration: number;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  start: [number, number]; // [lng, lat]
  end: [number, number];
  gps_count: number;
  track: string;
}

export interface ClipIndex {
  version: number;
  generated: string;
  clip_count: number;
  chunks: ClipEntry[];
}

let indexCache: ClipIndex | null = null;

export async function loadClipIndex(): Promise<ClipIndex> {
  if (indexCache) return indexCache;
  const res = await fetch("/clip_index.json");
  if (!res.ok) throw new Error(`Failed to load clip index: ${res.status}`);
  indexCache = (await res.json()) as ClipIndex;
  return indexCache;
}
