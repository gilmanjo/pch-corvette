"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pch_intro_seen";
const GITHUB_URL = "https://github.com/gilmanjo/pch-corvette";

// Warm cream palette
const BG = "#faf6ee";
const BG_CARD = "#f0e8d4";
const C = "#c07808";          // dark amber — readable on cream
const C_BRIGHT = "#f59e0b";   // bright amber for decorative use
const TEXT = "#1c1408";
const TEXT2 = "#5a4525";
const DIM = "#9a7e55";
const BORDER = "1px solid rgba(160,110,30,0.28)";
const DIM_BORDER = "rgba(160,110,30,0.14)";
const OVERLAY = "rgba(12,8,2,0.72)";

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
      style={{ background: OVERLAY, backdropFilter: "blur(4px)" }}
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl shadow-2xl overflow-y-auto"
        style={{ background: BG, border: BORDER, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-mono font-bold tracking-tight" style={{ color: C }}>
                PCH Corvette
              </h1>
              <div className="text-xs font-mono mt-1" style={{ color: DIM }}>
                Portland → San Diego · May–June 2021
              </div>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              style={{
                width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                background: "rgba(160,110,30,0.08)", border: BORDER,
                color: C, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
        </div>

        <div style={{ height: 1, background: DIM_BORDER, margin: "0 32px" }} />

        {/* Body */}
        <div className="px-8 py-5 text-sm leading-relaxed font-mono" style={{ color: TEXT2 }}>
          <p className="mb-4">
            A solo road trip from Portland down the Pacific Coast Highway through California
            to San Diego and back. Built 100% with Claude Code.
          </p>
          <p className="mb-4">
            This project documents the journey with dashcam footage, vehicle telemetry,
            photos and videos taken during the trip, and various keepsakes gathered along the way.
          </p>
          <p>
            <span style={{ color: "#e85d04", fontWeight: 600 }}>Click any point on the orange route</span> to
            jump to that moment in the footage. The telemetry panel shows real-time
            speed, g-forces, engine data, and tire pressures synced to the video.
          </p>
        </div>

        <div style={{ height: 1, background: DIM_BORDER, margin: "0 32px" }} />

        {/* Vehicle section */}
        <div className="px-8 py-5">
          <div className="text-[10px] font-mono tracking-[0.2em] mb-3" style={{ color: DIM }}>
            THE CAR
          </div>

          {/* Car photo placeholder */}
          <div
            className="rounded-lg mb-4 flex items-center justify-center overflow-hidden"
            style={{
              height: 160,
              background: BG_CARD,
              border: `1px solid rgba(160,110,30,0.2)`,
              position: "relative",
            }}
          >
            <svg viewBox="0 0 220 80" width="220" height="80" style={{ opacity: 0.45 }}>
              <path
                d="M10,58 L20,58 Q22,48 30,42 L55,34 Q70,28 85,27 Q100,26 115,28 L140,30 Q158,32 170,36 L188,42 Q195,46 198,54 L208,54 Q212,56 212,58 L10,58 Z"
                fill="#e85d04"
              />
              <ellipse cx="45" cy="58" rx="14" ry="7" fill={BG_CARD} stroke="#c04500" strokeWidth="1.5" />
              <ellipse cx="175" cy="58" rx="14" ry="7" fill={BG_CARD} stroke="#c04500" strokeWidth="1.5" />
              <path d="M85,27 Q95,16 115,15 Q130,14 148,22 L140,30 Q125,29 110,28 Q95,27 85,27 Z"
                fill="#c04500" />
            </svg>
            <div className="absolute bottom-2 right-3 text-[10px] font-mono" style={{ color: "rgba(160,110,30,0.5)" }}>
              photo coming soon
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {[
              ["YEAR", "2021"],
              ["MAKE", "Chevrolet"],
              ["MODEL", "Corvette Stingray"],
              ["TRIM", "2LT"],
              ["COLOR", "Sebring Orange"],
              ["ENGINE", "6.2L LT2 V8"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <span style={{ color: DIM, fontSize: 9, letterSpacing: "0.15em" }}>{label}</span>
                <span style={{ color: TEXT }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: DIM_BORDER, margin: "0 32px" }} />

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
              background: "rgba(160,110,30,0.1)", border: BORDER,
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