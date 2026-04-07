"use client";

import { useEffect, useCallback } from "react";
import { type DslrPhoto, fmtExposure, fmtFStop } from "@/lib/photoData";

const BG = "#faf6ee";
const C = "#c07808";
const TEXT = "#1c1408";
const TEXT2 = "#5a4525";
const DIM = "#9a7e55";
const BORDER = "1px solid rgba(160,110,30,0.28)";
const OVERLAY = "rgba(12,8,2,0.88)";

interface PhotoModalProps {
  photos: DslrPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function ExifPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "5px 10px", borderRadius: 6,
      background: "rgba(160,110,30,0.07)", border: BORDER,
      gap: 2,
    }}>
      <span style={{ fontFamily: "monospace", fontSize: 8, color: DIM, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: TEXT2, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

export default function PhotoModal({ photos, index, onClose, onNavigate }: PhotoModalProps) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const handlePrev = useCallback(() => { if (hasPrev) onNavigate(index - 1); }, [hasPrev, index, onNavigate]);
  const handleNext = useCallback(() => { if (hasNext) onNavigate(index + 1); }, [hasNext, index, onNavigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrev, handleNext, onClose]);

  if (!photo) return null;

  // Format date in local Pacific time
  const takenDate = new Date(photo.takenAt);
  const dateStr = takenDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    timeZone: "America/Los_Angeles",
  });
  const timeStr = takenDate.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles",
    timeZoneName: "short",
  });

  const exifPills: { label: string; value: string }[] = [];
  if (photo.fNumber != null) exifPills.push({ label: "Aperture", value: fmtFStop(photo.fNumber) });
  if (photo.exposureTime != null) exifPills.push({ label: "Shutter", value: fmtExposure(photo.exposureTime) });
  if (photo.iso != null) exifPills.push({ label: "ISO", value: String(photo.iso) });
  if (photo.focalLength != null) {
    const fl = photo.focalLength35mm
      ? `${photo.focalLength}mm (${photo.focalLength35mm}mm)`
      : `${photo.focalLength}mm`;
    exifPills.push({ label: "Focal Length", value: fl });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: OVERLAY, backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        style={{
          display: "flex", flexDirection: "column",
          maxWidth: "min(1000px, 95vw)", width: "100%",
          maxHeight: "95vh",
          background: BG, borderRadius: 12, border: BORDER,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image area with prev/next */}
        <div style={{ position: "relative", flex: 1, background: "#0a0806", minHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/photos/dslr/full/${photo.filename}`}
            alt={photo.id}
            style={{
              display: "block", width: "100%", height: "100%",
              objectFit: "contain", maxHeight: "calc(95vh - 130px)",
            }}
          />

          {/* Prev */}
          {hasPrev && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                width: 36, height: 36, borderRadius: 8,
                background: "rgba(250,246,238,0.9)", border: BORDER,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: C,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Next */}
          {hasNext && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                width: 36, height: 36, borderRadius: 8,
                background: "rgba(250,246,238,0.9)", border: BORDER,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: C,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 10, right: 10,
              width: 28, height: 28, borderRadius: 4,
              background: "rgba(250,246,238,0.9)", border: BORDER,
              color: C, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>

          {/* Counter */}
          <div style={{
            position: "absolute", bottom: 10, right: 10,
            fontFamily: "monospace", fontSize: 10, color: DIM,
            background: "rgba(250,246,238,0.85)", padding: "2px 7px",
            borderRadius: 4, border: BORDER,
          }}>
            {index + 1} / {photos.length}
          </div>
        </div>

        {/* EXIF bar */}
        <div style={{ padding: "10px 16px", borderTop: BORDER, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Date / time */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: TEXT, fontWeight: 600 }}>
                {dateStr}
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: DIM, marginTop: 1 }}>
                {timeStr} · {photo.camera}
                {photo.lens ? ` · ${photo.lens}` : ""}
              </div>
            </div>

            {/* EXIF pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {exifPills.map(({ label, value }) => (
                <ExifPill key={label} label={label} value={value} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}