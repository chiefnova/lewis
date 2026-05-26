import { useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";

import type { PublicEtcSummary } from "@lewis/shared/api/public";
import { formatEtcName } from "../data/etcs-content";

/**
 * Slice 4 § 16.1 — light-themed Mapbox map for the /etcs index (Round 4
 * Variant A: a quiet sidekick beside the list).
 *
 * Non-essential UI by design (directoryprd.md § 16.1 + slice-4 plan):
 *   - The public token is read from VITE_MAPBOX_PUBLIC_TOKEN (publicly
 *     exposed, origin-scoped on the Mapbox account; rotating it is safe).
 *   - mapbox-gl + its CSS are dynamically imported INSIDE this component so
 *     the ~120KB SDK only ships in the /etcs chunk, never the homepage budget.
 *   - If the token is absent, the SDK fails to load, or no ETC has
 *     coordinates, we render a calm static fallback instead of a broken/empty
 *     map. The list beside it is the accessible, always-functional path.
 */

const MAPBOX_TOKEN = (import.meta.env as Record<string, string | undefined>)
  .VITE_MAPBOX_PUBLIC_TOKEN;

export function EtcMap({ etcs }: { etcs: ReadonlyArray<PublicEtcSummary> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  const pinned = etcs.filter(
    (e): e is PublicEtcSummary & { lat: number; lng: number } => e.lat != null && e.lng != null,
  );

  const canRenderLive = Boolean(MAPBOX_TOKEN) && pinned.length > 0 && !failed;

  useEffect(() => {
    const first = pinned[0];
    if (!canRenderLive || !ref.current || !first) return;
    let cancelled = false;
    let map: { remove: () => void } | undefined;

    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
        if (cancelled || !ref.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN as string;
        const instance = new mapboxgl.Map({
          container: ref.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [first.lng, first.lat],
          zoom: pinned.length === 1 ? 11 : 6,
          attributionControl: true,
          cooperativeGestures: true, // don't hijack page scroll
        });
        instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map = instance;

        const bounds = new mapboxgl.LngLatBounds();
        for (const etc of pinned) {
          const popup = new mapboxgl.Popup({ offset: 24, closeButton: false }).setHTML(
            `<div class="etc-map__popup"><b>${escapeHtml(formatEtcName(etc.name))}</b>` +
              `<span>${escapeHtml(etc.city)} · ${etc.programCount} ${etc.programCount === 1 ? "program" : "programs"}</span>` +
              `<a href="/etcs/${encodeURIComponent(etc.slug)}">View profile →</a></div>`,
          );
          new mapboxgl.Marker({ color: "#2c4a6b" })
            .setLngLat([etc.lng, etc.lat])
            .setPopup(popup)
            .addTo(instance);
          bounds.extend([etc.lng, etc.lat]);
        }
        if (pinned.length > 1) instance.fitBounds(bounds, { padding: 56, maxZoom: 9 });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
    // pinned identity is stable per render set; depend on the slug list + flag.
  }, [canRenderLive, pinned.map((p) => p.slug).join(",")]);

  if (!canRenderLive) {
    return (
      <div className="etc-map etc-map--fallback" role="img" aria-label="Map of licensed centers">
        <span className="etc-map__pin" aria-hidden="true" />
        <div className="etc-map__fallback-body">
          {pinned.length > 0 ? (
            <>
              <p className="etc-map__fallback-loc">
                {pinned.map((p) => p.city).join(" · ")}, Montana
              </p>
              <p className="etc-map__fallback-note">
                <FormattedMessage
                  id="directory.etcs.map.fallback"
                  defaultMessage="Interactive map loads when available."
                />
              </p>
            </>
          ) : (
            <p className="etc-map__fallback-note">
              <FormattedMessage
                id="directory.etcs.map.empty"
                defaultMessage="Map appears as centers are added."
              />
            </p>
          )}
        </div>
      </div>
    );
  }

  return <div ref={ref} className="etc-map" aria-label="Map of licensed centers" />;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
