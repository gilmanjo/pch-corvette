"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Plyr from "plyr";
import {
  type TelemetryData,
  type TrackFile,
  extractTelemetry,
  nearestGps,
} from "@/lib/resolveClip";

export interface VideoModalProps {
  src: string;
  seekSeconds: number;
  utcTime: string;
  telemetry: TelemetryData;
  track: TrackFile;
  onClose: () => void;
  onEnded?: () => void;
  onPositionUpdate?: (lat: number, lng: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function headingToCardinal(deg: number): string {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function gearLabel(g: number | null): string {
  if (g === null) return "—";
  if (g === 0) return "N";
  if (g === 9) return "R";
  if (g >= 1 && g <= 8) return String(g);
  return "—";
}

function fmt1(v: number | null): string {
  return v !== null ? v.toFixed(1) : "—";
}

const C = "#22d3ee";       // cyan accent
const DIM = "#334155";     // dim/null color
const LABEL = "#3a4a5a";   // label color

// ── Animated value (slot-machine turnover) ────────────────────────────────────

const ANIM_CSS = `
@keyframes numEnterTop    { from { transform:translateY(-70%); opacity:0 } to { transform:translateY(0); opacity:1 } }
@keyframes numEnterBottom { from { transform:translateY(70%);  opacity:0 } to { transform:translateY(0); opacity:1 } }
@keyframes numExitDown    { from { transform:translateY(0);    opacity:1 } to { transform:translateY(70%);  opacity:0 } }
@keyframes numExitUp      { from { transform:translateY(0);    opacity:1 } to { transform:translateY(-70%); opacity:0 } }
`;

function AnimatedValue({
  value,
  format = String,
  style = {},
}: {
  value: number | null;
  format?: (v: number) => string;
  style?: React.CSSProperties;
}) {
  const [state, setState] = useState<{
    cur: number | null;
    ghost: number | null;
    key: number;
    dir: 1 | -1;
  }>({ cur: value, ghost: null, key: 0, dir: 1 });

  useEffect(() => {
    setState((s) => {
      if (value === s.cur) return s;
      return {
        cur: value,
        ghost: s.cur,
        key: s.key + 1,
        dir: (value ?? 0) >= (s.cur ?? 0) ? 1 : -1,
      };
    });
  }, [value]);

  const BOUNCE = "cubic-bezier(0.34,1.56,0.64,1)";
  const enterAnim = `${state.dir === 1 ? "numEnterTop" : "numEnterBottom"} 0.4s ${BOUNCE} forwards`;
  const exitAnim  = `${state.dir === 1 ? "numExitDown" : "numExitUp"} 0.18s ease-in forwards`;
  const text      = state.cur !== null ? format(state.cur) : "—";
  const ghostText = state.ghost !== null ? format(state.ghost) : "—";

  return (
    <span style={{ display: "inline-block", position: "relative", overflow: "hidden", ...style }}>
      {state.ghost !== null && (
        <span key={`g${state.key}`} style={{ position: "absolute", inset: 0, animation: exitAnim, whiteSpace: "nowrap" }}>
          {ghostText}
        </span>
      )}
      <span key={state.key} style={{ display: "block", animation: state.key > 0 ? enterAnim : undefined, whiteSpace: "nowrap" }}>
        {text}
      </span>
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SpeedGauge({ mph }: { mph: number | null }) {
  const MAX = 150;
  const cx = 70, cy = 70, r = 52;
  const circ = 2 * Math.PI * r;
  const trackLen = circ * 0.75;
  const gapLen = circ - trackLen;
  const filled = trackLen * (Math.min(mph ?? 0, MAX) / MAX);

  return (
    <div className="relative" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a2535" strokeWidth="9"
          strokeDasharray={`${trackLen} ${gapLen}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`} />
        {mph !== null && filled > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C} strokeWidth="9"
            strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
            style={{ filter: "drop-shadow(0 0 5px rgba(34,211,238,0.5))", transition: "stroke-dasharray 0.35s ease-out" }} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <AnimatedValue
          value={mph !== null ? Math.round(mph) : null}
          style={{ color: mph !== null ? C : DIM, fontSize: "2.25rem", fontWeight: 700, lineHeight: 1, fontFamily: "monospace",
            textShadow: mph !== null ? "0 0 12px rgba(34,211,238,0.4)" : "none", minWidth: "3ch", textAlign: "center" }}
        />
        <span className="text-[9px] font-mono tracking-[0.25em] mt-1" style={{ color: LABEL }}>MPH</span>
      </div>
    </div>
  );
}

function Compass({ heading }: { heading: number | null }) {
  const h = heading ?? 0;
  const hasFix = heading !== null;
  return (
    <div className="flex items-center gap-3">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="32" fill="none" stroke="#1a2535" strokeWidth="1.5" />
        <circle cx="36" cy="36" r="24" fill="none" stroke="#0f1c2a" strokeWidth="0.5" />
        {([
          [0, C, "N"], [90, "#374151", "E"], [180, "#374151", "S"], [270, "#374151", "W"]
        ] as [number, string, string][]).map(([a, color, lbl]) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return (
            <g key={a}>
              <line x1={36 + 26 * Math.cos(rad)} y1={36 + 26 * Math.sin(rad)}
                x2={36 + 32 * Math.cos(rad)} y2={36 + 32 * Math.sin(rad)}
                stroke={color} strokeWidth={a === 0 ? 2 : 1} />
              <text x={36 + 18 * Math.cos(rad)} y={36 + 18 * Math.sin(rad) + 3}
                textAnchor="middle" fill={color} fontSize={a === 0 ? "8" : "6"} fontFamily="monospace">
                {lbl}
              </text>
            </g>
          );
        })}
        {[45, 135, 225, 315].map((a) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return <line key={a} x1={36 + 28 * Math.cos(rad)} y1={36 + 28 * Math.sin(rad)}
            x2={36 + 32 * Math.cos(rad)} y2={36 + 32 * Math.sin(rad)}
            stroke="#1e2d3d" strokeWidth="1" />;
        })}
        <g style={{ transform: `rotate(${h}deg)`, transformOrigin: "36px 36px", transition: "transform 0.35s ease-out" }} opacity={hasFix ? 1 : 0.2}>
          <polygon points="36,7 33.5,36 36,32 38.5,36" fill={C}
            style={{ filter: "drop-shadow(0 0 3px rgba(34,211,238,0.8))" }} />
          <polygon points="36,65 33.5,36 36,40 38.5,36" fill="#334155" />
        </g>
        <circle cx="36" cy="36" r="2.5" fill={C} />
      </svg>
      <div className="flex flex-col">
        <span className="text-xl font-mono font-bold leading-none"
          style={{ color: hasFix ? C : DIM, textShadow: hasFix ? `0 0 10px rgba(34,211,238,0.4)` : "none" }}>
          {hasFix ? headingToCardinal(h) : "—"}
        </span>
        <span className="text-xs font-mono mt-1" style={{ color: hasFix ? "#4a7a8a" : DIM }}>
          {hasFix ? `${Math.round(h)}°` : "—"}
        </span>
      </div>
    </div>
  );
}

function GForceDot({ gLat, gLon }: { gLat: number | null; gLon: number | null }) {
  const MAX_G = 1.5;
  const hasFix = gLat !== null && gLon !== null;
  const g = hasFix ? Math.sqrt(gLat! ** 2 + gLon! ** 2) : 0;
  const dotColor = g < 0.5 ? C : g < 1.0 ? "#f59e0b" : "#ef4444";
  const dx = hasFix ? (gLat! / MAX_G) * 36 : 0;
  const dy = hasFix ? -(gLon! / MAX_G) * 36 : 0;  // negative = forward = up

  return (
    <div>
      <div className="text-[9px] tracking-[0.2em] mb-2 font-mono" style={{ color: LABEL }}>G-FORCE</div>
      <div className="flex items-center gap-3">
        <svg width="88" height="88" viewBox="-44 -44 88 88">
          {/* Rings */}
          {[36, 24, 12].map((r, i) => (
            <circle key={r} cx="0" cy="0" r={r} fill="none"
              stroke={i === 0 ? "#1a2535" : "#0f1c2a"} strokeWidth={i === 0 ? 1.5 : 0.75} />
          ))}
          {/* Crosshair */}
          <line x1="-36" y1="0" x2="36" y2="0" stroke="#1a2535" strokeWidth="0.5" />
          <line x1="0" y1="-36" x2="0" y2="36" stroke="#1a2535" strokeWidth="0.5" />
          {/* Labels */}
          <text y="-38" textAnchor="middle" fill="#1e2d3d" fontSize="5" fontFamily="monospace">ACCEL</text>
          <text y="43" textAnchor="middle" fill="#1e2d3d" fontSize="5" fontFamily="monospace">BRAKE</text>
          <text x="40" y="2" textAnchor="middle" fill="#1e2d3d" fontSize="5" fontFamily="monospace">R</text>
          <text x="-40" y="2" textAnchor="middle" fill="#1e2d3d" fontSize="5" fontFamily="monospace">L</text>
          {/* Dot — always rendered at origin, moved via CSS translate for animation */}
          <circle cx="0" cy="0" r="4" fill={hasFix ? dotColor : "transparent"}
            style={{
              transform: `translate(${dx}px, ${dy}px)`,
              transition: "transform 0.25s ease-out, fill 0.25s ease-out",
              filter: hasFix ? `drop-shadow(0 0 4px ${dotColor})` : "none",
            }} />
        </svg>
        <div className="font-mono text-xs" style={{ color: "#4a7a8a" }}>
          <div>LAT <span style={{ color: hasFix ? C : DIM }}>{hasFix ? fmt1(gLat) : "—"}<span style={{ color: LABEL }}>g</span></span></div>
          <div className="mt-1">LON <span style={{ color: hasFix ? C : DIM }}>{hasFix ? fmt1(gLon) : "—"}<span style={{ color: LABEL }}>g</span></span></div>
        </div>
      </div>
    </div>
  );
}

// Must be defined at module scope — if defined inside PedalBars, React treats
// it as a new component type on each render and remounts it, killing CSS transitions.
function PedalBar({ value, color, label }: { value: number | null; color: string; label: string }) {
  return (
    <div>
      <div className="flex justify-between font-mono text-[9px] mb-1">
        <span style={{ color: LABEL }}>{label}</span>
        <span style={{ color: value !== null ? color : DIM }}>{value !== null ? `${Math.round(value)}%` : "—"}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "#1a2535" }}>
        <div className="h-2 rounded-full"
          style={{ width: `${Math.min(value ?? 0, 100)}%`, background: color,
            transition: "width 0.25s linear",
            boxShadow: (value ?? 0) > 5 ? `0 0 6px ${color}88` : "none" }} />
      </div>
    </div>
  );
}

function PedalBars({ throttle, brake }: { throttle: number | null; brake: number | null }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[9px] tracking-[0.2em] font-mono" style={{ color: LABEL }}>INPUTS</div>
      <PedalBar value={throttle} color="#22c55e" label="THROTTLE" />
      <PedalBar value={brake} color="#ef4444" label="BRAKE" />
    </div>
  );
}

function RPMBar({ rpm }: { rpm: number | null }) {
  const MAX_RPM = 8000;
  const RED_ZONE = 6500;
  const pct = Math.min((rpm ?? 0) / MAX_RPM, 1) * 100;
  const inRedZone = (rpm ?? 0) > RED_ZONE;
  const barColor = inRedZone ? "#ef4444" : rpm !== null && rpm > 4000 ? "#f59e0b" : C;

  return (
    <div>
      <div className="flex justify-between font-mono text-[9px] mb-1">
        <span style={{ color: LABEL }}>RPM</span>
        <span style={{ color: rpm !== null ? barColor : DIM }}>
          {rpm !== null ? rpm.toLocaleString() : "—"}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "#1a2535" }}>
        <div className="h-1.5 rounded-full"
          style={{ width: `${pct}%`, background: barColor,
            transition: "width 0.3s ease-out",
            boxShadow: inRedZone ? `0 0 6px #ef444488` : "none" }} />
      </div>
      <div className="flex justify-between font-mono text-[8px] mt-0.5">
        <span style={{ color: "#1e2d3d" }}>0</span>
        <span style={{ color: "#ef444466" }}>{RED_ZONE.toLocaleString()} ⬆</span>
        <span style={{ color: "#1e2d3d" }}>{MAX_RPM.toLocaleString()}</span>
      </div>
    </div>
  );
}

function TyreGrid({ tel }: { tel: TelemetryData }) {
  const corners = [
    { label: "LF", press: tel.tyre_press_lf, temp: tel.tyre_temp_lf },
    { label: "RF", press: tel.tyre_press_rf, temp: tel.tyre_temp_rf },
    { label: "LR", press: tel.tyre_press_lr, temp: tel.tyre_temp_lr },
    { label: "RR", press: tel.tyre_press_rr, temp: tel.tyre_temp_rr },
  ];

  return (
    <div>
      <div className="text-[9px] tracking-[0.2em] mb-2 font-mono" style={{ color: LABEL }}>TIRES</div>
      <div className="grid grid-cols-2 gap-1.5">
        {corners.map(({ label, press, temp }) => (
          <div key={label} className="rounded p-1.5 font-mono" style={{ background: "#0d1620" }}>
            <div className="text-[9px]" style={{ color: LABEL }}>{label}</div>
            <div className="text-sm font-bold leading-tight" style={{ color: C }}>
              {press ?? "—"}
              <span className="text-[8px] font-normal" style={{ color: LABEL }}> PSI</span>
            </div>
            <div className="text-[9px]" style={{ color: "#4a7a8a" }}>
              {temp !== null ? `${temp}°C` : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VideoModal({
  src, seekSeconds, utcTime, telemetry: initialTelemetry, track,
  onClose, onEnded, onPositionUpdate,
}: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData>(initialTelemetry);

  // Throttle telemetry updates to ~8 fps to keep React renders manageable.
  // Store the handler in a ref so the Plyr useEffect never needs to re-run
  // when track/onPositionUpdate change — avoids destroying/recreating the player.
  const lastUpdateRef = useRef(0);
  const handleTimeUpdateRef = useRef<() => void>(() => {});
  handleTimeUpdateRef.current = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const now = performance.now();
    if (now - lastUpdateRef.current < 125) return; // ~8 fps
    lastUpdateRef.current = now;

    const t = player.currentTime;
    const tel = extractTelemetry(track, t);
    const gps = nearestGps(track, t);
    if (gps) {
      tel.lat = gps.lat;
      tel.lng = gps.lng;
      tel.altitude_m = gps.alt;
      tel.heading = gps.heading;
    }
    setTelemetry(tel);
    if (gps && onPositionUpdate) onPositionUpdate(gps.lat, gps.lng);
  }, [track, onPositionUpdate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const player = new Plyr(video, {
      controls: ["play", "progress", "current-time", "duration", "mute", "volume", "fullscreen"],
      keyboard: { focused: true, global: false },
    });
    playerRef.current = player;

    // Seek on ready; also try after metadata loads for remote videos
    let hasSought = false;
    const seekTo = () => {
      player.currentTime = seekSeconds;
      hasSought = true;
    };
    // Stable wrapper calls the ref — Plyr effect deps don't include the callback
    const onTimeUpdate = () => handleTimeUpdateRef.current();
    const onEndedCb = () => onEnded?.();
    player.on("ready", seekTo);
    player.on("loadedmetadata", () => { if (!hasSought) seekTo(); });
    player.on("timeupdate", onTimeUpdate);
    player.on("ended", onEndedCb);

    return () => {
      player.off("ready", seekTo);
      player.off("timeupdate", onTimeUpdate);
      player.off("ended", onEndedCb);
      player.destroy();
      playerRef.current = null;
    };
  }, [src, seekSeconds]); // ← no handleTimeUpdate dep; ref keeps it fresh

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const formattedTime = new Date(utcTime).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  const altFt = telemetry.altitude_m != null ? Math.round(telemetry.altitude_m * 3.28084) : null;
  const lngAbs = telemetry.lng != null ? Math.abs(telemetry.lng) : null;
  const lngDir = telemetry.lng != null ? (telemetry.lng < 0 ? "W" : "E") : null;
  const latDir = telemetry.lat != null ? (telemetry.lat >= 0 ? "N" : "S") : null;

  // Mobile: full-screen scrollable overlay. Desktop: centered flex-row card.
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto md:flex md:items-center md:justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(3px)" }}
      onClick={onClose}>
      <div
        className="relative flex flex-col md:flex-row w-full md:max-w-6xl md:mx-4 md:rounded-xl md:overflow-hidden shadow-2xl md:max-h-[90vh]"
        style={{ border: "1px solid rgba(34,211,238,0.12)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* ── Video panel ── */}
        <div className="flex-shrink-0 md:flex-1 min-w-0 bg-black relative">
          <video ref={videoRef} className="w-full block" playsInline>
            <source src={src} type="video/mp4" />
          </video>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: 10, right: 10, zIndex: 10,
              width: 28, height: 28, borderRadius: 4,
              background: "rgba(8,12,16,0.8)",
              border: "1px solid rgba(34,211,238,0.35)",
              color: "#22d3ee", fontSize: 14, lineHeight: 1,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(34,211,238,0.15)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(8,12,16,0.8)"; }}
          >✕</button>
        </div>

        {/* ── Telemetry panel ── */}
        <style>{`
          @media (min-width: 768px) { .tel-panel { width: 256px; flex-shrink: 0; overflow-y: auto; border-left: 1px solid rgba(34,211,238,0.1); max-height: 100%; } }
          ${ANIM_CSS}
        `}</style>
        <div className="tel-panel font-mono" style={{ background: "#080c10", borderTop: "1px solid rgba(34,211,238,0.1)" }}>
          <div className="flex flex-col gap-4 p-4">

            {/* Timestamp + Position — top of panel */}
            <div>
              <div className="text-[9px] tracking-[0.2em] mb-1" style={{ color: LABEL }}>TIMESTAMP</div>
              <div className="text-[11px] leading-relaxed" style={{ color: "#4a7a8a" }}>{formattedTime}</div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.2em] mb-2" style={{ color: LABEL }}>POSITION</div>
              <div className="text-sm leading-relaxed" style={{ color: C }}>
                {telemetry.lat != null ? <>{Math.abs(telemetry.lat).toFixed(4)}°&nbsp;{latDir}</> : <span style={{ color: DIM }}>—</span>}
              </div>
              <div className="text-sm leading-relaxed" style={{ color: C }}>
                {lngAbs != null ? <>{lngAbs.toFixed(4)}°&nbsp;{lngDir}</> : <span style={{ color: DIM }}>—</span>}
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <div className="text-[9px] tracking-[0.2em]" style={{ color: LABEL }}>ELEV</div>
                <span className="text-sm font-bold" style={{ color: altFt != null ? C : DIM }}>
                  {altFt != null ? `${altFt.toLocaleString()} ft` : "—"}
                </span>
              </div>
            </div>

            <div style={{ height: 1, background: "rgba(34,211,238,0.07)" }} />

            {/* Speed + Gear */}
            <div className="flex items-center gap-4">
              <SpeedGauge mph={telemetry.speed_mph} />
              <div className="flex flex-col items-center">
                <div className="text-[9px] tracking-[0.2em]" style={{ color: LABEL }}>GEAR</div>
                <AnimatedValue
                  value={telemetry.gear}
                  format={gearLabel as (v: number) => string}
                  style={{ fontSize: "3rem", fontWeight: 700, lineHeight: 1, marginTop: 4,
                    color: telemetry.gear !== null ? C : DIM, fontFamily: "monospace",
                    textShadow: telemetry.gear !== null ? "0 0 15px rgba(34,211,238,0.5)" : "none",
                    minWidth: "1.5ch", textAlign: "center" }}
                />
              </div>
            </div>

            <div style={{ height: 1, background: "rgba(34,211,238,0.07)" }} />

            {/* G-force */}
            <GForceDot gLat={telemetry.g_lat} gLon={telemetry.g_lon} />

            <div style={{ height: 1, background: "rgba(34,211,238,0.07)" }} />

            {/* Pedals */}
            <PedalBars throttle={telemetry.throttle_pct} brake={telemetry.brake_pct} />

            <div style={{ height: 1, background: "rgba(34,211,238,0.07)" }} />

            {/* RPM */}
            <RPMBar rpm={telemetry.rpm} />

            <div style={{ height: 1, background: "rgba(34,211,238,0.07)" }} />

            {/* Heading */}
            <div>
              <div className="text-[9px] tracking-[0.2em] mb-2" style={{ color: LABEL }}>HEADING</div>
              <Compass heading={telemetry.heading} />
            </div>

            <div style={{ height: 1, background: "rgba(34,211,238,0.07)" }} />

            {/* Engine */}
            <div>
              <div className="text-[9px] tracking-[0.2em] mb-2" style={{ color: LABEL }}>ENGINE</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["OIL °C", telemetry.oil_temp_c],
                  ["COOLANT °C", telemetry.coolant_temp_c],
                  ["OIL PSI", telemetry.oil_pressure],
                  ["FUEL %", telemetry.fuel_pct],
                ].map(([label, val]) => (
                  <div key={label as string} className="rounded p-1.5" style={{ background: "#0d1620" }}>
                    <div className="text-[8px]" style={{ color: LABEL }}>{label}</div>
                    <div className="font-bold text-sm" style={{ color: val !== null ? C : DIM }}>
                      {val !== null ? val : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: "rgba(34,211,238,0.07)" }} />

            {/* Tires */}
            <TyreGrid tel={telemetry} />
          </div>
        </div>
      </div>
    </div>
  );
}