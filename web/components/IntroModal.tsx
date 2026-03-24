"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pch_intro_seen";
const GITHUB_URL = "https://github.com/gilmanjo/pch-corvette";
const C = "#22d3ee";
const BORDER = "1px solid rgba(34,211,238,0.2)";

interface IntroModalProps {
  forceOpen: boolean;
  onForceClose: () => void;
}

export default function IntroModal({ forceOpen, onForceClose }: IntroModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    onForceClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)" }}
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl shadow-2xl"
        style={{ background: "#080c10", border: BORDER }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-mono font-bold tracking-tight" style={{ color: C }}>
                PCH Corvette
              </h1>
              <div className="text-xs font-mono mt-1" style={{ color: "#4a7a8a" }}>
                Pacific Coast Highway · May–June 2021
              </div>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              style={{
                width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                background: "rgba(34,211,238,0.06)", border: BORDER,
                color: C, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(34,211,238,0.08)", margin: "0 32px" }} />

        {/* Body */}
        <div className="px-8 py-6 text-sm leading-relaxed font-mono" style={{ color: "#8ea4b8" }}>
          <p className="mb-4">
            A solo road trip from Seattle down the Pacific Coast Highway through
            California to San Diego and back, captured with a dashcam and GPS
            telemetry logger.
          </p>
          <p>
            <span style={{ color: "#e85d04" }}>Click any point on the orange route</span> to
            jump to that moment in the footage. The telemetry panel shows real-time
            speed, g-forces, engine data, and tire pressures synced to the video.
          </p>
        </div>

        <div style={{ height: 1, background: "rgba(34,211,238,0.08)", margin: "0 32px" }} />

        {/* Footer */}
        <div className="px-8 py-5 flex items-center justify-between">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-mono"
            style={{ color: C, textDecoration: "none" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
            </svg>
            github.com/gilmanjo/pch-corvette
          </a>
          <button
            onClick={close}
            className="text-xs font-mono px-4 py-2 rounded"
            style={{
              background: "rgba(34,211,238,0.1)", border: BORDER,
              color: C, cursor: "pointer",
            }}
          >
            Explore the Map →
          </button>
        </div>
      </div>
    </div>
  );
}