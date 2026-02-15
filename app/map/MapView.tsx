"use client";

import React, { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";

// Dynamic imports for Leaflet components
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
);

// We need a component that uses 'useMap' hook.
// Since 'useMap' is exported from react-leaflet, we can't import it at top level if it crashes SSR.
// However, hooks usually don't crash unless called.
// BUT 'react-leaflet' import might crash. 
// So we create a separate component file for the map logic that is client-side only.

// A valid workaround: Create a wrapper component that dynamic imports the *Logic* component
// which imports useMap.

const MapLogic = dynamic(() => import("./MapLogic"), { ssr: false });

export interface MapLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    description: string;
}

export const LOCATIONS: MapLocation[] = [
    {
        id: "mumbai",
        name: "Mumbai",
        latitude: 19.076,
        longitude: 72.8777,
        description: "The City of Dreams and gateway to India.",
    },
    {
        id: "pune",
        name: "Pune",
        latitude: 18.5204,
        longitude: 73.8567,
        description: "The Oxford of the East and cultural capital of Maharashtra.",
    },
    {
        id: "nashik",
        name: "Nashik",
        latitude: 19.9975,
        longitude: 73.7898,
        description: "The Wine Capital of India and a holy city.",
    },
    {
        id: "aurangabad",
        name: "Chhatrapati Sambhajinagar (Aurangabad)",
        latitude: 19.8762,
        longitude: 75.3433,
        description: "Gateway to the Ajanta and Ellora Caves.",
    },
    {
        id: "ajanta",
        name: "Ajanta Caves",
        latitude: 20.5519,
        longitude: 75.7033,
        description: "Ancient Buddhist rock-cut cave monuments.",
    },
    {
        id: "ellora",
        name: "Ellora Caves",
        latitude: 20.0268,
        longitude: 75.1771,
        description: "UNESCO World Heritage site featuring Hindu, Buddhist, and Jain monuments.",
    },
    {
        id: "nagpur",
        name: "Nagpur",
        latitude: 21.1458,
        longitude: 79.0882,
        description: "The Winter Capital and Orange City.",
    },
    {
        id: "kolhapur",
        name: "Kolhapur",
        latitude: 16.705,
        longitude: 74.2433,
        description: "Historical city known for its temples and cuisine.",
    },
    {
        id: "shaniwarwada",
        name: "Shaniwar Wada",
        latitude: 18.5196,
        longitude: 73.8553,
        description: "Historical fortification in the city of Pune.",
    },
    {
        id: "gateway",
        name: "Gateway of India",
        latitude: 18.922,
        longitude: 72.8347,
        description: "Arch-monument built in the 20th century in Mumbai.",
    }
];

interface MapViewProps {
    onLocationSelect?: (location: MapLocation) => void;
}

export default function MapView({ onLocationSelect }: MapViewProps) {
    // Center of Maharashtra approx
    const center: [number, number] = [19.7515, 75.7139];
    const [selectedLoc, setSelectedLoc] = useState<MapLocation | undefined>();
    const [isMounted, setIsMounted] = useState(false);
    const [L, setL] = useState<any>(null);

    useEffect(() => {
        setIsMounted(true);
        // Import Leaflet only on client to fix icons
        import("leaflet").then((leaflet) => {
            setL(leaflet.default);
            // Fix icons
            const DefaultIcon = leaflet.default.icon({
                iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
            });
            leaflet.default.Marker.prototype.options.icon = DefaultIcon;
        });
    }, []);

    const createCustomIcon = (name: string) => {
        if (!L) return undefined;
        const iconHtml = renderToStaticMarkup(
            <div className="relative group cursor-pointer flex flex-col items-center justify-center -translate-y-full">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <MapPin className="text-blue-400 w-8 h-8 drop-shadow-lg relative z-10" fill="currentColor" />
                </div>
                <span className="mt-1 text-xs font-serif text-white bg-black/80 px-2 py-1 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity absolute top-full whitespace-nowrap z-20">
                    {name}
                </span>
            </div>
        );

        return L.divIcon({
            html: iconHtml,
            className: "bg-transparent",
            iconSize: [40, 40],
            iconAnchor: [20, 40], // Center bottom
        });
    };

    if (!isMounted || !L) {
        return <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white">Loading Map...</div>;
    }

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={center}
                zoom={7}
                style={{ width: "100%", height: "100%", background: "#020617" }}
                zoomControl={false}
                attributionControl={false}
                // @ts-ignore
                maxBounds={[
                    [15.0, 72.0], // South-West
                    [22.5, 81.0]  // North-East
                ]}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {LOCATIONS.map((loc) => (
                    <Marker
                        key={loc.id}
                        position={[loc.latitude, loc.longitude]}
                        icon={createCustomIcon(loc.name)}
                        eventHandlers={{
                            click: () => {
                                setSelectedLoc(loc);
                                if (onLocationSelect) onLocationSelect(loc);
                            }
                        }}
                    >
                    </Marker>
                ))}

                <MapLogic selectedLocation={selectedLoc} />
            </MapContainer>

            {/* Cinematic Overlay Gradients */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/40 z-400" />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-900/10 to-transparent mix-blend-overlay z-400" />
        </div>
    );
}
