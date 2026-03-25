"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { loadClipIndex, type ClipIndex } from "@/lib/clipIndex";
import { resolveClip, resolveNextClip, type ResolvedClip } from "@/lib/resolveClip";
import VideoModal from "@/components/VideoModal";
import { TRIP_LOCATIONS } from "@/lib/tripData";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
const STYLE_URL = `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_KEY}`;

const TIMELINE_SOURCE = "route-timeline";
const TIMELINE_LAYER = "route-timeline-line";
const PDR_SOURCE = "route-pdr";
const PDR_LAYER = "route-pdr-line";
const PDR_POINTS_SOURCE = "route-pdr-points";
const PDR_POINTS_LAYER = "route-pdr-points-hit";
const LOC_SOURCE = "trip-locations";
const LOC_LAYER = "trip-locations-dots";

const TRIP_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-124.5, 32.5],
  [-114.0, 47.0],
];

// Portland, OR — trip start
const TRIP_START: [number, number] = [-122.6765, 45.5231];

// PDR clock was set to local PDT time but stored/labeled as UTC.
// Add 7h (PDT offset) to recover true UTC, then format in Pacific time.
const PDR_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

interface TooltipState {
  x: number;
  y: number;
  utc: string;
  speed_raw_mph: number | null;  // geojson "speed_kmh" field = actual mph
  lat: number;
  lng: number;
}

interface RouteMapProps {
  flyToRef?: React.MutableRefObject<((lat: number, lng: number) => void) | null>;
  onLocationDotClick?: (id: string) => void;
}

export default function RouteMap({ flyToRef, onLocationDotClick }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const indexRef = useRef<ClipIndex | null>(null);
  const resolvingRef = useRef(false);
  const carMarkerRef = useRef<maplibregl.Marker | null>(null);
  const activeClipRef = useRef<ResolvedClip | null>(null);
  const hoveredLocIdRef = useRef<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [noClip, setNoClip] = useState(false);
  const [activeClip, setActiveClip] = useState<ResolvedClip | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [locTooltip, setLocTooltip] = useState<{ x: number; y: number; id: string } | null>(null);

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

    // Expose flyTo for parent (Locations modal)
    if (flyToRef) {
      flyToRef.current = (lat, lng) => {
        map.flyTo({ center: [lng, lat], zoom: 11, duration: 1200 });
      };
    }

    // Place car marker at Portland (trip start) before any clip is loaded
    const startEl = document.createElement("div");
    startEl.style.cssText =
      "width:24px;height:24px;background:#e85d04;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(232,93,4,0.8);";
    carMarkerRef.current = new maplibregl.Marker({ element: startEl })
      .setLngLat(TRIP_START)
      .addTo(map);

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
          speed_kmh: number | null;  // mislabeled in geojson — actually mph
        };
        setTooltip({
          x: e.point.x,
          y: e.point.y,
          utc: props.utc,
          speed_raw_mph: props.speed_kmh,  // use speed_kmh which is the actual mph value
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        });
      });
      // ── Location dots (GL layer — no DOM/transform conflict) ──
      map.addSource(LOC_SOURCE, {
        type: "geojson",
        promoteId: "id",
        data: {
          type: "FeatureCollection",
          features: TRIP_LOCATIONS.map((loc) => ({
            type: "Feature" as const,
            id: loc.id,
            geometry: { type: "Point" as const, coordinates: [loc.lng, loc.lat] },
            properties: { id: loc.id },
          })),
        },
      });
      map.addLayer({
        id: LOC_LAYER,
        type: "circle",
        source: LOC_SOURCE,
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "hovered"], false], 8, 6],
          "circle-color": "#f59e0b",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.on("mouseenter", LOC_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LOC_LAYER, () => {
        map.getCanvas().style.cursor = "";
        if (hoveredLocIdRef.current) {
          map.setFeatureState({ source: LOC_SOURCE, id: hoveredLocIdRef.current }, { hovered: false });
          hoveredLocIdRef.current = null;
        }
        setLocTooltip(null);
      });
      map.on("mousemove", LOC_LAYER, (e) => {
        if (!e.features || e.features.length === 0) { setLocTooltip(null); return; }
        const id = e.features[0].id as string;
        if (hoveredLocIdRef.current !== id) {
          if (hoveredLocIdRef.current) {
            map.setFeatureState({ source: LOC_SOURCE, id: hoveredLocIdRef.current }, { hovered: false });
          }
          hoveredLocIdRef.current = id;
          map.setFeatureState({ source: LOC_SOURCE, id }, { hovered: true });
        }
        const rect = map.getCanvas().getBoundingClientRect();
        setLocTooltip({ x: rect.left + e.point.x, y: rect.top + e.point.y, id });
      });

      // Unified click: location dots take priority over PDR route
      map.on("click", (e) => {
        const locFeats = map.queryRenderedFeatures(e.point, { layers: [LOC_LAYER] });
        if (locFeats.length > 0) {
          const id = locFeats[0].properties?.id as string;
          if (id) onLocationDotClick?.(id);
          return;
        }
        const pdrFeats = map.queryRenderedFeatures(e.point, { layers: [PDR_LAYER] });
        if (pdrFeats.length > 0) {
          onRouteClick(e.lngLat.lng, e.lngLat.lat);
        }
      });
    });

    return () => {
      if (flyToRef) flyToRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [onRouteClick, flyToRef, onLocationDotClick]);

  // Stable callbacks — must not change on tooltip hover re-renders or Plyr
  // will destroy and recreate the player every time the map tooltip moves.
  activeClipRef.current = activeClip;

  const onPositionUpdate = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    if (!carMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:24px;height:24px;background:#e85d04;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(232,93,4,0.8);";
      carMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    } else {
      carMarkerRef.current.setLngLat([lng, lat]);
    }
  }, []);

  const onModalClose = useCallback(() => {
    carMarkerRef.current?.remove();
    carMarkerRef.current = null;
    setActiveClip(null);
  }, []);

  const onClipEnded = useCallback(async () => {
    if (!activeClipRef.current || !indexRef.current) return;
    const next = await resolveNextClip(activeClipRef.current.file, indexRef.current);
    if (next) {
      carMarkerRef.current?.remove();
      carMarkerRef.current = null;
      setActiveClip(next);
    }
  }, []);

  // Create/update the car marker immediately when a clip is activated
  useEffect(() => {
    if (!activeClip || !mapRef.current) return;
    const { lat, lng } = activeClip.telemetry;
    if (lat == null || lng == null) return;
    if (!carMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:24px;height:24px;background:#e85d04;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(232,93,4,0.8);";
      carMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    } else {
      carMarkerRef.current.setLngLat([lng, lat]);
    }
  }, [activeClip]);

  // Correct the PDR "UTC" timestamps (actually PDT) for display
  const formattedTooltipTime = tooltip
    ? new Date(new Date(tooltip.utc).getTime() + PDR_UTC_OFFSET_MS).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
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

      {/* Hover tooltip — warm cream style */}
      {tooltip && (
        <div
          className="fixed z-30 pointer-events-none px-3 py-2 rounded-lg text-xs font-mono shadow-lg"
          style={{
            left: tooltip.x + 14, top: tooltip.y - 40,
            background: "rgba(250,246,238,0.97)",
            border: "1px solid rgba(160,110,30,0.25)",
            color: "#1c1408",
          }}
        >
          <div>{formattedTooltipTime}</div>
          {tooltip.speed_raw_mph !== null && (
            <div style={{ color: "#7a5a20" }}>{Math.round(tooltip.speed_raw_mph)} mph</div>
          )}
          <div style={{ color: "#9a7e55", fontSize: 10, marginTop: 2 }}>
            {tooltip.lat.toFixed(4)}, {tooltip.lng.toFixed(4)}
          </div>
        </div>
      )}

      {/* Location hover tooltip */}
      {locTooltip && (() => {
        const loc = TRIP_LOCATIONS.find(l => l.id === locTooltip.id);
        if (!loc) return null;
        const hasMedia = loc.media.photos > 0 || loc.media.videos > 0 || loc.media.keepsakes > 0;
        return (
          <div
            className="fixed z-30 pointer-events-none px-3 py-2 rounded-lg text-xs font-mono shadow-lg"
            style={{
              left: locTooltip.x + 14, top: locTooltip.y - 56,
              background: "rgba(250,246,238,0.97)",
              border: "1px solid rgba(160,110,30,0.25)",
              color: "#1c1408",
            }}
          >
            <div style={{ fontWeight: 600 }}>{loc.name}</div>
            <div style={{ color: "#9a7e55", fontSize: 10, marginTop: 1 }}>{loc.region}</div>
            {hasMedia && (
              <div style={{ color: "#7a5a20", marginTop: 3, display: "flex", gap: 8 }}>
                {loc.media.photos > 0 && <span>{loc.media.photos} photos</span>}
                {loc.media.videos > 0 && <span>{loc.media.videos} videos</span>}
                {loc.media.keepsakes > 0 && <span>{loc.media.keepsakes} keepsakes</span>}
              </div>
            )}
          </div>
        );
      })()}

      {/* Resolving spinner / no-clip toast */}
      {(resolving || noClip) && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full text-sm font-mono"
          style={{
            background: "rgba(250,246,238,0.97)",
            border: "1px solid rgba(160,110,30,0.25)",
            color: "#1c1408",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          }}
        >
          {resolving ? "Loading clip…" : "No clip for this location"}
        </div>
      )}

      {/* Video modal */}
      {activeClip && (
        <VideoModal
          src={activeClip.videoUrl}
          seekSeconds={activeClip.seekSeconds}
          utcTime={activeClip.utcTime}
          telemetry={activeClip.telemetry}
          track={activeClip.track}
          onPositionUpdate={onPositionUpdate}
          onEnded={onClipEnded}
          onClose={onModalClose}
        />
      )}
    </>
  );
}