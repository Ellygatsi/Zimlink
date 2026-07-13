import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

const STORAGE_KEY = "zimlink_location_prompt_dismissed";

/**
 * Captures the user's precise GPS location on request, saves it to the
 * backend (which takes priority over IP/phone-country signals for
 * proximity sorting), and exposes it for use in "closest to you" queries.
 *
 * Usage:
 *   const { location, status, requestLocation } = useUserLocation();
 *   ...fetch(`/api/marketplace/listings?lat=${location.lat}&lng=${location.lng}`)
 */
export function useUserLocation({ auto = false } = {}) {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | requesting | granted | denied | unsupported
  const [error, setError] = useState("");

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }

    setStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude, source: "gps" });
        setStatus("granted");

        try {
          await api.post("/users/location", { lat: latitude, lng: longitude });
        } catch {
          // Non-fatal — the coordinates are still usable client-side for
          // this session even if saving to the profile fails.
        }
      },
      (err) => {
        setStatus("denied");
        setError(err.message || "Location permission was denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }, []);

  const wasDismissed = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (auto) requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return { location, status, error, requestLocation, dismiss, wasDismissed };
}
