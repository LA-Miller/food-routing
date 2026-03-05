"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons in Next.js (bundling changes asset paths)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

const driverIcon = L.divIcon({
  className: "driver-marker-icon",
  html: '<div style="width: 18px; height: 18px; border-radius: 9999px; background: #1d4ed8; border: 3px solid #ffffff; box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.35);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function getCenter(driver, stops) {
  if (driver?.lat != null && driver?.lng != null) return [driver.lat, driver.lng];
  if (stops && stops.length > 0) return [stops[0].lat, stops[0].lng];
  return [39.7684, -86.1581];
}

function getMetricsSourceLabel(metricsSource) {
  if (metricsSource === "road_network_osrm") return "Road network (OSRM)";
  return "Haversine fallback estimate";
}

function getPathSourceLabel(pathSource) {
  if (pathSource === "road_network_osrm") return "Road network (OSRM)";
  return "Straight-line fallback";
}

function kmToMiles(km) {
  return km * 0.621371;
}

function formatDistance(km, unit) {
  if (!Number.isFinite(km)) return "-";
  const value = unit === "mi" ? kmToMiles(km) : km;
  return value.toFixed(2);
}

export default function RouteMap() {
  const [scenarioId, setScenarioId] = useState("downtown_two_orders");
  const [algorithmId, setAlgorithmId] = useState("greedy_nearest");
  const [distanceUnit, setDistanceUnit] = useState("km");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");
        setData(null);

        const params = new URLSearchParams({
          scenario: scenarioId,
          algorithm: algorithmId,
        });

        const res = await fetch(`/api/demo-route?${params.toString()}`);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (!cancelled) {
          setData(json);

          if (json?.scenario?.id && json.scenario.id !== scenarioId) {
            setScenarioId(json.scenario.id);
          }

          if (json?.algorithm?.id && json.algorithm.id !== algorithmId) {
            setAlgorithmId(json.algorithm.id);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load route");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [scenarioId, algorithmId]);

  const driver = data?.driver ?? null;
  const plan = data?.plan ?? null;
  const stops = plan?.stops ?? [];
  const roadPath = plan?.roadPath ?? [];
  const scenarios = data?.availableScenarios ?? [];
  const algorithms = data?.availableAlgorithms ?? [];

  const polylinePositions =
    Array.isArray(roadPath) && roadPath.length >= 2
      ? roadPath
      : [
          ...(driver?.lat != null && driver?.lng != null ? [[driver.lat, driver.lng]] : []),
          ...stops.map((s) => [s.lat, s.lng]),
        ];

  const center = getCenter(driver, stops);
  const distanceUnitLabel = distanceUnit === "mi" ? "mi" : "km";

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <label htmlFor="scenario-select"><strong>Scenario:</strong></label>
        <select
          id="scenario-select"
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #bbb" }}
        >
          {scenarios.length > 0 ? (
            scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))
          ) : (
            <option value={scenarioId}>{scenarioId}</option>
          )}
        </select>

        <label htmlFor="algorithm-select"><strong>Algorithm:</strong></label>
        <select
          id="algorithm-select"
          value={algorithmId}
          onChange={(e) => setAlgorithmId(e.target.value)}
          style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #bbb" }}
        >
          {algorithms.length > 0 ? (
            algorithms.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))
          ) : (
            <option value={algorithmId}>{algorithmId}</option>
          )}
        </select>

        <label htmlFor="distance-unit-select"><strong>Distance Unit:</strong></label>
        <select
          id="distance-unit-select"
          value={distanceUnit}
          onChange={(e) => setDistanceUnit(e.target.value)}
          style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #bbb" }}
        >
          <option value="km">Kilometers (km)</option>
          <option value="mi">Miles (mi)</option>
        </select>
      </div>

      <div style={{ marginBottom: 12, fontSize: 13, opacity: 0.85 }}>
        {data?.scenario?.description && <div><strong>Scenario:</strong> {data.scenario.description}</div>}
        {data?.algorithm?.description && <div><strong>Algorithm:</strong> {data.algorithm.description}</div>}
      </div>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!data && !error && <p>Loading route...</p>}

      {data && (
        <>
          <div style={{ height: "65vh", width: "100%", borderRadius: 12, overflow: "hidden" }}>
            <MapContainer
              key={`${data?.scenario?.id ?? scenarioId}-${data?.algorithm?.id ?? algorithmId}`}
              center={center}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {polylinePositions.length >= 2 && <Polyline positions={polylinePositions} />}

              {driver && (
                <Marker position={[driver.lat, driver.lng]} icon={driverIcon}>
                  <Popup>
                    <div>
                      <strong>Driver Start</strong>
                      <div>ID: {driver.id}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

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

          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div><strong>Route Algorithm:</strong> {data.algorithm?.label ?? algorithmId}</div>
              <div><strong>Total {distanceUnitLabel}:</strong> {formatDistance(plan.totalKm, distanceUnit)}</div>
              <div><strong>ETA (min):</strong> {plan.etaMinutes}</div>
              <div><strong>Stops:</strong> {plan.stops.length}</div>
              <div><strong>Metric source:</strong> {getMetricsSourceLabel(plan.metricsSource)}</div>
              <div><strong>Path source:</strong> {getPathSourceLabel(plan.pathSource)}</div>
            </div>

            {plan.metricsSource === "road_network_osrm" && (
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
                Baseline Haversine estimate for comparison: {formatDistance(plan.baselineTotalKm, distanceUnit)} {distanceUnitLabel}, {plan.baselineEtaMinutes} min
              </div>
            )}

            <ol style={{ marginTop: 10 }}>
              {stops.map((s, idx) => (
                <li key={`${s.type}-${s.orderId}-list-${idx}`}>
                  {s.type} - {s.label}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
