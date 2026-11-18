"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export interface MapStop {
  lat: number;
  lng: number;
  label: string;
  order?: number;
  kind?: "stop" | "depot" | "cold";
}

export default function MapView({ stops, path = false, height = 280 }: { stops: MapStop[]; path?: boolean; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(stops);

  useEffect(() => {
    const el = ref.current;
    const points0 = JSON.parse(key) as MapStop[];
    if (!el || points0.length === 0) return;
    let disposed = false;
    let map: import("leaflet").Map | undefined;

    import("leaflet").then((L) => {
      if (disposed || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const points = points0.map((s) => [s.lat, s.lng] as [number, number]);
      if (path && points.length > 1) L.polyline(points, { color: "#235347", weight: 3, dashArray: "6 6" }).addTo(map);

      for (const s of points0) {
        const kind = s.kind ?? "stop";
        const icon = L.divIcon({
          className: "",
          html: `<span class="map-pin map-pin-${kind}">${kind === "depot" ? "D" : (s.order ?? "")}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(s.label.replace(/[<>&]/g, ""));
      }
      map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
    });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [key, path]);

  if (stops.length === 0) return null;
  return <div ref={ref} style={{ height }} className="z-0 w-full overflow-hidden rounded-2xl border border-line" role="img" aria-label="Mapa de entregas" />;
}
