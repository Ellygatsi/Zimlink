import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

const STORAGE_KEY = "zimlink_location_prompt_dismissed";

/**
 * Gets the user's GPS location and sends it to the backend.
 * The backend will reverse-geocode it into:
 * country, state, city, currency and timezone.
 */
export function useUserLocation({ auto = false } = {}) {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | requesting | granted | denied | unsupported
  const [error, setError] = useState("");

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      setError("Location services are not supported by this browser.");
      return;
    }

    setStatus("requesting");
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || "";

        const localLocation = {
          lat: latitude,
          lng: longitude,
          timezone,
          source: "gps",
        };

        setLocation(localLocation);

        try {
          const { data } = await api.post("/users/location", {
            lat: latitude,
            lng: longitude,
            timezone,
          });

          if (data.location) {
            setLocation(data.location);
          }

          setStatus("granted");
        } catch (err) {
          console.error(err);

          setStatus("granted");

          setError(
            "Location detected but could not be saved to your account."
          );
        }
      },
      (err) => {
        setStatus("denied");

        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied.");
            break;

          case err.POSITION_UNAVAILABLE:
            setError("Location unavailable.");
            break;

          case err.TIMEOUT:
            setError("Location request timed out.");
            break;

          default:
            setError(err.message || "Could not determine location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }, []);

  const wasDismissed = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (auto) {
      requestLocation();
    }
  }, [auto, requestLocation]);

  return {
    location,
    status,
    error,
    requestLocation,
    dismiss,
    wasDismissed,
  };
}