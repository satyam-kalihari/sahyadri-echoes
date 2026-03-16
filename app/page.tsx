"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Languages, ChevronDown } from "lucide-react";
import ChatWindow from "./chat/ChatWindow";
import NearbyPlaces from "./chat/NearbyPlaces";
import { MapLocation } from "./map/MapView";

const MapView = dynamic(() => import("./map/MapView"), { ssr: false });

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "mr", label: "मराठी" },
  { code: "hi", label: "हिंदी" },
  { code: "gu", label: "ગુજરાતી" },
] as const;

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(
    null,
  );
  const [language, setLanguage] = useState<"en" | "mr" | "hi" | "gu">("en");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const handleLocationSelect = (loc: MapLocation) => {
    setSelectedLocation(loc);
  };

  const handleUserLocation = (coords: {
    latitude: number;
    longitude: number;
  }) => {
    setUserLocation(coords);
  };

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === language)?.label || "English";

  return (
    <main className="flex min-h-screen flex-col items-center justify-between relative bg-black overflow-hidden">
      {/* Map Container */}
      <div className="absolute inset-0 z-0">
        <MapView
          onLocationSelect={handleLocationSelect}
          userLocation={userLocation}
        />
      </div>

      {/* Branding Overlay */}
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h1 className="font-serif text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-linear-to-r from-teal-200 to-blue-500 tracking-tighter drop-shadow-lg">
          Bharat Yatri
        </h1>
        <p className="text-slate-400 text-sm md:text-base tracking-widest uppercase mt-1 font-light ml-1">
          Echoes of Maharashtra
        </p>
      </div>

      {/* Global Language Selector — Top Right */}
      <div className="absolute top-8 right-8 z-20 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-black/70 backdrop-blur-xl border border-white/10 hover:border-teal-500/40 rounded-2xl text-white transition-all shadow-2xl group"
          >
            <Languages className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-medium">{currentLangLabel}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 opacity-60 transition-transform ${isLangMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {isLangMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-36 bg-black/90 backdrop-blur-xl border border-white/10   overflow-hidden shadow-xl z-50 flex flex-col py-1"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/10 ${
                      language === lang.code
                        ? "text-teal-400 font-medium bg-teal-900/20"
                        : "text-slate-300"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* GPS Nearby Places — Bottom Left */}
      <div className="absolute bottom-8 left-8 z-10 pointer-events-auto flex flex-col items-start">
        <NearbyPlaces language={language} onUserLocation={handleUserLocation} />
      </div>

      {/* Chat Interface — Bottom Right */}
      <AnimatePresence mode="wait">
        {selectedLocation && (
          <div className="absolute bottom-8 right-8 z-50 pointer-events-auto">
            <ChatWindow
              location={selectedLocation}
              language={language}
              onClose={() => setSelectedLocation(null)}
            />
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
