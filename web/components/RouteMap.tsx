"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { loadClipIndex, type ClipIndex } from "@/lib/clipIndex";
import { resolveClip, type ResolvedClip } from "@/lib/resolveClip";
import VideoModal from "@/components/VideoModal";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
const STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

const TIMELINE_SOURCE = "route-timeline";
const TIMELINE_LAYER = "route-timeline-line";
const PDR_SOURCE = "route-pdr";
const PDR_LAYER = "route-pdr-line";
const PDR_POINTS_SOURCE = "route-pdr-points";
const PDR_POINTS_LAYER = "route-pdr-points-hit";

const TRIP_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-124.5, 32.5],
  [-114.0, 47.0],
];

const PLACEHOLDER_POIS = [
  { name: "Astoria, OR", lng: -123.831, lat: 46.188 },
  { name: "Big Sur, CA", lng: -121.808, lat: 36.27 },
  { name: "Death Valley", lng: -116.866, lat: 36.505 },
  { name: "Crater Lake", lng: -122.109, lat: 42.944 },
];

interface TooltipState {
  x: number;
  y: number;
  utc: string;
  speed_mph: number | null;
}

export default function RouteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const indexRef = useRef<ClipIndex | null>(null);
  const resolvingRef = useRef(false);
  const [resolving, setResolving] = useState(false);
  const [noClip, setNoClip] = useState(false);
  const [activeClip, setActiveClip] = useState<ResolvedClip | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const onRouteClick = useCallback(
    async (lng: number, lat: number) => {
      if (resolvingRef.current) return;
      resolvingRef.current = true;
      setResolving(true);
      try {
        if (!indexRef.current) {
          indexRef.current = await loadClipIndex();
        }
        const clip = await resolveClip(lng, lat, indexRef.current);
        if (clip) {
          setActiveClip(clip);
        } else {
          setNoClip(true);
          setTimeout(() => setNoClip(false), 2500);
        }
      } catch (e) {
        console.error("resolveClip failed:", e);
      } finally {
        resolvingRef.current = false;
        setResolving(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      bounds: TRIP_BOUNDS,
      fitBoundsOptions: { padding: 40 },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // ── Timeline route (Google Maps) — muted blue, no interaction ──
      map.addSource(TIMELINE_SOURCE, {
        type: "geojson",
        data: "/route_timeline.geojson",
      });
      map.addLayer({
        id: TIMELINE_LAYER,
        type: "line",
        source: TIMELINE_SOURCE,
        layout: { "line-join": "round", "line-cap": "butt" },
        paint: {
          "line-color": "#4a90d9",
          "line-width": 3,
          "line-opacity": 0.75,
          "line-dasharray": [4, 4],
        },
      });

      // ── PDR route (dashcam telemetry) — orange, clickable + hoverable ──
      map.addSource(PDR_SOURCE, {
        type: "geojson",
        data: "/route_pdr.geojson",
      });
      map.addLayer({
        id: `${PDR_LAYER}-shadow`,
        type: "line",
        source: PDR_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#000000",
          "line-width": 8,
          "line-opacity": 0.15,
          "line-blur": 4,
        },
      });
      map.addLayer({
        id: PDR_LAYER,
        type: "line",
        source: PDR_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#e85d04",
          "line-width": 3,
          "line-opacity": 0.9,
        },
      });

      // ── PDR hover points — invisible circles used for queryRenderedFeatures ──
      map.addSource(PDR_POINTS_SOURCE, {
        type: "geojson",
        data: "/route_pdr_points.geojson",
      });
      map.addLayer({
        id: PDR_POINTS_LAYER,
        type: "circle",
        source: PDR_POINTS_SOURCE,
        paint: {
          "circle-radius": 12,
          "circle-opacity": 0,
          "circle-stroke-width": 0,
        },
      });

      map.on("mouseenter", PDR_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", PDR_LAYER, () => {
        map.getCanvas().style.cursor = "";
        setTooltip(null);
      });
      map.on("mousemove", PDR_LAYER, (e) => {
        const features = map.queryRenderedFeatures(
          [
            [e.point.x - 20, e.point.y - 20],
            [e.point.x + 20, e.point.y + 20],
          ],
          { layers: [PDR_POINTS_LAYER] }
        );
        if (features.length === 0) {
          setTooltip(null);
          return;
        }
        const props = features[0].properties as {
          utc: string;
          speed_mph: number | null;
        };
        setTooltip({
          x: e.point.x,
          y: e.point.y,
          utc: props.utc,
          speed_mph: props.speed_mph,
        });
      });
      map.on("click", PDR_LAYER, (e) => {
        onRouteClick(e.lngLat.lng, e.lngLat.lat);
      });
    });

    for (const poi of PLACEHOLDER_POIS) {
      const el = document.createElement("div");
      el.className =
        "w-4 h-4 rounded-full bg-yellow-400 border-2 border-white shadow-md cursor-pointer";
      el.title = poi.name;

      new maplibregl.Marker({ element: el })
        .setLngLat([poi.lng, poi.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 12 }).setHTML(
            `<span class="text-sm font-medium">${poi.name}</span>`
          )
        )
        .addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onRouteClick]);

  const formattedTooltipTime = tooltip
    ? new Date(tooltip.utc).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : null;

  return (
    <>
      <div ref={containerRef} className="w-full h-full" />

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="fixed z-30 pointer-events-none px-3 py-2 rounded-lg bg-black/80 text-white text-xs font-mono shadow-lg"
          style={{ left: tooltip.x + 14, top: tooltip.y - 40 }}
        >
          <div>{formattedTooltipTime}</div>
          {tooltip.speed_mph !== null && (
            <div className="text-zinc-300">{tooltip.speed_mph} mph</div>
          )}
        </div>
      )}

      {/* Resolving spinner / no-clip toast */}
      {(resolving || noClip) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-black/70 text-white text-sm">
          {resolving ? "Loading clip…" : "No clip for this location"}
        </div>
      )}

      {/* Video modal */}
      {activeClip && (
        <VideoModal
          src={activeClip.videoUrl}
          seekSeconds={activeClip.seekSeconds}
          utcTime={activeClip.utcTime}
          onClose={() => setActiveClip(null)}
        />
      )}
    </>
  );
}