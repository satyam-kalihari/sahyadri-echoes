"use client";

import { useState, useCallback } from "react";

interface GeolocationState {
    latitude: number | null;
    longitude: number | null;
    error: string | null;
    isLocating: boolean;
}

export function useGeolocation() {
    const [state, setState] = useState<GeolocationState>({
        latitude: null,
        longitude: null,
        error: null,
        isLocating: false,
    });

    const locate = useCallback(() => {
        if (!navigator.geolocation) {
            setState((prev) => ({
                ...prev,
                error: "Geolocation is not supported by your browser.",
                isLocating: false,
            }));
            return;
        }

        setState((prev) => ({ ...prev, isLocating: true, error: null }));

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setState({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    error: null,
                    isLocating: false,
                });
            },
            (err) => {
                let message = "Unable to retrieve your location.";
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        message = "Location permission denied. Please allow location access.";
                        break;
                    case err.POSITION_UNAVAILABLE:
                        message = "Location information is unavailable.";
                        break;
                    case err.TIMEOUT:
                        message = "Location request timed out.";
                        break;
                }
                setState((prev) => ({
                    ...prev,
                    error: message,
                    isLocating: false,
                }));
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000, // cache for 1 minute
            }
        );
    }, []);

    return {
        ...state,
        locate,
    };
}
