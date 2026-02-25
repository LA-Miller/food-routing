"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons in Next.js (bundling changes asset paths)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

/**
 * Small helper to compute a reasonable map center.
 * If we have stops, center on the first one; otherwise fallback to Indianapolis.
 */
function getCenter(stops) {
  if (stops && stops.length > 0) return [stops[0].lat, stops[0].lng];
  return [39.7684, -86.1581];
}

export default function RouteMap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");
        const res = await fetch("/api/demo-route");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load route");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stops = data?.plan?.stops ?? [];
  const polylinePositions = useMemo(
    () => stops.map((s) => [s.lat, s.lng]),
    [stops]
  );

  const center = useMemo(() => getCenter(stops), [stops]);

  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;
  if (!data) return <p>Loading route…</p>;

  return (
    <div>
      <div style={{ height: "65vh", width: "100%", borderRadius: 12, overflow: "hidden" }}>
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Draw the route line in the order of stops */}
          {polylinePositions.length >= 2 && <Polyline positions={polylinePositions} />}

          {/* Stop markers */}
          {stops.map((s, idx) => (
            <Marker key={`${s.type}-${s.orderId}-${idx}`} position={[s.lat, s.lng]}>
              <Popup>
                <div>
                  <strong>
                    {idx + 1}. {s.type}
                  </strong>
                  <div>{s.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Order: {s.orderId}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Quick “cool” readout for the checkup */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div><strong>Total km:</strong> {data.plan.totalKm}</div>
          <div><strong>ETA (min):</strong> {data.plan.etaMinutes}</div>
          <div><strong>Stops:</strong> {data.plan.stops.length}</div>
        </div>

        <ol style={{ marginTop: 10 }}>
          {stops.map((s, idx) => (
            <li key={`${s.type}-${s.orderId}-list-${idx}`}>
              {s.type} — {s.label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}