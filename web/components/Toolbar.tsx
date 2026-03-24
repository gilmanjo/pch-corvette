"use client";

import { useState } from "react";

const C = "#22d3ee";
const BORDER = "rgba(34,211,238,0.2)";

interface ToolbarProps {
  onAboutClick: () => void;
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
          background: hovered ? "rgba(34,211,238,0.14)" : "rgba(8,12,16,0.82)",
          border: `1px solid ${hovered ? "rgba(34,211,238,0.45)" : BORDER}`,
          color: C,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s, border-color 0.15s",
          backdropFilter: "blur(4px)",
        }}
      >
        {children}
      </button>
      {hovered && (
        <div
          style={{
            position: "absolute", right: "calc(100% + 8px)", top: "50%",
            transform: "translateY(-50%)", whiteSpace: "nowrap",
            background: "rgba(8,12,16,0.92)",
            border: `1px solid ${BORDER}`,
            color: C, fontSize: 11, fontFamily: "monospace",
            padding: "4px 10px", borderRadius: 4,
            pointerEvents: "none", backdropFilter: "blur(4px)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

// SVG icons
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

export default function Toolbar({ onAboutClick }: ToolbarProps) {
  return (
    <div
      style={{
        position: "fixed", top: 12, right: 52, zIndex: 30,
        display: "flex", flexDirection: "column", gap: 8,
      }}
    >
      <ToolBtn label="About PCH Corvette" onClick={onAboutClick}>
        <IconAbout />
      </ToolBtn>
      <ToolBtn label="Itinerary" onClick={() => {}}>
        <IconItinerary />
      </ToolBtn>
      <ToolBtn label="Map Filters" onClick={() => {}}>
        <IconFilters />
      </ToolBtn>
      <ToolBtn label="Statistics" onClick={() => {}}>
        <IconStats />
      </ToolBtn>
    </div>
  );
}