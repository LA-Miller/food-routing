"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

const PLAYBACK_SPEEDS = [
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 10, label: "10x" },
  { value: 100, label: "100x" },
];

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

function kmToMiles(km) {
  return km * 0.621371;
}

function formatDistance(km, unit) {
  if (!Number.isFinite(km)) return "-";
  const value = unit === "mi" ? kmToMiles(km) : km;
  return value.toFixed(2);
}

function formatMinutes(value) {
  if (!Number.isFinite(value)) return "-";
  const rounded = Math.max(0, Math.round(value));
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function buildPathSegments(path) {
  if (!Array.isArray(path) || path.length < 2) return { totalKm: 0, cumulativeKm: [0] };

  const cumulativeKm = [0];
  let totalKm = 0;

  for (let i = 1; i < path.length; i += 1) {
    const [prevLat, prevLng] = path[i - 1];
    const [nextLat, nextLng] = path[i];
    totalKm += haversineKm({ lat: prevLat, lng: prevLng }, { lat: nextLat, lng: nextLng });
    cumulativeKm.push(totalKm);
  }

  return { totalKm, cumulativeKm };
}

function interpolateAlongPath(path, ratio) {
  if (!Array.isArray(path) || path.length === 0) return [39.7684, -86.1581];
  if (path.length === 1) return path[0];

  const { totalKm, cumulativeKm } = buildPathSegments(path);
  if (totalKm <= 0) return path[0];

  const targetKm = Math.min(Math.max(0, ratio), 1) * totalKm;

  for (let i = 1; i < cumulativeKm.length; i += 1) {
    if (targetKm <= cumulativeKm[i]) {
      const segmentStartKm = cumulativeKm[i - 1];
      const segmentEndKm = cumulativeKm[i];
      const segmentKm = segmentEndKm - segmentStartKm || 1;
      const segmentRatio = (targetKm - segmentStartKm) / segmentKm;
      const [startLat, startLng] = path[i - 1];
      const [endLat, endLng] = path[i];

      return [
        startLat + (endLat - startLat) * segmentRatio,
        startLng + (endLng - startLng) * segmentRatio,
      ];
    }
  }

  return path[path.length - 1];
}

function getCurrentEvent(simulatedMinutes, events) {
  let current = events[0] ?? null;
  for (const event of events) {
    if (event.minute <= simulatedMinutes) current = event;
    else break;
  }
  return current;
}

function getNextEvent(simulatedMinutes, events) {
  return events.find((event) => event.minute > simulatedMinutes) ?? null;
}

function getDriverPlayback(driver, simulatedMinutes) {
  const segments = driver.segments ?? [];
  const firstSegment = segments[0] ?? null;
  const lastSegment = segments[segments.length - 1] ?? null;

  if (!firstSegment || simulatedMinutes <= firstSegment.startMinute) {
    return {
      position: [driver.startLat, driver.startLng],
      completedPaths: [],
      activePath: [],
      busy: false,
    };
  }

  const completedSegments = segments.filter((segment) => segment.endMinute <= simulatedMinutes);
  const activeSegment =
    segments.find(
      (segment) =>
        segment.startMinute <= simulatedMinutes && simulatedMinutes < segment.endMinute
    ) ?? null;

  if (activeSegment) {
    const duration = activeSegment.endMinute - activeSegment.startMinute || 1;
    const ratio = (simulatedMinutes - activeSegment.startMinute) / duration;
    const pointCount = Math.max(2, Math.round((activeSegment.path.length - 1) * ratio) + 1);

    return {
      position: interpolateAlongPath(activeSegment.path, ratio),
      completedPaths: completedSegments.map((segment) => segment.path),
      activePath: activeSegment.path.slice(0, Math.min(activeSegment.path.length, pointCount)),
      busy: true,
    };
  }

  return {
    position: lastSegment ? [lastSegment.to.lat, lastSegment.to.lng] : [driver.startLat, driver.startLng],
    completedPaths: segments.map((segment) => segment.path),
    activePath: [],
    busy: false,
  };
}

function getOrderStatus(order, simulatedMinutes) {
  if (simulatedMinutes < order.createdMinute) return "hidden";
  if (simulatedMinutes < order.pickupMinute) return "waiting";
  if (simulatedMinutes < order.dropoffMinute) return "in_transit";
  return "completed";
}

function createDriverIcon(color, label) {
  return L.divIcon({
    className: "simulation-driver-icon",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:12px;background:${color};border:4px solid #ffffff;box-shadow:0 0 0 4px rgba(28,25,23,0.18), 0 10px 18px rgba(28,25,23,0.26);font-size:11px;font-weight:800;color:#ffffff;">${label}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function getOrderNumber(orderId) {
  const digits = String(orderId).replace(/\D/g, "");
  return digits || orderId;
}

function createOrderIcon(label, status) {
  const palette = {
    waiting: { bg: "#f59e0b", text: "#1c1917" },
    in_transit: { bg: "#2563eb", text: "#ffffff" },
    completed: { bg: "#16a34a", text: "#ffffff" },
    hidden: { bg: "#d6d3d1", text: "#57534e" },
  };

  const { bg, text } = palette[status] ?? palette.hidden;

  return L.divIcon({
    className: "simulation-order-icon",
    html: `<div style="display:flex;align-items:center;justify-content:center;min-width:28px;height:20px;padding:0 6px;border-radius:9999px;background:${bg};border:2px solid #ffffff;box-shadow:0 0 0 1px rgba(28,25,23,0.10);font-size:9px;font-weight:800;color:${text};letter-spacing:0.02em;">${label}</div>`,
    iconSize: [32, 20],
    iconAnchor: [16, 10],
  });
}

export default function OngoingSimulationView({ simulation, distanceUnit }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(10);
  const [simulatedMinutes, setSimulatedMinutes] = useState(0);
  const isPlayingRef = useRef(false);

  const durationMinutes = simulation?.durationMinutes ?? 0;
  const events = simulation?.events ?? [];
  const drivers = simulation?.drivers ?? [];
  const orders = simulation?.orders ?? [];
  const clampedMinutes = Math.min(simulatedMinutes, durationMinutes);
  const currentEvent = getCurrentEvent(clampedMinutes, events);
  const nextEvent = getNextEvent(clampedMinutes, events);

  useEffect(() => {
    if (!isPlaying || durationMinutes <= 0) return undefined;

    let lastTick = performance.now();
    let frameId = 0;

    function tick(now) {
      if (!isPlayingRef.current) return;

      const deltaMs = now - lastTick;
      lastTick = now;

      setSimulatedMinutes((current) => {
        const next = current + (deltaMs / 1000) * (playbackSpeed / 60);
        if (next >= durationMinutes) {
          isPlayingRef.current = false;
          setIsPlaying(false);
          return durationMinutes;
        }
        return next;
      });

      if (isPlayingRef.current) {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, playbackSpeed, durationMinutes]);

  const driverStates = drivers.map((driver) => ({
    ...driver,
    playback: getDriverPlayback(driver, clampedMinutes),
  }));

  const waitingOrders = orders.filter(
    (order) => clampedMinutes >= order.createdMinute && clampedMinutes < order.pickupMinute
  ).length;
  const activeOrders = orders.filter(
    (order) => clampedMinutes >= order.pickupMinute && clampedMinutes < order.dropoffMinute
  ).length;
  const completedOrders = orders.filter((order) => clampedMinutes >= order.dropoffMinute).length;
  const busyDrivers = driverStates.filter((driver) => driver.playback.busy).length;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  function togglePlayback() {
    if (durationMinutes <= 0) return;
    if (clampedMinutes >= durationMinutes) {
      setSimulatedMinutes(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((current) => !current);
  }

  function stepForward() {
    setIsPlaying(false);
    if (nextEvent) {
      setSimulatedMinutes(nextEvent.minute);
      return;
    }
    setSimulatedMinutes(durationMinutes);
  }

  function stepBackward() {
    setIsPlaying(false);
    const previousEvent = [...events].reverse().find((event) => event.minute < clampedMinutes);
    setSimulatedMinutes(previousEvent?.minute ?? 0);
  }

  function resetSimulation() {
    setIsPlaying(false);
    setSimulatedMinutes(0);
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
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
              Dispatch Controls
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button type="button" onClick={togglePlayback} style={{ border: "none", borderRadius: 999, padding: "10px 16px", background: "#1c1917", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {isPlaying ? "Pause" : clampedMinutes >= durationMinutes ? "Replay" : "Play"}
              </button>
              <button type="button" onClick={stepBackward} style={{ borderRadius: 999, padding: "10px 14px", border: "1px solid #d6d3d1", background: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Step Back
              </button>
              <button type="button" onClick={stepForward} style={{ borderRadius: 999, padding: "10px 14px", border: "1px solid #d6d3d1", background: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Step Forward
              </button>
              <button type="button" onClick={resetSimulation} style={{ borderRadius: 999, padding: "10px 14px", border: "1px solid #d6d3d1", background: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Reset
              </button>
            </div>
          </div>

          <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
              Playback Speed
            </div>
            <select value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))} style={{ marginTop: 10, width: "100%", padding: "10px 12px", borderRadius: 14, border: "1px solid #d6d3d1", background: "#fff" }}>
              {PLAYBACK_SPEEDS.map((speed) => (
                <option key={speed.label} value={speed.value}>
                  {speed.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
              Current Event
            </div>
            <div style={{ marginTop: 10, fontWeight: 700 }}>{currentEvent?.title ?? "Waiting for simulation"}</div>
            <div style={{ marginTop: 6, fontSize: 14, color: "#57534e", lineHeight: 1.5 }}>
              {currentEvent?.detail ?? "No events yet."}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            padding: "12px 14px",
            borderRadius: 18,
            background: "#faf7f2",
          }}
        >
          <strong style={{ fontSize: 13, color: "#7c2d12" }}>Legend</strong>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#57534e" }}>
            <span style={{ width: 18, height: 18, borderRadius: 6, background: "#1d4ed8", border: "2px solid #fff", boxShadow: "0 0 0 2px rgba(28,25,23,0.14)" }} />
            Driver
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#57534e" }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, background: "#f59e0b", border: "2px solid #fff" }} />
            Waiting pickup
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#57534e" }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, background: "#2563eb", border: "2px solid #fff" }} />
            In-transit order
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#57534e" }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, background: "#16a34a", border: "2px solid #fff" }} />
            Completed order
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#57534e" }}>
            <span style={{ width: 22, height: 4, borderRadius: 999, background: "#1d4ed8", display: "inline-block" }} />
            Driver route trail
          </span>
        </div>
      </section>

      <section style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "start" }}>
        <div style={{ borderRadius: 24, overflow: "hidden", minHeight: "70vh", boxShadow: "0 20px 60px rgba(70,52,24,0.08)" }}>
          <MapContainer center={[39.7684, -86.1581]} zoom={13} style={{ height: "70vh", width: "100%" }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {driverStates.map((driver) =>
              driver.segments.map((segment, index) => (
                <Polyline key={`${driver.id}-full-${segment.orderId}-${index}`} positions={segment.path} pathOptions={{ color: driver.color, weight: 4, opacity: 0.18 }} />
              ))
            )}

            {driverStates.map((driver) =>
              driver.playback.completedPaths.map((path, index) => (
                <Polyline key={`${driver.id}-done-${index}`} positions={path} pathOptions={{ color: driver.color, weight: 5, opacity: 0.75 }} />
              ))
            )}

            {driverStates.map((driver) =>
              driver.playback.activePath.length >= 2 ? (
                <Polyline key={`${driver.id}-active`} positions={driver.playback.activePath} pathOptions={{ color: driver.color, weight: 6, opacity: 1 }} />
              ) : null
            )}

            {orders.map((order) => {
              const status = getOrderStatus(order, clampedMinutes);
              if (status === "hidden") return null;
              const orderNumber = getOrderNumber(order.id);

              return (
                <Marker
                  key={`${order.id}-pickup`}
                  position={[order.restaurant.lat, order.restaurant.lng]}
                  icon={
                    status === "completed"
                      ? createOrderIcon(`${orderNumber}P`, "completed")
                      : status === "in_transit"
                        ? createOrderIcon(`${orderNumber}P`, "in_transit")
                        : createOrderIcon(`${orderNumber}P`, "waiting")
                  }
                >
                  <Popup>
                    <div>
                      <strong>{order.restaurantName}</strong>
                      <div>Order: {order.id}</div>
                      <div>Status: {status.replace("_", " ")}</div>
                      <div>Assigned Driver: {order.assignedDriverId}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {orders.map((order) => {
              const status = getOrderStatus(order, clampedMinutes);
              if (status === "hidden") return null;
              const orderNumber = getOrderNumber(order.id);

              return (
                <Marker
                  key={`${order.id}-dropoff`}
                  position={[order.customer.lat, order.customer.lng]}
                  icon={
                    status === "completed"
                      ? createOrderIcon(`${orderNumber}D`, "completed")
                      : status === "in_transit"
                        ? createOrderIcon(`${orderNumber}D`, "in_transit")
                        : createOrderIcon(`${orderNumber}D`, "waiting")
                  }
                >
                  <Popup>
                    <div>
                      <strong>{order.customerName}</strong>
                      <div>Order: {order.id}</div>
                      <div>Status: {status.replace("_", " ")}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {driverStates.map((driver) => (
              <Marker
                key={driver.id}
                position={driver.playback.position}
                icon={createDriverIcon(driver.color, driver.id.replace("d", ""))}
              >
                <Popup>
                  <div>
                    <strong>{driver.id}</strong>
                    <div>Deliveries: {driver.deliveriesCompleted}</div>
                    <div>Total distance: {formatDistance(driver.totalKm, distanceUnit)} {distanceUnit}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <aside style={{ display: "grid", gap: 14, padding: 18, borderRadius: 24, background: "rgba(255,255,255,0.84)", border: "1px solid rgba(28,25,23,0.08)", boxShadow: "0 20px 60px rgba(70,52,24,0.08)" }}>
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
              Simulation Snapshot
            </div>
            <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700 }}>
              {formatMinutes(clampedMinutes)} / {formatMinutes(durationMinutes)}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                Waiting Orders
              </div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{waitingOrders}</div>
            </div>
            <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                Active Orders
              </div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{activeOrders}</div>
            </div>
            <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                Completed
              </div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{completedOrders}</div>
            </div>
            <div style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
                Busy Drivers
              </div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{busyDrivers}</div>
            </div>
          </div>

          <div style={{ borderRadius: 18, background: "#fff7ed", padding: 14, color: "#7c2d12", fontSize: 14, lineHeight: 1.6 }}>
            <strong>{simulation.assignmentPolicy.label}</strong>
            <div style={{ marginTop: 6 }}>{simulation.assignmentPolicy.description}</div>
          </div>
        </aside>
      </section>

      <section style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "start" }}>
        <div style={{ padding: 18, borderRadius: 24, background: "rgba(255,255,255,0.84)", border: "1px solid rgba(28,25,23,0.08)", boxShadow: "0 20px 60px rgba(70,52,24,0.08)" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
            Event Timeline
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 10, maxHeight: 420, overflowY: "auto" }}>
            {events.map((event) => {
              const isCurrent = currentEvent?.id === event.id;
              const isPast = event.minute < clampedMinutes;
              const dotColor = isCurrent ? "#d97706" : isPast ? "#16a34a" : "#d6d3d1";

              return (
                <button key={event.id} type="button" onClick={() => { setIsPlaying(false); setSimulatedMinutes(event.minute); }} style={{ textAlign: "left", borderRadius: 18, border: isCurrent ? "1px solid #d97706" : "1px solid #e7e5e4", background: isCurrent ? "#fff7ed" : "#fff", padding: 14, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: dotColor, display: "inline-block" }} />
                      <strong>{event.title}</strong>
                    </div>
                    <span style={{ fontSize: 12, color: "#78716c" }}>{formatMinutes(event.minute)}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "#57534e" }}>
                    {event.detail}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: 18, borderRadius: 24, background: "rgba(255,255,255,0.84)", border: "1px solid rgba(28,25,23,0.08)", boxShadow: "0 20px 60px rgba(70,52,24,0.08)" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a16207" }}>
            Incoming Orders
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {orders.map((order) => {
              const status = getOrderStatus(order, clampedMinutes);
              return (
                <div key={order.id} style={{ borderRadius: 18, background: "#faf7f2", padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{order.id}</strong>
                    <span style={{ textTransform: "capitalize", color: "#57534e" }}>{status.replace("_", " ")}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, color: "#57534e", lineHeight: 1.6 }}>
                    <div><strong>Created:</strong> {formatMinutes(order.createdMinute)}</div>
                    <div><strong>Driver:</strong> {order.assignedDriverId}</div>
                    <div><strong>Pickup:</strong> {order.restaurantName}</div>
                    <div><strong>Dropoff ETA:</strong> {formatMinutes(order.dropoffMinute)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
