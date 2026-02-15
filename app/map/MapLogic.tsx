"use client";

import { useMap } from "react-leaflet";
import { useEffect } from "react";
import { MapLocation } from "./MapView";

interface MapLogicProps {
    selectedLocation?: MapLocation;
}

export default function MapLogic({ selectedLocation }: MapLogicProps) {
    const map = useMap();

    useEffect(() => {
        if (selectedLocation) {
            map.flyTo([selectedLocation.latitude, selectedLocation.longitude], 10, {
                duration: 2
            });
        }
    }, [selectedLocation, map]);

    return null;
}
