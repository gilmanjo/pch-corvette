#!/usr/bin/env node
/**
 * process_dslr.js
 *
 * Processes Fujifilm X-T2 JPEGs exported from Lightroom:
 *   - Reads EXIF (DateTimeOriginal UTC, aperture, focal length, ISO, etc.)
 *   - Filters out pre-trip photos (before May 29 2021 PDT)
 *   - Assigns each photo to the nearest TripLocation by UTC timestamp
 *   - Generates 600px thumbs and 1800px full-size images via sharp
 *   - Writes web/public/photos/dslr/index.json
 *
 * Run from web/ directory:
 *   node ../pipeline/scripts/process_dslr.js
 *
 * Idempotent: skips files that already exist in output dirs.
 */

const fs = require("fs");
const path = require("path");

// Modules live in web/node_modules, not alongside this script
const WEB_MODULES = path.resolve(__dirname, "../../web/node_modules");
const exifr = require(path.join(WEB_MODULES, "exifr"));
const sharp = require(path.join(WEB_MODULES, "sharp"));

// ── Source directories ────────────────────────────────────────────────────────

// Use native Linux copy if available (much faster than /mnt/d WSL I/O)
const NATIVE_CACHE = "/tmp/dslr_src";
const SOURCE_DIRS = fs.existsSync(NATIVE_CACHE)
  ? [NATIVE_CACHE]
  : [
      "/mnt/d/Photos/Processed/2021/05",
      "/mnt/d/Photos/Processed/2021/06",
    ];

// Trip start: May 29 2021 midnight PDT = 07:00 UTC
const TRIP_START_UTC = new Date("2021-05-29T07:00:00Z");

// ── Output paths ──────────────────────────────────────────────────────────────

const WEB_PUBLIC = path.resolve(__dirname, "../../web/public");

const OUT_DIR = path.join(WEB_PUBLIC, "photos", "dslr");
const THUMB_DIR = path.join(OUT_DIR, "thumb");
const FULL_DIR = path.join(OUT_DIR, "full");

// ── Location arrival UTC timestamps ──────────────────────────────────────────
// Derived from arrivalTime strings in tripData.ts, converted PDT (UTC-7) → UTC.
// A photo is assigned to the most recent location whose arrival UTC ≤ photo UTC.

const LOCATIONS = [
  { id: "portland",      utc: new Date("2021-05-29T15:58:00Z") },
  { id: "astoria",       utc: new Date("2021-05-29T18:15:00Z") },
  { id: "corvallis",     utc: new Date("2021-05-30T03:00:00Z") },
  { id: "crescent-city", utc: new Date("2021-05-31T00:25:00Z") },
  { id: "mendocino",     utc: new Date("2021-05-31T23:23:00Z") },
  { id: "san-francisco", utc: new Date("2021-06-02T01:10:00Z") },
  { id: "big-sur",       utc: new Date("2021-06-04T22:21:00Z") },
  { id: "santa-barbara", utc: new Date("2021-06-05T03:30:00Z") },
  { id: "los-angeles",   utc: new Date("2021-06-05T22:19:00Z") },
  { id: "san-diego",     utc: new Date("2021-06-07T21:30:00Z") },
  { id: "las-vegas",     utc: new Date("2021-06-09T01:00:00Z") },
  { id: "death-valley",  utc: new Date("2021-06-10T16:00:00Z") },
  { id: "lassen",        utc: new Date("2021-06-12T18:00:00Z") },
  { id: "crater-lake",   utc: new Date("2021-06-13T18:30:00Z") },
];

function assignLocation(takenAt) {
  let best = LOCATIONS[0];
  for (const loc of LOCATIONS) {
    if (loc.utc <= takenAt) best = loc;
  }
  return best.id;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
  fs.mkdirSync(FULL_DIR, { recursive: true });

  // Collect all source JPEGs
  const files = [];
  for (const dir of SOURCE_DIRS) {
    for (const f of fs.readdirSync(dir).sort()) {
      if (f.toLowerCase().endsWith(".jpg")) files.push(path.join(dir, f));
    }
  }
  console.log(`Found ${files.length} source files`);

  const index = [];
  let processed = 0, skipped = 0, done = 0;
  const CONCURRENCY = 8;

  async function processOne(srcPath) {
    const filename = path.basename(srcPath);
    const id = path.basename(filename, path.extname(filename));

    const exif = await exifr.parse(srcPath, { tiff: true, exif: true });
    if (!exif || !exif.DateTimeOriginal) return null;

    const takenAt = exif.DateTimeOriginal;
    if (takenAt < TRIP_START_UTC) return "skip";

    const locationId = assignLocation(takenAt);

    const thumbPath = path.join(THUMB_DIR, filename);
    let thumbW, thumbH;
    if (!fs.existsSync(thumbPath)) {
      const info = await sharp(srcPath)
        .rotate()
        .resize(600, 600, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 78, progressive: true })
        .toFile(thumbPath);
      thumbW = info.width; thumbH = info.height;
    } else {
      const meta = await sharp(thumbPath).metadata();
      thumbW = meta.width; thumbH = meta.height;
    }

    const fullPath = path.join(FULL_DIR, filename);
    let fullW, fullH;
    if (!fs.existsSync(fullPath)) {
      const info = await sharp(srcPath)
        .rotate()
        .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true })
        .toFile(fullPath);
      fullW = info.width; fullH = info.height;
    } else {
      const meta = await sharp(fullPath).metadata();
      fullW = meta.width; fullH = meta.height;
    }

    return {
      id, filename, locationId,
      takenAt: takenAt.toISOString(),
      camera: [exif.Make, exif.Model].filter(Boolean).join(" "),
      lens: exif.LensModel || null,
      fNumber: exif.FNumber ?? null,
      focalLength: exif.FocalLength ?? null,
      focalLength35mm: exif.FocalLengthIn35mmFormat ?? null,
      iso: exif.ISO ?? null,
      exposureTime: exif.ExposureTime ?? null,
      thumbW, thumbH, fullW, fullH,
    };
  }

  // Process with limited concurrency
  async function runPool() {
    const queue = [...files];
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const srcPath = queue.shift();
        try {
          const result = await processOne(srcPath);
          done++;
          if (result === "skip") { skipped++; }
          else if (result) { index.push(result); processed++; }
          process.stdout.write(`\r  ${processed} processed, ${skipped} skipped (${done}/${files.length})`);
        } catch (err) {
          console.error(`\n  Error: ${path.basename(srcPath)}: ${err.message}`);
        }
      }
    });
    await Promise.all(workers);
  }

  await runPool();
  console.log(`\nDone. ${processed} photos processed, ${skipped} pre-trip skipped.`);

  // Sort by takenAt ascending
  index.sort((a, b) => (a.takenAt < b.takenAt ? -1 : 1));

  // Write index
  const indexPath = path.join(OUT_DIR, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`Index → ${indexPath}`);

  // Summary per location
  const counts = {};
  for (const p of index) counts[p.locationId] = (counts[p.locationId] || 0) + 1;
  console.log("\nPhotos per location:");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${String(v).padStart(3)}  ${k}`);
  }
}

run().catch((err) => { console.error(err); process.exit(1); });