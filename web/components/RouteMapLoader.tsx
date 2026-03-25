"use client";

import { useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import IntroModal from "@/components/IntroModal";
import Toolbar from "@/components/Toolbar";
import ItineraryModal from "@/components/ItineraryModal";
import LocationsModal from "@/components/LocationsModal";
import LocationDetailsModal from "@/components/LocationDetailsModal";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

export default function RouteMapLoader() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [openLocationId, setOpenLocationId] = useState<string | null>(null);

  // LocationDetails state
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [detailsHasBack, setDetailsHasBack] = useState(false);

  // flyToRef is populated by RouteMap once the map is ready
  const flyToRef = useRef<((lat: number, lng: number) => void) | null>(null);

  const handleShowOnMap = (lat: number, lng: number) => {
    flyToRef.current?.(lat, lng);
  };

  // Map dot click → open details directly (no back button)
  const handleLocationDotClick = useCallback((id: string) => {
    setLocationsOpen(false);
    setOpenLocationId(null);
    setDetailsId(id);
    setDetailsHasBack(false);
  }, []);

  // Locations list → open details with back button
  const handleOpenDetailsFromList = useCallback((id: string) => {
    setDetailsId(id);
    setDetailsHasBack(true);
  }, []);

  // Itinerary → open details (no back button)
  const handleOpenDetailsFromItinerary = useCallback((id: string) => {
    setDetailsId(id);
    setDetailsHasBack(false);
  }, []);

  // Back in details → return to locations list
  const handleDetailsBack = useCallback(() => {
    setDetailsId(null);
  }, []);

  // Close details → close details (and list if open)
  const handleDetailsClose = useCallback(() => {
    setDetailsId(null);
    if (detailsHasBack) setLocationsOpen(false);
  }, [detailsHasBack]);

  const handleLocationsClose = () => {
    setLocationsOpen(false);
    setOpenLocationId(null);
  };

  return (
    <>
      <RouteMap flyToRef={flyToRef} onLocationDotClick={handleLocationDotClick} />
      <Toolbar
        onAboutClick={() => setAboutOpen(true)}
        onItineraryClick={() => setItineraryOpen(true)}
        onLocationsClick={() => setLocationsOpen(true)}
        onFiltersClick={() => {}}
        onStatsClick={() => {}}
      />
      <IntroModal forceOpen={aboutOpen} onForceClose={() => setAboutOpen(false)} />
      {itineraryOpen && (
        <ItineraryModal
          onClose={() => setItineraryOpen(false)}
          onLocationClick={handleOpenDetailsFromItinerary}
        />
      )}
      {locationsOpen && (
        <LocationsModal
          onClose={handleLocationsClose}
          onShowOnMap={handleShowOnMap}
          onOpenDetails={handleOpenDetailsFromList}
          openLocationId={openLocationId}
        />
      )}
      {detailsId && (
        <LocationDetailsModal
          locationId={detailsId}
          onClose={handleDetailsClose}
          onBack={detailsHasBack ? handleDetailsBack : undefined}
          onShowOnMap={handleShowOnMap}
        />
      )}
    </>
  );
}