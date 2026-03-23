"use client";

import { useEffect, useRef } from "react";
import Plyr from "plyr";
import type { TelemetryData } from "@/lib/resolveClip";

export interface VideoModalProps {
  src: string;
  seekSeconds: number;
  utcTime: string;
  telemetry: TelemetryData;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function headingToCardinal(deg: number): string {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ── Speed Gauge ───────────────────────────────────────────────────────────────

function SpeedGauge({ mph }: { mph: number | null }) {
  const MAX = 150;
  const cx = 70, cy = 70, r = 52;
  const circ = 2 * Math.PI * r;
  // 270° arc from ~7:30 to ~4:30 o'clock; rotate(135) starts stroke at 7:30
  const trackLen = circ * 0.75;
  const gapLen = circ - trackLen;
  const speed = Math.min(mph ?? 0, MAX);
  const filled = trackLen * (speed / MAX);

  return (
    <div className="relative mx-auto" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* Track background */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#1a2535" strokeWidth="9"
          strokeDasharray={`${trackLen} ${gapLen}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Speed fill */}
        {mph !== null && filled > 0 && (
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke="#22d3ee" strokeWidth="9"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
            style={{ filter: "drop-shadow(0 0 5px rgba(34,211,238,0.55))" }}
          />
        )}
        {/* Tick at 0 and max */}
        <circle cx={cx} cy={cy} r={r - 14}
          fill="none" stroke="#0f1c2a" strokeWidth="0.5" strokeDasharray="1 8" />
      </svg>
      {/* Center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-mono font-bold leading-none"
          style={{ color: mph !== null ? "#22d3ee" : "#334155",
                   textShadow: mph !== null ? "0 0 12px rgba(34,211,238,0.4)" : "none" }}>
          {mph !== null ? Math.round(mph) : "—"}
        </span>
        <span className="text-[9px] font-mono tracking-[0.25em] mt-1 text-zinc-600">MPH</span>
      </div>
    </div>
  );
}

// ── Compass ───────────────────────────────────────────────────────────────────

function Compass({ heading }: { heading: number | null }) {
  const h = heading ?? 0;
  const hasFix = heading !== null;

  return (
    <div className="flex items-center gap-4">
      <svg width="76" height="76" viewBox="0 0 76 76">
        {/* Outer ring */}
        <circle cx="38" cy="38" r="34"
          fill="none" stroke="#1a2535" strokeWidth="1.5" />
        {/* Inner ring */}
        <circle cx="38" cy="38" r="26"
          fill="none" stroke="#0f1c2a" strokeWidth="0.5" />
        {/* Cardinal ticks + labels */}
        {([
          [0,   "#22d3ee", "N"],
          [90,  "#374151", "E"],
          [180, "#374151", "S"],
          [270, "#374151", "W"],
        ] as [number, string, string][]).map(([a, color, label]) => {
          const rad = ((a - 90) * Math.PI) / 180;
          const x1 = 38 + 27 * Math.cos(rad), y1 = 38 + 27 * Math.sin(rad);
          const x2 = 38 + 34 * Math.cos(rad), y2 = 38 + 34 * Math.sin(rad);
          const tx = 38 + 19 * Math.cos(rad), ty = 38 + 19 * Math.sin(rad) + 3;
          return (
            <g key={a}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={a === 0 ? 2 : 1} />
              <text x={tx} y={ty} textAnchor="middle" fill={color}
                fontSize={a === 0 ? "8" : "6"} fontFamily="monospace" fontWeight={a === 0 ? "bold" : "normal"}>
                {label}
              </text>
            </g>
          );
        })}
        {/* Intercardinal ticks */}
        {[45, 135, 225, 315].map((a) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return (
            <line key={a}
              x1={38 + 30 * Math.cos(rad)} y1={38 + 30 * Math.sin(rad)}
              x2={38 + 34 * Math.cos(rad)} y2={38 + 34 * Math.sin(rad)}
              stroke="#1e2d3d" strokeWidth="1" />
          );
        })}
        {/* Needle */}
        <g transform={`rotate(${h} 38 38)`} opacity={hasFix ? 1 : 0.25}>
          <polygon points="38,8 35.5,38 38,34 40.5,38"
            fill="#22d3ee"
            style={{ filter: "drop-shadow(0 0 3px rgba(34,211,238,0.8))" }} />
          <polygon points="38,68 35.5,38 38,42 40.5,38" fill="#334155" />
        </g>
        {/* Hub */}
        <circle cx="38" cy="38" r="3" fill="#22d3ee" />
      </svg>

      <div className="flex flex-col">
        <span className="text-2xl font-mono font-bold leading-none"
          style={{ color: hasFix ? "#22d3ee" : "#334155",
                   textShadow: hasFix ? "0 0 10px rgba(34,211,238,0.4)" : "none" }}>
          {hasFix ? headingToCardinal(h) : "—"}
        </span>
        <span className="text-sm font-mono text-zinc-500 mt-1">
          {hasFix ? `${Math.round(h)}°` : "—"}
        </span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VideoModal({
  src,
  seekSeconds,
  utcTime,
  telemetry,
  onClose,
}: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const player = new Plyr(video, {
      controls: ["play", "progress", "current-time", "duration", "fullscreen"],
      keyboard: { focused: true, global: false },
    });
    playerRef.current = player;
    const onReady = () => {
      player.currentTime = seekSeconds;
      void player.play();
    };
    player.on("ready", onReady);
    return () => {
      player.off("ready", onReady);
      player.destroy();
      playerRef.current = null;
    };
  }, [src, seekSeconds]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const formattedTime = new Date(utcTime).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  const altFt = telemetry.altitude_m != null
    ? Math.round(telemetry.altitude_m * 3.28084)
    : null;

  const lngAbs = telemetry.lng != null ? Math.abs(telemetry.lng) : null;
  const lngDir = telemetry.lng != null ? (telemetry.lng < 0 ? "W" : "E") : null;
  const latDir = telemetry.lat != null ? (telemetry.lat >= 0 ? "N" : "S") : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-6xl mx-4 rounded-xl overflow-hidden shadow-2xl"
        style={{ border: "1px solid rgba(34,211,238,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Video panel ── */}
        <div className="flex-1 min-w-0 bg-black flex flex-col">
          <div className="flex items-center justify-end px-3 py-2 bg-zinc-950">
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors text-lg leading-none"
              aria-label="Close"
            >✕</button>
          </div>
          <video ref={videoRef} className="w-full" playsInline>
            <source src={src} type="video/mp4" />
          </video>
        </div>

        {/* ── Telemetry panel ── */}
        <div
          className="flex-shrink-0 flex flex-col gap-5 p-5 font-mono overflow-y-auto"
          style={{
            width: 220,
            background: "#080c10",
            borderLeft: "1px solid rgba(34,211,238,0.1)",
          }}
        >
          {/* VELOCITY */}
          <div>
            <div className="text-[9px] tracking-[0.2em] mb-3" style={{ color: "#3a4a5a" }}>VELOCITY</div>
            <SpeedGauge mph={telemetry.speed_mph} />
          </div>

          <div style={{ height: 1, background: "rgba(34,211,238,0.08)" }} />

          {/* HEADING */}
          <div>
            <div className="text-[9px] tracking-[0.2em] mb-3" style={{ color: "#3a4a5a" }}>HEADING</div>
            <Compass heading={telemetry.heading} />
          </div>

          <div style={{ height: 1, background: "rgba(34,211,238,0.08)" }} />

          {/* POSITION */}
          <div>
            <div className="text-[9px] tracking-[0.2em] mb-2" style={{ color: "#3a4a5a" }}>POSITION</div>
            <div className="text-sm leading-relaxed" style={{ color: "#22d3ee" }}>
              {telemetry.lat != null
                ? <>{Math.abs(telemetry.lat).toFixed(4)}°&nbsp;{latDir}</>
                : <span style={{ color: "#334155" }}>—</span>}
            </div>
            <div className="text-sm leading-relaxed" style={{ color: "#22d3ee" }}>
              {lngAbs != null
                ? <>{lngAbs.toFixed(4)}°&nbsp;{lngDir}</>
                : <span style={{ color: "#334155" }}>—</span>}
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(34,211,238,0.08)" }} />

          {/* ELEVATION */}
          <div>
            <div className="text-[9px] tracking-[0.2em] mb-2" style={{ color: "#3a4a5a" }}>ELEVATION</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold leading-none"
                style={{ color: altFt != null ? "#22d3ee" : "#334155",
                         textShadow: altFt != null ? "0 0 10px rgba(34,211,238,0.35)" : "none" }}>
                {altFt != null ? altFt.toLocaleString() : "—"}
              </span>
              {altFt != null && (
                <span className="text-[10px]" style={{ color: "#3a4a5a" }}>FT</span>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(34,211,238,0.08)" }} />

          {/* TIMESTAMP */}
          <div className="mt-auto">
            <div className="text-[9px] tracking-[0.2em] mb-2" style={{ color: "#3a4a5a" }}>TIMESTAMP</div>
            <div className="text-[11px] leading-relaxed" style={{ color: "#4a7a8a" }}>
              {formattedTime}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}