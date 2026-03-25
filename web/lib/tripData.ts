// Shared trip itinerary and location data.
// Media counts are placeholders — real values will be populated once
// photos/videos are added to the project.
//
// NOTE ON TIMES: The PDR unit's clock was set to local PDT time, but
// filenames were labeled with "Z" (UTC). All clip timestamps are therefore
// 7 hours ahead of actual UTC — treat stored "UTC" values as PDT local time.
// Arrival times below reflect PDT local time.
//
// Day boundaries verified against Google Maps Timeline (overnight stays) and
// PDR clip start/end GPS coordinates.

export interface MediaCounts {
  photos: number;
  videos: number;
  dashcamMinutes: number;  // total PDR footage duration for the day (minutes)
  keepsakes: number;
}

export interface DayLocation {
  name: string;
  /** Arrival time string, e.g. "9:42 AM PDT" */
  arrivalTime: string;
  lat: number;
  lng: number;
}

export interface TripDay {
  date: string;           // "2021-05-29"
  label: string;          // "Day 1"
  region: string;         // headline region for the day
  media: MediaCounts;
  locations: DayLocation[];
}

export interface TripLocation {
  id: string;
  name: string;
  region: string;
  date: string;           // "2021-05-29"
  arrivalTime: string;
  lat: number;
  lng: number;
  media: MediaCounts;
  description: string;
}

// ---------------------------------------------------------------------------
// Trip days  (May 29 – June 14, 2021)
// dashcamMinutes computed from actual clip durations in clip_index.json.
// Days 2, 3, 5, 6 had no PDR footage (AKASO camera only).
// Overnight stops verified via Google Maps Timeline GPS data.
// ---------------------------------------------------------------------------

export const TRIP_DAYS: TripDay[] = [
  {
    date: "2021-05-29", label: "Day 1", region: "Portland → Oregon Coast → Corvallis",
    media: { photos: 0, videos: 0, dashcamMinutes: 513, keepsakes: 0 },
    locations: [
      { name: "Portland, OR", arrivalTime: "8:58 AM PDT", lat: 45.5231, lng: -122.6765 },
      { name: "Astoria, OR", arrivalTime: "11:15 AM PDT", lat: 46.188, lng: -123.831 },
      { name: "Cannon Beach, OR", arrivalTime: "12:30 PM PDT", lat: 45.892, lng: -123.961 },
      { name: "Newport, OR", arrivalTime: "4:08 PM PDT", lat: 44.637, lng: -124.052 },
      { name: "Corvallis, OR", arrivalTime: "~8:00 PM PDT", lat: 44.564, lng: -123.279 },
    ],
  },
  {
    date: "2021-05-30", label: "Day 2", region: "Corvallis → South Oregon Coast → Crescent City",
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    locations: [
      { name: "Corvallis, OR", arrivalTime: "—", lat: 44.564, lng: -123.279 },
      { name: "Newport, OR", arrivalTime: "11:22 AM PDT", lat: 44.637, lng: -124.052 },
      { name: "Port Orford, OR", arrivalTime: "3:08 PM PDT", lat: 42.743, lng: -124.492 },
      { name: "Brookings, OR", arrivalTime: "4:41 PM PDT", lat: 42.053, lng: -124.283 },
      { name: "Crescent City, CA", arrivalTime: "5:25 PM PDT", lat: 41.756, lng: -124.201 },
    ],
  },
  {
    date: "2021-05-31", label: "Day 3", region: "Crescent City → Redwood Coast → Mendocino",
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    locations: [
      { name: "Crescent City, CA", arrivalTime: "—", lat: 41.756, lng: -124.201 },
      { name: "Prairie Creek Redwoods", arrivalTime: "9:29 AM PDT", lat: 41.364, lng: -124.023 },
      { name: "Arcata, CA", arrivalTime: "10:47 AM PDT", lat: 40.867, lng: -124.083 },
      { name: "Fort Bragg, CA", arrivalTime: "2:43 PM PDT", lat: 39.446, lng: -123.805 },
      { name: "Mendocino, CA", arrivalTime: "4:23 PM PDT", lat: 39.307, lng: -123.799 },
    ],
  },
  {
    date: "2021-06-01", label: "Day 4", region: "Mendocino → Point Reyes → San Francisco",
    media: { photos: 0, videos: 0, dashcamMinutes: 409, keepsakes: 0 },
    locations: [
      { name: "Mendocino, CA", arrivalTime: "—", lat: 39.307, lng: -123.799 },
      { name: "Fort Bragg, CA", arrivalTime: "11:20 AM PDT", lat: 39.446, lng: -123.805 },
      { name: "Point Reyes National Seashore", arrivalTime: "3:24 PM PDT", lat: 38.070, lng: -122.877 },
      { name: "San Francisco, CA", arrivalTime: "6:10 PM PDT", lat: 37.774, lng: -122.419 },
    ],
  },
  {
    date: "2021-06-02", label: "Day 5", region: "San Francisco (rest day)",
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    locations: [
      { name: "San Francisco, CA", arrivalTime: "—", lat: 37.774, lng: -122.419 },
    ],
  },
  {
    date: "2021-06-03", label: "Day 6", region: "San Francisco (rest day)",
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    locations: [
      { name: "San Francisco, CA", arrivalTime: "—", lat: 37.774, lng: -122.419 },
    ],
  },
  {
    date: "2021-06-04", label: "Day 7", region: "San Francisco → Big Sur → Santa Barbara",
    media: { photos: 0, videos: 0, dashcamMinutes: 601, keepsakes: 0 },
    locations: [
      { name: "San Francisco, CA", arrivalTime: "—", lat: 37.774, lng: -122.419 },
      { name: "Half Moon Bay, CA", arrivalTime: "11:30 AM PDT", lat: 37.463, lng: -122.429 },
      { name: "Carmel, CA", arrivalTime: "2:00 PM PDT", lat: 36.554, lng: -121.923 },
      { name: "Big Sur, CA", arrivalTime: "3:21 PM PDT", lat: 36.270, lng: -121.808 },
      { name: "Pismo Beach, CA", arrivalTime: "5:51 PM PDT", lat: 35.143, lng: -120.641 },
      { name: "Santa Barbara, CA", arrivalTime: "~8:30 PM PDT", lat: 34.420, lng: -119.699 },
    ],
  },
  {
    date: "2021-06-05", label: "Day 8", region: "Santa Barbara → Malibu → Los Angeles",
    media: { photos: 0, videos: 0, dashcamMinutes: 360, keepsakes: 0 },
    locations: [
      { name: "Santa Barbara, CA", arrivalTime: "—", lat: 34.420, lng: -119.699 },
      { name: "Malibu, CA", arrivalTime: "11:00 AM PDT", lat: 34.036, lng: -118.779 },
      { name: "Los Angeles, CA", arrivalTime: "3:19 PM PDT", lat: 33.946, lng: -118.382 },
    ],
  },
  {
    date: "2021-06-06", label: "Day 9", region: "Los Angeles (PCH & city drives)",
    media: { photos: 0, videos: 0, dashcamMinutes: 393, keepsakes: 0 },
    locations: [
      { name: "Los Angeles, CA", arrivalTime: "—", lat: 33.946, lng: -118.382 },
    ],
  },
  {
    date: "2021-06-07", label: "Day 10", region: "Los Angeles → San Diego",
    media: { photos: 0, videos: 0, dashcamMinutes: 270, keepsakes: 0 },
    locations: [
      { name: "Los Angeles, CA", arrivalTime: "—", lat: 33.946, lng: -118.382 },
      { name: "Long Beach, CA", arrivalTime: "12:00 PM PDT", lat: 33.770, lng: -118.193 },
      { name: "San Diego, CA", arrivalTime: "2:30 PM PDT", lat: 32.716, lng: -117.162 },
    ],
  },
  {
    date: "2021-06-08", label: "Day 11", region: "San Diego → Las Vegas",
    media: { photos: 0, videos: 0, dashcamMinutes: 347, keepsakes: 0 },
    locations: [
      { name: "San Diego, CA", arrivalTime: "—", lat: 32.716, lng: -117.162 },
      { name: "Las Vegas, NV", arrivalTime: "~6:00 PM PDT", lat: 36.169, lng: -115.139 },
    ],
  },
  {
    date: "2021-06-09", label: "Day 12", region: "Las Vegas (rest day)",
    media: { photos: 0, videos: 0, dashcamMinutes: 31, keepsakes: 0 },
    locations: [
      { name: "Las Vegas, NV", arrivalTime: "—", lat: 36.169, lng: -115.139 },
    ],
  },
  {
    date: "2021-06-10", label: "Day 13", region: "Las Vegas → Death Valley → Pahrump",
    media: { photos: 0, videos: 0, dashcamMinutes: 395, keepsakes: 0 },
    locations: [
      { name: "Las Vegas, NV", arrivalTime: "—", lat: 36.169, lng: -115.139 },
      { name: "Death Valley, CA", arrivalTime: "9:00 AM PDT", lat: 36.505, lng: -116.866 },
      { name: "Pahrump, NV", arrivalTime: "~4:00 PM PDT", lat: 36.208, lng: -115.984 },
    ],
  },
  {
    date: "2021-06-11", label: "Day 14", region: "Pahrump → Eastern Sierra → Reno",
    media: { photos: 0, videos: 0, dashcamMinutes: 376, keepsakes: 0 },
    locations: [
      { name: "Pahrump, NV", arrivalTime: "—", lat: 36.208, lng: -115.984 },
      { name: "Lone Pine, CA", arrivalTime: "11:00 AM PDT", lat: 36.606, lng: -118.063 },
      { name: "Bishop, CA", arrivalTime: "12:30 PM PDT", lat: 37.363, lng: -118.395 },
      { name: "Reno, NV", arrivalTime: "~7:30 PM PDT", lat: 39.529, lng: -119.813 },
    ],
  },
  {
    date: "2021-06-12", label: "Day 15", region: "Reno → Lassen Volcanic NP → Medford",
    media: { photos: 0, videos: 0, dashcamMinutes: 523, keepsakes: 0 },
    locations: [
      { name: "Reno, NV", arrivalTime: "—", lat: 39.529, lng: -119.813 },
      { name: "Lassen Volcanic National Park", arrivalTime: "11:00 AM PDT", lat: 40.478, lng: -121.505 },
      { name: "Mount Shasta, CA", arrivalTime: "2:30 PM PDT", lat: 41.409, lng: -122.194 },
      { name: "Medford, OR", arrivalTime: "~5:30 PM PDT", lat: 42.326, lng: -122.874 },
    ],
  },
  {
    date: "2021-06-13", label: "Day 16", region: "Medford → Crater Lake → Portland",
    media: { photos: 0, videos: 0, dashcamMinutes: 571, keepsakes: 0 },
    locations: [
      { name: "Medford, OR", arrivalTime: "—", lat: 42.326, lng: -122.874 },
      { name: "Crater Lake, OR", arrivalTime: "11:30 AM PDT", lat: 42.944, lng: -122.109 },
      { name: "Klamath Falls, OR", arrivalTime: "1:30 PM PDT", lat: 42.225, lng: -121.781 },
      { name: "Portland, OR", arrivalTime: "~9:30 PM PDT", lat: 45.5231, lng: -122.6765 },
    ],
  },
  {
    date: "2021-06-14", label: "Day 17", region: "Portland (home)",
    media: { photos: 0, videos: 0, dashcamMinutes: 52, keepsakes: 0 },
    locations: [
      { name: "Portland, OR", arrivalTime: "—", lat: 45.5231, lng: -122.6765 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Key locations along the route — overnight stops and major landmarks
// Ordered chronologically by first visit date.
// ---------------------------------------------------------------------------

export const TRIP_LOCATIONS: TripLocation[] = [
  {
    id: "portland",
    name: "Portland, OR",
    region: "Pacific Northwest",
    date: "2021-05-29",
    arrivalTime: "Trip Start · 8:58 AM PDT",
    lat: 45.5231, lng: -122.6765,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "Home base and trip start. Left Portland on the morning of May 29, returning 17 days later.",
  },
  {
    id: "astoria",
    name: "Astoria, OR",
    region: "Oregon Coast",
    date: "2021-05-29",
    arrivalTime: "11:15 AM PDT",
    lat: 46.188, lng: -123.831,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "The oldest American settlement west of the Rockies, perched at the mouth of the Columbia River. Home of the Astoria Column and the iconic Astoria-Megler Bridge spanning into Washington.",
  },
  {
    id: "corvallis",
    name: "Corvallis, OR",
    region: "Willamette Valley",
    date: "2021-05-29",
    arrivalTime: "~8:00 PM PDT",
    lat: 44.564, lng: -123.279,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "Day 1 overnight stop after a long day up to Astoria and south along the coast. Corvallis sits in the Willamette Valley, 40 miles east of the Newport coast.",
  },
  {
    id: "crescent-city",
    name: "Crescent City, CA",
    region: "Northern California Coast",
    date: "2021-05-30",
    arrivalTime: "5:25 PM PDT",
    lat: 41.756, lng: -124.201,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "Gateway to the Redwoods, nestled between the Pacific and ancient groves. The northernmost overnight stop in California, just south of the Oregon border.",
  },
  {
    id: "mendocino",
    name: "Mendocino, CA",
    region: "Mendocino Coast",
    date: "2021-05-31",
    arrivalTime: "4:23 PM PDT",
    lat: 39.307, lng: -123.799,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "Victorian headlands village perched above the Pacific. The Mendocino Headlands State Park offers dramatic sea cliffs, sea arches, and whale watching. Overnight stop before continuing south.",
  },
  {
    id: "san-francisco",
    name: "San Francisco, CA",
    region: "Bay Area",
    date: "2021-06-01",
    arrivalTime: "6:10 PM PDT",
    lat: 37.774, lng: -122.419,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "Three-night stay (Jun 1–3). Golden Gate Bridge, Lombard Street, Chinatown, Fisherman's Wharf. A proper rest before the long push down to Big Sur and SoCal.",
  },
  {
    id: "big-sur",
    name: "Big Sur, CA",
    region: "Central California Coast",
    date: "2021-06-04",
    arrivalTime: "3:21 PM PDT",
    lat: 36.270, lng: -121.808,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "Dramatic cliffs, redwood canyons, and the Big Sur coastline — the most iconic stretch of PCH. A drive-through stop on the long Day 7 run from San Francisco to Santa Barbara.",
  },
  {
    id: "santa-barbara",
    name: "Santa Barbara, CA",
    region: "Southern California",
    date: "2021-06-04",
    arrivalTime: "~8:30 PM PDT",
    lat: 34.420, lng: -119.699,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "The American Riviera — Spanish colonial architecture, palm-lined State Street, and the Santa Barbara Mission. Overnight stop after the epic Day 7 drive from San Francisco.",
  },
  {
    id: "los-angeles",
    name: "Los Angeles, CA",
    region: "Southern California",
    date: "2021-06-05",
    arrivalTime: "3:19 PM PDT",
    lat: 33.946, lng: -118.382,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "Two-night stay (Jun 5–6) in the LA basin. Day 9 was dedicated to driving PCH through Malibu and exploring the city.",
  },
  {
    id: "san-diego",
    name: "San Diego, CA",
    region: "Southern California",
    date: "2021-06-07",
    arrivalTime: "2:30 PM PDT",
    lat: 32.716, lng: -117.162,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "The southern terminus of the drive. One night in San Diego before the long run back north through the desert via Las Vegas.",
  },
  {
    id: "las-vegas",
    name: "Las Vegas, NV",
    region: "Nevada",
    date: "2021-06-08",
    arrivalTime: "~6:00 PM PDT",
    lat: 36.169, lng: -115.139,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "Two-night stay (Jun 8–9) with a rest day on Jun 9. Launched the Death Valley day trip from here before continuing north on the return leg.",
  },
  {
    id: "death-valley",
    name: "Death Valley, CA",
    region: "Mojave Desert",
    date: "2021-06-10",
    arrivalTime: "9:00 AM PDT",
    lat: 36.505, lng: -116.866,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "Lowest point in North America at 282 ft below sea level. Badwater Basin, Artist's Drive, and the massive salt flats in early-June heat. Day trip from the Las Vegas area.",
  },
  {
    id: "lassen",
    name: "Lassen Volcanic NP",
    region: "Northern California",
    date: "2021-06-12",
    arrivalTime: "11:00 AM PDT",
    lat: 40.478, lng: -121.505,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "Active volcanic peaks, boiling mud pots, and hydrothermal features. Full stop on the Day 15 run from Reno to Medford — the most dramatic scenery of the return leg.",
  },
  {
    id: "crater-lake",
    name: "Crater Lake, OR",
    region: "Oregon Cascades",
    date: "2021-06-13",
    arrivalTime: "11:30 AM PDT",
    lat: 42.944, lng: -122.109,
    media: { photos: 0, videos: 0, dashcamMinutes: 0, keepsakes: 0 },
    description: "The deepest lake in the US, formed in the caldera of ancient Mount Mazama. Impossibly blue water ringed by snow-capped crater walls. Final major stop before the return to Portland.",
  },
];