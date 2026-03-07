
"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPinned, Loader2, X, Volume2, VolumeX, Navigation } from "lucide-react";
import { useGeolocation } from "../hooks/useGeolocation";

// Strip markdown bold/italic formatting from LLM responses
function stripMarkdown(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/^#+\s*/gm, '')
        .replace(/__(.+?)__/g, '$1')
        .replace(/_(.+?)_/g, '$1');
}

interface NearbyPlacesProps {
    language: "en" | "mr" | "hi" | "gu";
    onUserLocation?: (coords: { latitude: number; longitude: number }) => void;
}

export default function NearbyPlaces({ language, onUserLocation }: NearbyPlacesProps) {
    const { latitude, longitude, error: geoError, isLocating, locate } = useGeolocation();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [placeName, setPlaceName] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const hasFetchedRef = useRef(false);

    // When GPS coordinates arrive, fetch nearby places
    useEffect(() => {
        if (latitude && longitude && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            onUserLocation?.({ latitude, longitude });
            fetchNearbyPlaces(latitude, longitude);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latitude, longitude]);

    // Show geo error
    useEffect(() => {
        if (geoError) {
            setError(geoError);
            setIsLoading(false);
        }
    }, [geoError]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const fetchNearbyPlaces = async (lat: number, lng: number) => {
        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const res = await fetch("/api/nearby", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ latitude: lat, longitude: lng, language }),
            });

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const data = await res.json();
            setResponse(data.content);
            setPlaceName(data.placeName || "Your area");
            setIsOpen(true);

            // Auto-play audio
            if (data.audio) {
                playAudio(data.audio);
            }
        } catch (err: any) {
            console.error("[NearbyPlaces] Error:", err);
            setError("Could not fetch nearby places. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const playAudio = (base64Audio: string) => {
        if (!base64Audio) return;
        try {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
            audioRef.current = audio;
            setIsPlaying(true);
            audio.onended = () => setIsPlaying(false);
            audio.play().catch((e) => {
                console.error("Audio playback error:", e);
                setIsPlaying(false);
            });
        } catch (e) {
            console.error("Failed to create audio element:", e);
            setIsPlaying(false);
        }
    };

    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch((e) => {
                        console.error("Audio resume failed:", e);
                    });
            }
        }
    };

    const handleLocateClick = () => {
        hasFetchedRef.current = false;
        setError(null);
        setResponse(null);
        locate();
    };

    const getButtonLabel = () => {
        if (isLocating || isLoading) {
            switch (language) {
                case "mr": return "शोधत आहे...";
                case "hi": return "खोज रहा है...";
                case "gu": return "શોધી રહ્યું છે...";
                default: return "Locating...";
            }
        }
        switch (language) {
            case "mr": return "जवळची ठिकाणे";
            case "hi": return "आस-पास के स्थान";
            case "gu": return "નજીકના સ્થળો";
            default: return "Nearby Places";
        }
    };

    return (
        <>
            {/* GPS Button */}
            <motion.button
                onClick={handleLocateClick}
                disabled={isLocating || isLoading}
                className="flex items-center gap-2.5 px-5 py-3 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl text-white hover:bg-white/10 hover:border-teal-500/40 transition-all shadow-2xl disabled:opacity-60 disabled:cursor-wait group"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
            >
                {isLocating || isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
                ) : (
                    <Navigation className="w-5 h-5 text-teal-400 group-hover:text-teal-300 transition-colors" />
                )}
                <span className="text-sm font-medium tracking-wide">{getButtonLabel()}</span>
            </motion.button>

            {/* Error Toast */}
            <AnimatePresence>
                {error && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="mt-3 px-4 py-2.5 bg-red-900/60 backdrop-blur-xl border border-red-500/30 rounded-xl text-red-200 text-xs max-w-sm"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results Panel */}
            <AnimatePresence>
                {isOpen && response && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="mt-3 w-full max-w-sm bg-black/75 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-2">
                                <MapPinned className="w-4 h-4 text-teal-400" />
                                <div>
                                    <h4 className="text-sm font-semibold text-white/90 font-serif">
                                        {language === "en" ? "Nearby Places" :
                                            language === "mr" ? "जवळची ठिकाणे" :
                                                language === "hi" ? "आस-पास के स्थान" :
                                                    "નજીકના સ્થળો"}
                                    </h4>
                                    <span className="text-[10px] text-teal-400/80 font-mono uppercase tracking-wider">
                                        {placeName}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={toggleAudio}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-teal-400 transition-colors"
                                >
                                    {isPlaying ?
                                        <Volume2 className="w-4 h-4" /> :
                                        <VolumeX className="w-4 h-4" />
                                    }
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-4 py-3 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
                            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                                {stripMarkdown(response)}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2.5 border-t border-white/5 bg-white/5">
                            <button
                                onClick={handleLocateClick}
                                disabled={isLocating || isLoading}
                                className="w-full text-center text-xs text-teal-400 hover:text-teal-300 font-medium py-1 transition-colors disabled:opacity-50"
                            >
                                {isLocating || isLoading ? (
                                    <span className="flex items-center justify-center gap-1.5">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        {language === "en" ? "Refreshing..." :
                                            language === "mr" ? "ताजे करत आहे..." :
                                                language === "hi" ? "ताज़ा कर रहा है..." :
                                                    "રિફ્રેશ કરી રહ્યું છે..."}
                                    </span>
                                ) : (
                                    language === "en" ? "↻ Refresh" :
                                        language === "mr" ? "↻ पुन्हा शोधा" :
                                            language === "hi" ? "↻ पुनः खोजें" :
                                                "↻ ફરીથી શોધો"
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
