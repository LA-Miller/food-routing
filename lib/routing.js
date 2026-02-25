/**
 * haversine distance ---- prototype
 * Compute great-circle distance between two coordinates using the Haversine formula
 * 
 *  */ 
function haversineKm(a, b) {
    const R = 6371; //radius of earth in km
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLng / 2) * 
            Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

    return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Generate a delivery route using a greedy nearest-neighbor heuristic.
 *
 * DESIGN DECISION:
 * This is intentionally a baseline algorithm, not an optimal solver.
 * It provides:
 *   - Fast computation
 *   - Deterministic output
 *   - A measurable baseline for comparison
 *
 * CONSTRAINT:
 * A delivery dropoff cannot occur before its pickup.
 *
 * APPROACH:
 * 1. Start at driver's current location.
 * 2. Only pickup stops are initially available.
 * 3. Repeatedly choose the nearest available stop.
 * 4. When a pickup is completed, unlock its dropoff.
 *
 * This produces a feasible route but not necessarily optimal.
 *
 * @param {{ id: string, lat: number, lng: number }} driver
 * @param {Array} orders
 * @returns {{
 *   stops: Array,
 *   totalKm: number,
 *   etaMinutes: number
 * }}
 */

export function generateRoute(driver, orders) {
    // Transform orders into pickup and dropoff stop objects.
    const pickups = orders.map((o) => ({
        type: "PICKUP",
        orderId: o.id,
        label: `Pickup: ${o.restaurantName}`,
        lat: o.restaurant.lat,
        lng: o.restaurant.lng,
    }));

    const dropoffs = orders.map((o) => ({
        type: "DROPOFF",
        orderId: o.id,
        label: `Dropoff: ${o.customerName}`,
        lat: o.customer.lat,
        lng: o.customer.lng,
    }));

    // Tracks which pickups have been completed.
  const visitedPickups = new Set();

  // Map of currently available stops.
  // Key format: "P:orderId" or "D:orderId"
  const remaining = new Map();

  // Initially, only pickups are available.
  for (const p of pickups) {
    remaining.set(`P:${p.orderId}`, p);
  }

  const route = [];
  let current = { lat: driver.lat, lng: driver.lng };
  let totalKm = 0;

  // Continue until all stops are visited.
  while (remaining.size > 0) {
    let bestKey = null;
    let bestStop = null;
    let bestDist = Infinity;

    // Greedily select nearest available stop.
    for (const [key, stop] of remaining.entries()) {
      const distance = haversineKm(current, stop);

      if (distance < bestDist) {
        bestDist = distance;
        bestKey = key;
        bestStop = stop;
      }
    }

    // Visit chosen stop.
    remaining.delete(bestKey);
    route.push(bestStop);

    totalKm += bestDist;
    current = { lat: bestStop.lat, lng: bestStop.lng };

    // If pickup completed, unlock corresponding dropoff.
    if (bestStop.type === "PICKUP") {
      visitedPickups.add(bestStop.orderId);

      const drop = dropoffs.find(
        (x) => x.orderId === bestStop.orderId
      );

      remaining.set(`D:${drop.orderId}`, drop);
    }
  }

  // Convert distance into rough ETA.
  // Assumes average urban speed of 25 km/h.
  const avgSpeedKmh = 25;
  const etaMinutes = Math.round((totalKm / avgSpeedKmh) * 60);

  return {
    stops: route,
    totalKm: Math.round(totalKm * 100) / 100,
    etaMinutes,
  };
}