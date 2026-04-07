"use client";

import { useState, useEffect } from "react";
import { TRIP_LOCATIONS } from "@/lib/tripData";
import { loadDslrPhotos, photosForLocation, type DslrPhoto } from "@/lib/photoData";
import PhotoModal from "@/components/PhotoModal";

// Warm cream palette
const BG = "#faf6ee";
const C = "#c07808";
const TEXT = "#1c1408";
const TEXT2 = "#5a4525";
const DIM = "#9a7e55";
const BORDER = "1px solid rgba(160,110,30,0.28)";
const OVERLAY = "rgba(12,8,2,0.72)";

interface LocationDetailsModalProps {
  locationId: string;
  onClose: () => void;
  onBack?: () => void;
  onShowOnMap?: (lat: number, lng: number) => void;
}

// ── Media count badge ─────────────────────────────────────────────────────────

function CountBadge({ icon, count, label }: { icon: React.ReactNode; count: number; label: string }) {
  const active = count > 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 4,
      background: active ? "rgba(160,110,30,0.08)" : "rgba(0,0,0,0.03)",
      border: `1px solid ${active ? "rgba(160,110,30,0.28)" : "rgba(0,0,0,0.08)"}`,
      opacity: active ? 1 : 0.4,
    }}>
      <span style={{ color: active ? C : "#b09070", display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{ fontFamily: "monospace", fontSize: 10, color: active ? TEXT2 : "#b09070" }}>
        {count} {label}
      </span>
    </div>
  );
}

const IconPhoto = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
  </svg>
);
const IconVideo = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const IconKeepsake = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

// ── Photo grid ────────────────────────────────────────────────────────────────

function PhotoGrid({
  photos,
  onPhotoClick,
}: {
  photos: DslrPhoto[];
  onPhotoClick: (index: number) => void;
}) {
  if (photos.length === 0) {
    return (
      <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM, textAlign: "center", padding: "24px 0" }}>
        No photos added yet
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
      {photos.map((photo, i) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick(i)}
          style={{
            aspectRatio: `${photo.thumbW}/${photo.thumbH}`,
            padding: 0, border: "none", cursor: "pointer",
            borderRadius: 6, overflow: "hidden",
            background: "rgba(160,110,30,0.06)",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/photos/dslr/thumb/${photo.filename}`}
            alt={photo.id}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LocationDetailsModal({
  locationId, onClose, onBack, onShowOnMap,
}: LocationDetailsModalProps) {
  const loc = TRIP_LOCATIONS.find(l => l.id === locationId);
  const [photos, setPhotos] = useState<DslrPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    loadDslrPhotos()
      .then(all => setPhotos(photosForLocation(all, locationId)))
      .catch(() => {/* silently ignore if index not yet available */});
  }, [locationId]);

  if (!loc) return null;

  const dateObj = new Date(loc.date + "T12:00:00Z");
  const dateStr = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const handleShowOnMap = () => {
    onShowOnMap?.(loc.lat, loc.lng);
    onClose();
  };

  // Use actual photo count; fall back to tripData count for videos/keepsakes
  const photoCount = photos.length > 0 ? photos.length : loc.media.photos;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center"
        style={{ background: OVERLAY, backdropFilter: "blur(3px)", paddingTop: 48, paddingBottom: 24 }}
        onClick={onClose}
      >
        <div
          style={{
            background: BG, border: BORDER,
            borderRadius: 12, width: "100%", maxWidth: 560,
            maxHeight: "calc(100vh - 72px)", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            margin: "0 16px",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: "20px 20px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              {/* Back or spacer */}
              <div style={{ flexShrink: 0, paddingTop: 2 }}>
                {onBack ? (
                  <button
                    onClick={onBack}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      background: "none", border: "none", cursor: "pointer",
                      fontFamily: "monospace", fontSize: 11, color: C, padding: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Locations
                  </button>
                ) : <div style={{ width: 12 }} />}
              </div>

              {/* Title block */}
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: C }}>{loc.name}</div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM, marginTop: 2 }}>{loc.region}</div>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                  background: "rgba(160,110,30,0.08)", border: BORDER,
                  color: C, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>
            </div>

            {/* Date + arrival */}
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM }}>{dateStr}</div>
              <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(160,110,30,0.3)" }} />
              <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM }}>{loc.arrivalTime}</div>
            </div>

            {/* Media counts */}
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              <CountBadge icon={<IconPhoto />} count={photoCount} label="photos" />
              <CountBadge icon={<IconVideo />} count={loc.media.videos} label="videos" />
              <CountBadge icon={<IconKeepsake />} count={loc.media.keepsakes} label="keepsakes" />
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(160,110,30,0.14)", margin: "0 20px" }} />

          {/* Scrollable body */}
          <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px" }}>
            {/* Description */}
            <p style={{ fontFamily: "monospace", fontSize: 11, color: TEXT2, lineHeight: 1.7, marginBottom: 16 }}>
              {loc.description}
            </p>

            {/* Photo grid */}
            <PhotoGrid photos={photos} onPhotoClick={setLightboxIndex} />

            {/* Show on map */}
            {onShowOnMap && (
              <button
                onClick={handleShowOnMap}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 6,
                  background: "rgba(160,110,30,0.08)",
                  border: BORDER, color: C,
                  fontFamily: "monospace", fontSize: 11,
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(160,110,30,0.16)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(160,110,30,0.08)"; }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                Show on Map
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Photo lightbox — rendered outside the modal so it can be z-[60] */}
      {lightboxIndex !== null && (
        <PhotoModal
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}