import { useEffect, useState } from "react";
import { MapPin, X } from "@phosphor-icons/react";
import { useUserLocation } from "@/hooks/useUserLocation";

/**
 * Drop this near the top of Marketplace, Jobs, or Events pages to let the
 * user opt in to precise GPS location. Falls back silently to IP/phone
 * country sorting if they dismiss it or their browser denies permission —
 * so it never blocks the page from being useful.
 *
 * Usage:
 *   const { location, requestLocation } = useUserLocation();
 *   <LocationPrompt status={status} onShare={requestLocation} />
 */
export default function LocationPrompt({ status, onShare }) {
  const [dismissed, setDismissed] = useState(false);
  const { wasDismissed, dismiss } = useUserLocation();

  useEffect(() => {
    setDismissed(wasDismissed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed || status === "granted" || status === "unsupported") {
    return null;
  }

  const handleDismiss = () => {
    dismiss();
    setDismissed(true);
  };

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
      data-testid="location-prompt-banner"
    >
      <MapPin size={20} weight="fill" className="text-green-600 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black dark:text-white">
          Show results closest to you
        </p>
        <p className="text-xs text-neutral-500">
          Share your location to see nearby listings and events first.
        </p>
      </div>

      <button
        type="button"
        onClick={onShare}
        disabled={status === "requesting"}
        className="shrink-0 h-9 px-3 rounded-lg bg-green-600 text-black text-sm font-medium disabled:opacity-50"
      >
        {status === "requesting" ? "Requesting…" : "Share location"}
      </button>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-neutral-400 hover:text-neutral-600"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  );
}
