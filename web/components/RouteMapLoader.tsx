"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import IntroModal from "@/components/IntroModal";
import Toolbar from "@/components/Toolbar";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

export default function RouteMapLoader() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <RouteMap />
      <Toolbar onAboutClick={() => setAboutOpen(true)} />
      <IntroModal forceOpen={aboutOpen} onForceClose={() => setAboutOpen(false)} />
    </>
  );
}
