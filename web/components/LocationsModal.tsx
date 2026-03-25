"use client";

import { useState } from "react";
import { TRIP_LOCATIONS, type TripLocation } from "@/lib/tripData";

// Warm cream palette
const BG = "#faf6ee";
const BG_CARD = "#f0e8d4";
const C = "#c07808";
const TEXT = "#1c1408";
const TEXT2 = "#5a4525";
const DIM = "#9a7e55";
const BORDER = "1px solid rgba(160,110,30,0.28)";
const DIM_BORDER = "rgba(160,110,30,0.14)";
const OVERLAY = "rgba(12,8,2,0.72)";

interface LocationsModalProps {
  onClose: () => void;
  onShowOnMap: (lat: number, lng: number) => void;
  onOpenDetails: (id: string) => void;
  openLocationId?: string | null;
}

// ── Placeholder image ─────────────────────────────────────────────────────────

function PlaceholderImage({ name }: { name: string }) {
  const initials = name.split(",")[0].split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: 72, height: 72, borderRadius: 6, flexShrink: 0,
        background: BG_CARD,
        border: "1px solid rgba(160,110,30,0.2)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 2,
      }}
    >
      <span style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "rgba(160,110,30,0.4)" }}>
        {initials}
      </span>
      <span style={{ fontFamily: "monospace", fontSize: 7, color: "rgba(160,110,30,0.3)", letterSpacing: "0.1em" }}>
        PHOTO
      </span>
    </div>
  );
}

// ── Location card ─────────────────────────────────────────────────────────────

function LocationCard({
  loc,
  onShowOnMap,
  onOpenDetails,
  initiallyOpen,
}: {
  loc: TripLocation;
  onShowOnMap: (lat: number, lng: number) => void;
  onOpenDetails: (id: string) => void;
  initiallyOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyOpen ?? false);
  const dateObj = new Date(loc.date + "T12:00:00Z");
  const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      style={{
        borderRadius: 8, marginBottom: 8,
        background: expanded ? "rgba(160,110,30,0.05)" : "rgba(160,110,30,0.02)",
        border: `1px solid ${expanded ? "rgba(160,110,30,0.22)" : "rgba(160,110,30,0.1)"}`,
        transition: "background 0.15s, border-color 0.15s",
        overflow: "hidden",
      }}
    >
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "12px 14px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <PlaceholderImage name={loc.name} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: TEXT,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {loc.name}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM, marginTop: 2 }}>
            {loc.region}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM, marginTop: 1 }}>
            {dateStr} · {loc.arrivalTime}
          </div>
        </div>

        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 14px 14px" }}>
          <p style={{ fontFamily: "monospace", fontSize: 11, color: TEXT2, marginBottom: 12, lineHeight: 1.6 }}>
            {loc.description}
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Details button */}
            <button
              onClick={() => { onOpenDetails(loc.id); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 6,
                background: C, border: "none",
                color: "#fff", fontFamily: "monospace", fontSize: 11,
                cursor: "pointer", transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Details
            </button>

            {/* Show on map button */}
            <button
              onClick={() => { onShowOnMap(loc.lat, loc.lng); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 6,
                background: "rgba(160,110,30,0.08)",
                border: "1px solid rgba(160,110,30,0.28)",
                color: C, fontFamily: "monospace", fontSize: 11,
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(160,110,30,0.16)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(160,110,30,0.08)"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Show on Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LocationsModal({ onClose, onShowOnMap, onOpenDetails, openLocationId }: LocationsModalProps) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? TRIP_LOCATIONS.filter(
        (l) =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.region.toLowerCase().includes(search.toLowerCase())
      )
    : TRIP_LOCATIONS;

  const handleShowOnMap = (lat: number, lng: number) => {
    onShowOnMap(lat, lng);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ background: OVERLAY, backdropFilter: "blur(3px)", paddingTop: 48, paddingBottom: 24 }}
      onClick={onClose}
    >
      <div
        style={{
          background: BG, border: BORDER,
          borderRadius: 12, width: "100%", maxWidth: 520,
          maxHeight: "calc(100vh - 72px)", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          margin: "0 16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 20px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: C }}>
                Locations
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM, marginTop: 2 }}>
                {TRIP_LOCATIONS.length} key stops along the route
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 28, height: 28, borderRadius: 4,
                background: "rgba(160,110,30,0.08)", border: BORDER,
                color: C, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search locations..."
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 6,
              background: "rgba(160,110,30,0.05)",
              border: `1px solid ${search ? "rgba(160,110,30,0.4)" : "rgba(160,110,30,0.18)"}`,
              color: TEXT, fontFamily: "monospace", fontSize: 11,
              outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
          />
        </div>

        <div style={{ height: 1, background: DIM_BORDER, margin: "0 20px" }} />

        {/* Scrollable location list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 20px" }}>
          {filtered.length === 0 ? (
            <div style={{ fontFamily: "monospace", fontSize: 11, color: DIM, textAlign: "center", padding: "24px 0" }}>
              No locations match &ldquo;{search}&rdquo;
            </div>
          ) : (
            filtered.map((loc) => (
              <LocationCard
                key={loc.id}
                loc={loc}
                onShowOnMap={handleShowOnMap}
                onOpenDetails={onOpenDetails}
                initiallyOpen={openLocationId === loc.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}