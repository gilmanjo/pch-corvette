"use client";

import { useState } from "react";

// Warm cream — matches modal palette
const C = "#c07808";
const BTN_BG = "rgba(250,246,238,0.92)";
const BTN_HOVER = "rgba(250,246,238,1)";
const BORDER = "rgba(160,110,30,0.28)";
const BORDER_HOVER = "rgba(160,110,30,0.55)";
const TIP_BG = "rgba(250,246,238,0.97)";
const TIP_TEXT = "#1c1408";
const TIP_BORDER = "rgba(160,110,30,0.28)";

interface ToolbarProps {
  onAboutClick: () => void;
  onItineraryClick: () => void;
  onLocationsClick: () => void;
  onFiltersClick: () => void;
  onStatsClick: () => void;
}

function ToolBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={label}
        style={{
          width: 36, height: 36, borderRadius: 8, cursor: "pointer",
          background: hovered ? BTN_HOVER : BTN_BG,
          border: `1px solid ${hovered ? BORDER_HOVER : BORDER}`,
          color: C,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s, border-color 0.15s",
          backdropFilter: "blur(6px)",
        }}
      >
        {children}
      </button>
      {hovered && (
        <div
          style={{
            position: "absolute", left: "calc(100% + 8px)", top: "50%",
            transform: "translateY(-50%)", whiteSpace: "nowrap",
            background: TIP_BG,
            border: `1px solid ${TIP_BORDER}`,
            color: TIP_TEXT, fontSize: 11, fontFamily: "monospace",
            padding: "4px 10px", borderRadius: 4,
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

const IconAbout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconItinerary = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="8" y1="14" x2="16" y2="14" />
    <line x1="8" y1="18" x2="13" y2="18" />
  </svg>
);

const IconLocations = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconFilters = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IconStats = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export default function Toolbar({ onAboutClick, onItineraryClick, onLocationsClick, onFiltersClick, onStatsClick }: ToolbarProps) {
  return (
    <div
      style={{
        position: "fixed", top: 12, left: 12, zIndex: 30,
        display: "flex", flexDirection: "column", gap: 8,
      }}
    >
      <ToolBtn label="About PCH Corvette" onClick={onAboutClick}>
        <IconAbout />
      </ToolBtn>
      <ToolBtn label="Itinerary" onClick={onItineraryClick}>
        <IconItinerary />
      </ToolBtn>
      <ToolBtn label="Locations" onClick={onLocationsClick}>
        <IconLocations />
      </ToolBtn>
      <ToolBtn label="Map Filters" onClick={onFiltersClick}>
        <IconFilters />
      </ToolBtn>
      <ToolBtn label="Statistics" onClick={onStatsClick}>
        <IconStats />
      </ToolBtn>
    </div>
  );
}