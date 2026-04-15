"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import OngoingSimulationView from "./OngoingSimulationView";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

const PLAYBACK_SPEEDS = [
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 4, label: "4x" },
  { value: 10, label: "10x" },
  { value: 100, label: "100x" },
];

const defaultCenter = [39.7684, -86.1581];

const driverIcon = L.divIcon({
  className: "driver-marker-icon",
  html: '<div style="width: 18px; height: 18px; border-radius: 9999px; background: #1d4ed8; border: 3px solid #ffffff; box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.35);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const activeStopIcon = L.divIcon({
  className: "active-stop-marker-icon",
  html: '<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:#f59e0b;border:3px solid #fff;box-shadow:0 0 0 4px rgba(245, 158, 11, 0.28);font-size:11px;font-weight:700;color:#1c1917;">!</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const completedStopIcon = L.divIcon({
  className: "completed-stop-marker-icon",
  html: '<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:9999px;background:#16a34a;border:3px solid #fff;box-shadow:0 0 0 3px rgba(22, 163, 74, 0.18);font-size:9px;font-weight:700;color:#fff;">OK</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

function getCenter(driver, stops) {
  if (driver?.lat != null && driver?.lng != null) return [driver.lat, driver.lng];
  if (stops.length > 0) return [stops[0].lat, stops[0].lng];
  return defaultCenter;
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

function formatClockMinutes(value) {
  if (!Number.isFinite(value)) return "-";
  const wholeMinutes = Math.max(0, Math.round(value));
  const hours = Math.floor(wholeMinutes / 60);
  const minutes = wholeMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function getStopVerb(stopType) {
  if (stopType === "PICKUP") return "Pickup completed";
  return "Delivery completed";
}

function getStopTone(stopType) {
  if (stopType === "PICKUP") return "#b45309";
  return "#1d4ed8";
}

function buildStraightLinePath(driver, stops) {
  return [
    ...(driver?.lat != null && driver?.lng != null ? [[driver.lat, driver.lng]] : []),
    ...stops.map((stop) => [stop.lat, stop.lng]),
  ];
}

function buildProgressPath(driver, stops, roadPath, completedStopCount, totalKm, currentKm) {
  if (Array.isArray(roadPath) && roadPath.length >= 2) {
    if (completedStopCount < 0) return [roadPath[0]];

    const safeTotalKm = Number.isFinite(totalKm) && totalKm > 0 ? totalKm : 0;
    const safeCurrentKm = Number.isFinite(currentKm) ? Math.max(0, currentKm) : 0;
    const progress = safeTotalKm > 0 ? Math.min(1, safeCurrentKm / safeTotalKm) : 0;
    const pointCount = Math.max(2, Math.round(progress * (roadPath.length - 1)) + 1);
    return roadPath.slice(0, Math.min(roadPath.length, pointCount));
  }

  return buildStraightLinePath(
    driver,
    stops.slice(0, Math.max(0, Math.min(stops.length, completedStopCount + 1)))
  );
}

function buildPathSegments(pathPoints) {
  if (!Array.isArray(pathPoints) || pathPoints.length < 2) {
    return { totalKm: 0, cumulativeKm: [0] };
  }

  const cumulativeKm = [0];
  let totalKm = 0;

  for (let i = 1; i < pathPoints.length; i += 1) {
    const [prevLat, prevLng] = pathPoints[i - 1];
    const [nextLat, nextLng] = pathPoints[i];
    totalKm += haversineKm({ lat: prevLat, lng: prevLng }, { lat: nextLat, lng: nextLng });
    cumulativeKm.push(totalKm);
  }

  return { totalKm, cumulativeKm };
}

function interpolateAlongPath(pathPoints, targetKm) {
  if (!Array.isArray(pathPoints) || pathPoints.length === 0) return defaultCenter;
  if (pathPoints.length === 1) return pathPoints[0];

  const { totalKm, cumulativeKm } = buildPathSegments(pathPoints);
  if (totalKm <= 0) return pathPoints[0];

  const safeTargetKm = Math.min(Math.max(0, targetKm), totalKm);

  for (let i = 1; i < cumulativeKm.length; i += 1) {
    if (safeTargetKm <= cumulativeKm[i]) {
      const segmentStartKm = cumulativeKm[i - 1];
      const segmentEndKm = cumulativeKm[i];
      const segmentKm = segmentEndKm - segmentStartKm || 1;
      const ratio = (safeTargetKm - segmentStartKm) / segmentKm;
      const [startLat, startLng] = pathPoints[i - 1];
      const [endLat, endLng] = pathPoints[i];

      return [
        startLat + (endLat - startLat) * ratio,
        startLng + (endLng - startLng) * ratio,
      ];
    }
  }

  return pathPoints[pathPoints.length - 1];
}

function getCompletedStopCount(currentMinutes, timelineEvents, stopCount) {
  if (!timelineEvents.length) return 0;

  let completed = 0;

  for (const event of timelineEvents) {
    if (
      (event.kind === "PICKUP" || event.kind === "DROPOFF") &&
      event.etaMinutes <= currentMinutes
    ) {
      completed = Math.max(completed, event.stopIndex + 1);
    }
  }

  return Math.min(stopCount, completed);
}

function getActiveStopIndex(currentMinutes, timelineEvents, stopCount) {
  if (!timelineEvents.length || stopCount === 0) return -1;

  for (const event of timelineEvents) {
    if (
      (event.kind === "PICKUP" || event.kind === "DROPOFF") &&
      event.etaMinutes > currentMinutes
    ) {
      return event.stopIndex;
    }
  }

  return stopCount - 1;
}

function getCurrentEvent(currentMinutes, timelineEvents) {
  if (!timelineEvents.length) return null;

  let current = timelineEvents[0];

  for (const event of timelineEvents) {
    if (event.etaMinutes <= currentMinutes) current = event;
    else break;
  }

  return current;
}

function getNextEvent(currentMinutes, timelineEvents) {
  return timelineEvents.find((event) => event.etaMinutes > currentMinutes) ?? null;
}

function buildTimeline(driver, stops, totalKm, etaMinutes) {
  if (!driver) return [];

  const points = [driver, ...stops];
  const legDistances = [];
  let cumulativeKm = 0;

  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const legKm = haversineKm({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng });
    legDistances.push(legKm);
    cumulativeKm += legKm;
  }

  const routeKm = cumulativeKm || totalKm || 0;
  const routeEta = Number.isFinite(etaMinutes) ? etaMinutes : 0;

  const events = [
    {
      id: "route-start",
      kind: "START",
      title: "Driver ready",
      detail: `Driver ${driver.id} is staged at the route origin.`,
      etaMinutes: 0,
      totalKm: 0,
      stopIndex: -1,
      position: [driver.lat, driver.lng],
      orderId: null,
      accent: "#1d4ed8",
    },
  ];

  let runningKm = 0;

  for (let i = 0; i < stops.length; i += 1) {
    runningKm += legDistances[i] ?? 0;
    const stop = stops[i];
    const progress = routeKm > 0 ? runningKm / routeKm : 0;

    events.push({
      id: `stop-${stop.orderId}-${i}`,
      kind: stop.type,
      title: getStopVerb(stop.type),
      detail: `${stop.label} for order ${stop.orderId}.`,
      etaMinutes: routeEta * progress,
      totalKm: runningKm,
      stopIndex: i,
      position: [stop.lat, stop.lng],
      orderId: stop.orderId,
      accent: getStopTone(stop.type),
    });
  }

  events.push({
    id: "route-complete",
    kind: "COMPLETE",
    title: "Route complete",
    detail: `All ${stops.length} scheduled stops have been served.`,
    etaMinutes: routeEta,
    totalKm: Number.isFinite(totalKm) ? totalKm : runningKm,
    stopIndex: stops.length - 1,
    position: stops.length > 0 ? [stops[stops.length - 1].lat, stops[stops.length - 1].lng] : [driver.lat, driver.lng],
    orderId: null,
    accent: "#047857",
  });

  return events;
}

function getPlaybackSummary(currentEvent, events) {
  if (!currentEvent) return "Loading simulation state...";
  if (currentEvent.kind === "START") return "Ready to begin stepping through the route.";
  if (currentEvent.kind === "COMPLETE") return "Simulation finished. Reset or step backward to review.";
  return `Currently showing stop ${currentEvent.stopIndex + 1} of ${Math.max(0, events.length - 2)}.`;
}

export default function RouteMap() {
  const [scenarioId, setScenarioId] = useState("downtown_two_orders");
  const [algorithmId, setAlgorithmId] = useState("greedy_nearest");
  const [distanceUnit, setDistanceUnit] = useState("km");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulatedMinutes, setSimulatedMinutes] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");
        setData(null);
        setIsPlaying(false);
        setSimulatedMinutes(0);

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
  const isSimulationScenario = Boolean(data?.simulation) || scenarioId === "ongoing_dispatch_demo";
  const timelineEvents = buildTimeline(driver, stops, plan?.totalKm, plan?.etaMinutes);
  const routeDurationMinutes = Number.isFinite(plan?.etaMinutes) ? plan.etaMinutes : 0;

  useEffect(() => {
    setSimulatedMinutes(0);
    setIsPlaying(false);
  }, [scenarioId, algorithmId, data?.scenario?.id, data?.algorithm?.id]);

  useEffect(() => {
    if (!isPlaying || routeDurationMinutes <= 0) return undefined;
    if (simulatedMinutes >= routeDurationMinutes) {
      setIsPlaying(false);
      return undefined;
    }

    let lastTick = performance.now();
    let frameId = 0;

    function tick(now) {
      const deltaMs = now - lastTick;
      lastTick = now;

      setSimulatedMinutes((current) => {
        const next = current + (deltaMs / 1000) * (playbackSpeed / 60);
        if (next >= routeDurationMinutes) {
          setIsPlaying(false);
          return routeDurationMinutes;
        }
        return next;
      });

      frameId = window.requestAnimationFrame(tick);
    }

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, playbackSpeed, routeDurationMinutes, simulatedMinutes]);

  const clampedMinutes = Math.min(simulatedMinutes, routeDurationMinutes);
  const currentEvent = getCurrentEvent(clampedMinutes, timelineEvents);
  const nextEvent = getNextEvent(clampedMinutes, timelineEvents);
  const completedStopCount = getCompletedStopCount(clampedMinutes, timelineEvents, stops.length);
  const activeStopIndex = getActiveStopIndex(clampedMinutes, timelineEvents, stops.length);

  const mapPath =
    Array.isArray(roadPath) && roadPath.length >= 2
      ? roadPath
      : buildStraightLinePath(driver, stops);

  const progressPath = buildProgressPath(
    driver,
    stops,
    roadPath,
    completedStopCount - 1,
    plan?.totalKm,
    routeDurationMinutes > 0 ? (clampedMinutes / routeDurationMinutes) * (plan?.totalKm ?? 0) : 0
  );
  const currentDriverPosition = interpolateAlongPath(
    mapPath,
    routeDurationMinutes > 0 ? (clampedMinutes / routeDurationMinutes) * (plan?.totalKm ?? 0) : 0
  );

  const center = getCenter(driver, stops);
  const distanceUnitLabel = distanceUnit === "mi" ? "mi" : "km";
  const completedStops = Math.max(0, Math.min(stops.length, completedStopCount));
  const progressPercent =
    routeDurationMinutes > 0 ? Math.round((clampedMinutes / routeDurationMinutes) * 100) : 0;

  function stepBackward() {
    setIsPlaying(false);
    const currentIndex = timelineEvents.findIndex((event) => event.id === currentEvent?.id);
    const targetIndex = Math.max(0, currentIndex - 1);
    setSimulatedMinutes(timelineEvents[targetIndex]?.etaMinutes ?? 0);
  }

  function stepForward() {
    setIsPlaying(false);
    if (nextEvent) {
      setSimulatedMinutes(nextEvent.etaMinutes);
      return;
    }
    setSimulatedMinutes(routeDurationMinutes);
  }

  function resetPlayback() {
    setIsPlaying(false);
    setSimulatedMinutes(0);
  }

  function togglePlayback() {
    if (routeDurationMinutes <= 0) return;
    if (clampedMinutes >= routeDurationMinutes) {
      setSimulatedMinutes(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((current) => !current);
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          display: "grid",
          gap: 14,
          padding: 18,
          borderRadius: 24,
          background: "rgba(255,255,255,0.84)",
          border: "1px solid rgba(28,25,23,0.08)",
          boxShadow: "0 20px 60px rgba(70,52,24,0.08)",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label htmlFor="scenario-select"><strong>Scenario:</strong></label>
          <select
            id="scenario-select"
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #d6d3d1", background: "#fff" }}
          >
            {scenarios.length > 0 ? (
              scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
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
            disabled={isSimulationScenario}
            style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #d6d3d1", background: "#fff" }}
          >
            {algorithms.length > 0 ? (
              algorithms.map((algorithm) => (
                <option key={algorithm.id} value={algorithm.id}>
                  {algorithm.label}
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
            style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #d6d3d1", background: "#fff" }}
          >
            <option value="km">Kilometers (km)</option>
            <option value="mi">Miles (mi)</option>
          </select>
        </div>

        {isSimulationScenario && (
          <div style={{ fontSize: 13, color: "#7c2d12" }}>
            This scenario uses an availability + distance dispatch policy instead of the single-route algorithm selector.
          </div>
        )}

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
              Simulation Controls
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button
                type="button"
                onClick={togglePlayback}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 16px",
                  background: "#1c1917",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isPlaying ? "Pause" : clampedMinutes >= routeDurationMinutes ? "Replay" : "Play"}
              </button>
              <button
                type="button"
                onClick={stepBackward}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  border: "1px solid #d6d3d1",
                  background: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Step Back
              </button>
              <button
                type="button"
                onClick={stepForward}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  border: "1px solid #d6d3d1",
                  background: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Step Forward
              </button>
              <button
                type="button"
                onClick={resetPlayback}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  border: "1px solid #d6d3d1",
                  background: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
              Playback Speed
            </div>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              style={{ marginTop: 10, width: "100%", padding: "10px 12px", borderRadius: 14, border: "1px solid #d6d3d1", background: "#fff" }}
            >
              {PLAYBACK_SPEEDS.map((speed) => (
                <option key={speed.label} value={speed.value}>
                  {speed.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
              Live Event
            </div>
            <div style={{ marginTop: 10, fontWeight: 700, color: currentEvent?.accent ?? "#1c1917" }}>
              {currentEvent?.title ?? "Loading..."}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, color: "#57534e" }}>
              {currentEvent?.detail ?? "Waiting for route data."}
            </div>
          </div>
        </div>
      </section>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!data && !error && <p>Loading route...</p>}
      {data?.simulation && (
        <OngoingSimulationView
          key={`${data.scenario?.id ?? scenarioId}-${data.simulation.durationMinutes ?? 0}`}
          simulation={data.simulation}
          distanceUnit={distanceUnit}
        />
      )}

      {data && !data.simulation && (
        <>
          <section
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              alignItems: "start",
            }}
          >
            <div style={{ borderRadius: 24, overflow: "hidden", minHeight: "65vh", boxShadow: "0 20px 60px rgba(70,52,24,0.08)" }}>
              <MapContainer
                key={`${data?.scenario?.id ?? scenarioId}-${data?.algorithm?.id ?? algorithmId}`}
                center={center}
                zoom={13}
                style={{ height: "65vh", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {mapPath.length >= 2 && (
                  <Polyline positions={mapPath} pathOptions={{ color: "#94a3b8", weight: 5, opacity: 0.55 }} />
                )}

                {progressPath.length >= 2 && (
                  <Polyline positions={progressPath} pathOptions={{ color: "#f59e0b", weight: 6, opacity: 0.95 }} />
                )}

                {driver && (
                  <Marker position={currentDriverPosition} icon={driverIcon}>
                    <Popup>
                      <div>
                        <strong>Driver Position</strong>
                        <div>ID: {driver.id}</div>
                        <div>Simulated time: {formatClockMinutes(clampedMinutes)}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {stops.map((stop, index) => {
                  let icon = undefined;
                  if (index === activeStopIndex) icon = activeStopIcon;
                  else if (index < completedStopCount) icon = completedStopIcon;

                  return (
                    <Marker
                      key={`${stop.type}-${stop.orderId}-${index}`}
                      position={[stop.lat, stop.lng]}
                      {...(icon ? { icon } : {})}
                    >
                      <Popup>
                        <div>
                          <strong>
                            {index + 1}. {stop.type}
                          </strong>
                          <div>{stop.label}</div>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>Order: {stop.orderId}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            <aside
              style={{
                display: "grid",
                gap: 14,
                padding: 18,
                borderRadius: 24,
                background: "rgba(255,255,255,0.84)",
                border: "1px solid rgba(28,25,23,0.08)",
                boxShadow: "0 20px 60px rgba(70,52,24,0.08)",
              }}
            >
              <div>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                  Simulation Progress
                </div>
                <div
                  style={{
                    marginTop: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "#e7e5e4",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #f59e0b, #d97706)",
                    }}
                  />
                </div>
                <div style={{ marginTop: 10, fontSize: 14, color: "#57534e" }}>
                  {getPlaybackSummary(currentEvent, timelineEvents)}
                </div>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                    Completed Stops
                  </div>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 700 }}>{completedStops}/{stops.length}</div>
                </div>
                <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                    Simulated Time
                  </div>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 700 }}>
                    {formatClockMinutes(clampedMinutes)}
                  </div>
                </div>
                <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                    Distance Covered
                  </div>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 700 }}>
                    {formatDistance(routeDurationMinutes > 0 ? (clampedMinutes / routeDurationMinutes) * (plan?.totalKm ?? 0) : 0, distanceUnit)} {distanceUnitLabel}
                  </div>
                </div>
                <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                    Current Stage
                  </div>
                  <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{currentEvent?.kind ?? "-"}</div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8, fontSize: 14, color: "#44403c" }}>
                {data?.scenario?.description && <div><strong>Scenario:</strong> {data.scenario.description}</div>}
                {data?.algorithm?.description && <div><strong>Algorithm:</strong> {data.algorithm.description}</div>}
                <div><strong>Total {distanceUnitLabel}:</strong> {formatDistance(plan.totalKm, distanceUnit)}</div>
                <div><strong>ETA (min):</strong> {plan.etaMinutes}</div>
                <div><strong>Metric source:</strong> {getMetricsSourceLabel(plan.metricsSource)}</div>
                <div><strong>Path source:</strong> {getPathSourceLabel(plan.pathSource)}</div>
              </div>

              {plan.metricsSource === "road_network_osrm" && (
                <div style={{ borderRadius: 18, background: "#fff7ed", padding: 14, fontSize: 13, color: "#7c2d12" }}>
                  Baseline Haversine comparison: {formatDistance(plan.baselineTotalKm, distanceUnit)} {distanceUnitLabel}, {plan.baselineEtaMinutes} min
                </div>
              )}
            </aside>
          </section>

          <section
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              alignItems: "start",
            }}
          >
            <div
              style={{
                padding: 18,
                borderRadius: 24,
                background: "rgba(255,255,255,0.84)",
                border: "1px solid rgba(28,25,23,0.08)",
                boxShadow: "0 20px 60px rgba(70,52,24,0.08)",
              }}
            >
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                Event Timeline
              </div>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {timelineEvents.map((event, index) => {
                  const isCurrent = currentEvent?.id === event.id;
                  const isComplete = event.etaMinutes < clampedMinutes;
                  const eventStateColor = isCurrent ? event.accent : isComplete ? "#16a34a" : "#d6d3d1";

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setSimulatedMinutes(event.etaMinutes);
                      }}
                      style={{
                        textAlign: "left",
                        borderRadius: 18,
                        border:
                          currentEvent?.id === event.id
                            ? `1px solid ${event.accent}`
                            : "1px solid #e7e5e4",
                        background:
                          currentEvent?.id === event.id ? "rgba(255,247,237,0.9)" : "#fff",
                        padding: 14,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: eventStateColor,
                              display: "inline-block",
                            }}
                          />
                          <strong style={{ color: "#1c1917" }}>{event.title}</strong>
                        </div>
                        <span style={{ fontSize: 12, color: "#78716c" }}>{formatClockMinutes(event.etaMinutes)}</span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "#57534e" }}>
                        {event.detail}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 24,
                background: "rgba(255,255,255,0.84)",
                border: "1px solid rgba(28,25,23,0.08)",
                boxShadow: "0 20px 60px rgba(70,52,24,0.08)",
              }}
            >
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                Stop Order
              </div>
              <ol style={{ marginTop: 14, paddingLeft: 20, display: "grid", gap: 10 }}>
                {stops.map((stop, index) => (
                  <li key={`${stop.type}-${stop.orderId}-list-${index}`} style={{ color: "#44403c", lineHeight: 1.5 }}>
                    <strong>{stop.type}</strong> - {stop.label}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
