"use client";

import { useState } from "react";
import { TRIP_DAYS, TRIP_LOCATIONS, type TripDay } from "@/lib/tripData";

// Warm cream palette
const BG = "#faf6ee";
const C = "#c07808";
const TEXT = "#1c1408";
const DIM = "#9a7e55";
const TEXT2 = "#5a4525";
const BORDER = "1px solid rgba(160,110,30,0.28)";
const DIM_BORDER = "rgba(160,110,30,0.14)";
const OVERLAY = "rgba(12,8,2,0.72)";

interface ItineraryModalProps {
  onClose: () => void;
  onLocationClick?: (id: string) => void;
}

function fmtDuration(minutes: number): string {
  if (minutes === 0) return "no PDR";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Media icon badges with hover tooltip ─────────────────────────────────────

function MediaBadge({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);
  const active = typeof value === "number" ? value > 0 : value !== "no PDR";

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 3,
          padding: "2px 6px", borderRadius: 4,
          background: active ? `${color}18` : "rgba(0,0,0,0.04)",
          border: `1px solid ${active ? `${color}55` : "rgba(0,0,0,0.1)"}`,
          opacity: active ? 1 : 0.35,
        }}
      >
        <span style={{ color: active ? color : "#b09070", display: "flex", alignItems: "center" }}>
          {icon}
        </span>
        <span style={{ color: active ? color : "#b09070", fontSize: 10, fontFamily: "monospace" }}>
          {value}
        </span>
      </div>
      {hovered && active && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: "50%",
          transform: "translateX(-50%)", whiteSpace: "nowrap",
          background: "rgba(250,246,238,0.98)", border: BORDER,
          color: TEXT2, fontSize: 10, fontFamily: "monospace",
          padding: "3px 8px", borderRadius: 4, pointerEvents: "none",
          zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

const IconPhoto = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IconVideo = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const IconDashcam = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const IconKeepsake = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ── Day row ───────────────────────────────────────────────────────────────────

function DayRow({ day, onLocationClick }: { day: TripDay; onLocationClick?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const dateObj = new Date(day.date + "T12:00:00Z");
  const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
  const dashDur = fmtDuration(day.media.dashcamMinutes);

  return (
    <div style={{ borderBottom: `1px solid ${DIM_BORDER}` }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "10px 0", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        {/* Day label */}
        <div style={{ minWidth: 48, fontFamily: "monospace", fontSize: 10, color: C, letterSpacing: "0.1em" }}>
          {day.label}
        </div>

        {/* Date + region */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {day.region}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM, marginTop: 1 }}>
            {dateStr}
          </div>
        </div>

        {/* Media badges */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <MediaBadge icon={<IconPhoto />} label={`${day.media.photos} photos`} value={day.media.photos} color="#0ea5e9" />
          <MediaBadge icon={<IconVideo />} label={`${day.media.videos} videos`} value={day.media.videos} color="#8b5cf6" />
          <MediaBadge icon={<IconDashcam />} label={`dashcam: ${dashDur}`} value={dashDur} color="#e85d04" />
          <MediaBadge icon={<IconKeepsake />} label={`${day.media.keepsakes} keepsakes`} value={day.media.keepsakes} color="#16a34a" />
        </div>

        {/* Chevron */}
        <div style={{ color: DIM, flexShrink: 0 }}>
          <IconChevron open={expanded} />
        </div>
      </button>

      {/* Expanded locations */}
      {expanded && (
        <div style={{ paddingBottom: 10, paddingLeft: 58 }}>
          {day.locations.map((loc, i) => {
            const tripLoc = TRIP_LOCATIONS.find(l => l.name === loc.name);
            const isClickable = Boolean(tripLoc && onLocationClick);
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                {/* Timeline dot + line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, marginTop: 3 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? C : "#c8b090", border: `1px solid ${i === 0 ? C : "#c8b090"}` }} />
                  {i < day.locations.length - 1 && (
                    <div style={{ width: 1, height: 16, background: DIM_BORDER, marginTop: 2 }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  {isClickable ? (
                    <button
                      onClick={() => onLocationClick!(tripLoc!.id)}
                      style={{
                        background: "none", border: "none", padding: 0, cursor: "pointer",
                        fontFamily: "monospace", fontSize: 11, color: C,
                        textDecoration: "underline", textUnderlineOffset: 2,
                        textDecorationColor: "rgba(192,120,8,0.4)",
                      }}
                    >
                      {loc.name}
                    </button>
                  ) : (
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: TEXT }}>{loc.name}</div>
                  )}
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM, marginTop: 1 }}>{loc.arrivalTime}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ItineraryModal({ onClose, onLocationClick }: ItineraryModalProps) {
  return (
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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: C }}>
                Itinerary
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM, marginTop: 2 }}>
                Portland → San Diego → Portland · 17 days
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
          {/* Legend */}
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { icon: <IconPhoto />, label: "Photos", color: "#0ea5e9" },
              { icon: <IconVideo />, label: "Video", color: "#8b5cf6" },
              { icon: <IconDashcam />, label: "Dashcam", color: "#e85d04" },
              { icon: <IconKeepsake />, label: "Keepsakes", color: "#16a34a" },
            ].map(({ icon, label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color, display: "flex" }}>{icon}</span>
                <span style={{ fontFamily: "monospace", fontSize: 9, color: DIM }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: DIM_BORDER, margin: "0 24px" }} />

        {/* Scrollable day list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "4px 24px" }}>
          {TRIP_DAYS.map((day) => (
            <DayRow key={day.date} day={day} onLocationClick={onLocationClick} />
          ))}
        </div>
      </div>
    </div>
  );
}