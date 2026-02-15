"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import ChatWindow from "./chat/ChatWindow";
import { MapLocation } from "./map/MapView";

const MapView = dynamic(() => import("./map/MapView"), { ssr: false });

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);

  const handleLocationSelect = (loc: MapLocation) => {
    setSelectedLocation(loc);
    console.log("Selected:", loc.name);
    // Future: Trigger chat or flyTo
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between relative bg-black overflow-hidden">
      {/* Map Container */}
      <div className="absolute inset-0 z-0">
        <MapView onLocationSelect={handleLocationSelect} />
      </div>

      {/* Branding Overlay */}
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h1 className="font-serif text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-linear-to-r from-teal-200 to-blue-500 tracking-tighter drop-shadow-lg">
          Sahyadri
        </h1>
        <p className="text-slate-400 text-sm md:text-base tracking-widest uppercase mt-1 font-light ml-1">
          Echoes of Maharashtra
        </p>
      </div>

      {/* Chat Interface */}
      <AnimatePresence mode="wait">
        {selectedLocation && (
          <div className="absolute bottom-8 right-8 z-500 pointer-events-auto">
            <ChatWindow location={selectedLocation} />
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
