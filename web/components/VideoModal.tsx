"use client";

import { useEffect, useRef } from "react";
import Plyr from "plyr";

export interface VideoModalProps {
  src: string;
  seekSeconds: number;
  utcTime: string;
  onClose: () => void;
}

export default function VideoModal({
  src,
  seekSeconds,
  utcTime,
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

    // Seek once media is ready
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const formattedTime = new Date(utcTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl mx-4 rounded-lg overflow-hidden shadow-2xl bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900">
          <span className="text-sm text-zinc-400 font-mono">{formattedTime}</span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close video"
          >
            ✕
          </button>
        </div>

        {/* Video */}
        <video ref={videoRef} className="w-full" playsInline>
          <source src={src} type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>
      </div>
    </div>
  );
}
