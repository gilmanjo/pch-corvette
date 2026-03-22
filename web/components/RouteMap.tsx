"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { loadClipIndex, type ClipIndex } from "@/lib/clipIndex";
import { resolveClip, type ResolvedClip } from "@/lib/resolveClip";
import VideoModal from "@/components/VideoModal";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
const STYLE_URL = `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`;

const ROUTE_SOURCE = "route";
const ROUTE_LAYER = "route-line";

// Rough bounding box of the trip: Portland → San Diego → Reno → Portland
const TRIP_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-124.5, 32.5], // SW: San Diego coast
  [-114.0, 47.0], // NE: Portland area
];

// Placeholder POIs — will be replaced by pois.json from the pipeline
const PLACEHOLDER_POIS = [
  { name: "Astoria, OR", lng: -123.831, lat: 46.188 },
  { name: "Big Sur, CA", lng: -121.808, lat: 36.27 },
  { name: "Death Valley", lng: -116.866, lat: 36.505 },
  { name: "Crater Lake", lng: -122.109, lat: 42.944 },
];

export default function RouteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const indexRef = useRef<ClipIndex | null>(null);
  const resolvingRef = useRef(false);
  const [resolving, setResolving] = useState(false);
  const [activeClip, setActiveClip] = useState<ResolvedClip | null>(null);

  // Stable ref so the map click listener always calls the latest handler
  // without needing to re-register after state changes.
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
        if (clip) setActiveClip(clip);
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
      map.addSource(ROUTE_SOURCE, {
        type: "geojson",
        data: "/route_timeline.geojson",
      });

      map.addLayer({
        id: `${ROUTE_LAYER}-shadow`,
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#000000",
          "line-width": 8,
          "line-opacity": 0.15,
          "line-blur": 4,
        },
      });

      map.addLayer({
        id: ROUTE_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#e85d04",
          "line-width": 3,
          "line-opacity": 0.9,
        },
      });

      map.on("mouseenter", ROUTE_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", ROUTE_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", ROUTE_LAYER, (e) => {
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

  return (
    <>
      <div ref={containerRef} className="w-full h-full" />

      {/* Resolving spinner */}
      {resolving && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-black/70 text-white text-sm">
          Loading clip…
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
