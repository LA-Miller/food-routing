/**
 * haversine distance ---- prototype
 * Compute great-circle distance between two coordinates using the Haversine formula
 */
function haversineKm(a, b) {
    const R = 6371; // radius of earth in km
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

function roundKm(km) {
    return Math.round(km * 100) / 100;
}

function toPickupStop(order) {
    return {
        type: "PICKUP",
        orderId: order.id,
        label: `Pickup: ${order.restaurantName}`,
        lat: order.restaurant.lat,
        lng: order.restaurant.lng,
    };
}

function toDropoffStop(order) {
    return {
        type: "DROPOFF",
        orderId: order.id,
        label: `Dropoff: ${order.customerName}`,
        lat: order.customer.lat,
        lng: order.customer.lng,
    };
}

function buildOrderStopMaps(orders) {
    const pickupsByOrder = new Map();
    const dropoffsByOrder = new Map();

    for (const order of orders) {
        pickupsByOrder.set(order.id, toPickupStop(order));
        dropoffsByOrder.set(order.id, toDropoffStop(order));
    }

    return {
        pickupsByOrder,
        dropoffsByOrder,
    };
}

function buildPlanFromStops(driver, stops) {
    let current = { lat: driver.lat, lng: driver.lng };
    let totalKm = 0;

    for (const stop of stops) {
        totalKm += haversineKm(current, stop);
        current = { lat: stop.lat, lng: stop.lng };
    }

    // Rough estimate using an average urban speed.
    const avgSpeedKmh = 25;
    const etaMinutes = Math.round((totalKm / avgSpeedKmh) * 60);

    return {
        stops,
        totalKm: roundKm(totalKm),
        etaMinutes,
    };
}

function generateGreedyNearestStops(driver, orders) {
    const { pickupsByOrder, dropoffsByOrder } = buildOrderStopMaps(orders);

    // Key format: "P:orderId" or "D:orderId".
    const remaining = new Map();

    // Initially, only pickups are available.
    for (const [orderId, pickup] of pickupsByOrder.entries()) {
        remaining.set(`P:${orderId}`, pickup);
    }

    const route = [];
    let current = { lat: driver.lat, lng: driver.lng };

    while (remaining.size > 0) {
        let bestKey = null;
        let bestStop = null;
        let bestDist = Infinity;

        // Greedily select nearest currently available stop.
        for (const [key, stop] of remaining.entries()) {
            const distance = haversineKm(current, stop);

            if (distance < bestDist) {
                bestDist = distance;
                bestKey = key;
                bestStop = stop;
            }
        }

        remaining.delete(bestKey);
        route.push(bestStop);
        current = { lat: bestStop.lat, lng: bestStop.lng };

        // Unlock the matching dropoff after pickup completion.
        if (bestStop.type === "PICKUP") {
            const dropoff = dropoffsByOrder.get(bestStop.orderId);
            if (dropoff) remaining.set(`D:${bestStop.orderId}`, dropoff);
        }
    }

    return route;
}

function generatePairedOrderStops(driver, orders) {
    const { pickupsByOrder, dropoffsByOrder } = buildOrderStopMaps(orders);
    const unservedOrders = new Set(orders.map((order) => order.id));

    const route = [];
    let current = { lat: driver.lat, lng: driver.lng };

    while (unservedOrders.size > 0) {
        let bestOrderId = null;
        let bestCost = Infinity;

        // Choose next order by total pair cost:
        // current -> pickup -> dropoff.
        for (const orderId of unservedOrders) {
            const pickup = pickupsByOrder.get(orderId);
            const dropoff = dropoffsByOrder.get(orderId);
            if (!pickup || !dropoff) continue;

            const pairCost = haversineKm(current, pickup) + haversineKm(pickup, dropoff);
            if (pairCost < bestCost) {
                bestCost = pairCost;
                bestOrderId = orderId;
            }
        }

        if (!bestOrderId) break;

        const pickup = pickupsByOrder.get(bestOrderId);
        const dropoff = dropoffsByOrder.get(bestOrderId);
        if (!pickup || !dropoff) break;

        route.push(pickup, dropoff);
        current = { lat: dropoff.lat, lng: dropoff.lng };
        unservedOrders.delete(bestOrderId);
    }

    return route;
}

function generateFarthestOrderStops(driver, orders) {
    const { pickupsByOrder, dropoffsByOrder } = buildOrderStopMaps(orders);
    const unservedOrders = new Set(orders.map((order) => order.id));

    const route = [];
    let current = { lat: driver.lat, lng: driver.lng };

    while (unservedOrders.size > 0) {
        let selectedOrderId = null;
        let farthestPickupDistance = -Infinity;

        for (const orderId of unservedOrders) {
            const pickup = pickupsByOrder.get(orderId);
            if (!pickup) continue;

            const distance = haversineKm(current, pickup);
            if (distance > farthestPickupDistance) {
                farthestPickupDistance = distance;
                selectedOrderId = orderId;
            }
        }

        if (!selectedOrderId) break;

        const pickup = pickupsByOrder.get(selectedOrderId);
        const dropoff = dropoffsByOrder.get(selectedOrderId);
        if (!pickup || !dropoff) break;

        route.push(pickup, dropoff);
        current = { lat: dropoff.lat, lng: dropoff.lng };
        unservedOrders.delete(selectedOrderId);
    }

    return route;
}

function generatePickupSweepStops(driver, orders) {
    const { pickupsByOrder, dropoffsByOrder } = buildOrderStopMaps(orders);
    const remainingPickups = new Set(orders.map((order) => order.id));
    const remainingDropoffs = new Set();

    const route = [];
    let current = { lat: driver.lat, lng: driver.lng };

    while (remainingPickups.size > 0) {
        let bestOrderId = null;
        let bestDistance = Infinity;

        for (const orderId of remainingPickups) {
            const pickup = pickupsByOrder.get(orderId);
            if (!pickup) continue;

            const distance = haversineKm(current, pickup);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestOrderId = orderId;
            }
        }

        if (!bestOrderId) break;

        const pickup = pickupsByOrder.get(bestOrderId);
        if (!pickup) break;

        route.push(pickup);
        current = { lat: pickup.lat, lng: pickup.lng };
        remainingPickups.delete(bestOrderId);
        remainingDropoffs.add(bestOrderId);
    }

    while (remainingDropoffs.size > 0) {
        let bestOrderId = null;
        let bestDistance = Infinity;

        for (const orderId of remainingDropoffs) {
            const dropoff = dropoffsByOrder.get(orderId);
            if (!dropoff) continue;

            const distance = haversineKm(current, dropoff);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestOrderId = orderId;
            }
        }

        if (!bestOrderId) break;

        const dropoff = dropoffsByOrder.get(bestOrderId);
        if (!dropoff) break;

        route.push(dropoff);
        current = { lat: dropoff.lat, lng: dropoff.lng };
        remainingDropoffs.delete(bestOrderId);
    }

    return route;
}

function generateNorthSouthSweepStops(driver, orders) {
    const { pickupsByOrder, dropoffsByOrder } = buildOrderStopMaps(orders);
    const unservedOrders = new Set(orders.map((order) => order.id));
    const route = [];
    let targetExtreme = "north";

    while (unservedOrders.size > 0) {
        let selectedOrderId = null;
        let selectedPickup = null;

        for (const orderId of unservedOrders) {
            const pickup = pickupsByOrder.get(orderId);
            if (!pickup) continue;

            if (!selectedPickup) {
                selectedOrderId = orderId;
                selectedPickup = pickup;
                continue;
            }

            const isMoreExtreme =
                targetExtreme === "north"
                    ? pickup.lat > selectedPickup.lat
                    : pickup.lat < selectedPickup.lat;

            if (isMoreExtreme) {
                selectedOrderId = orderId;
                selectedPickup = pickup;
            }
        }

        if (!selectedOrderId) break;

        const pickup = pickupsByOrder.get(selectedOrderId);
        const dropoff = dropoffsByOrder.get(selectedOrderId);
        if (!pickup || !dropoff) break;

        route.push(pickup, dropoff);
        unservedOrders.delete(selectedOrderId);
        targetExtreme = targetExtreme === "north" ? "south" : "north";
    }

    return route;
}

function generateLongitudeBounceStops(driver, orders) {
    const { pickupsByOrder, dropoffsByOrder } = buildOrderStopMaps(orders);
    const unservedOrders = new Set(orders.map((order) => order.id));
    const route = [];
    let targetExtreme = "east";

    while (unservedOrders.size > 0) {
        let selectedOrderId = null;
        let selectedPickup = null;

        for (const orderId of unservedOrders) {
            const pickup = pickupsByOrder.get(orderId);
            if (!pickup) continue;

            if (!selectedPickup) {
                selectedOrderId = orderId;
                selectedPickup = pickup;
                continue;
            }

            const isMoreExtreme =
                targetExtreme === "east"
                    ? pickup.lng > selectedPickup.lng
                    : pickup.lng < selectedPickup.lng;

            if (isMoreExtreme) {
                selectedOrderId = orderId;
                selectedPickup = pickup;
            }
        }

        if (!selectedOrderId) break;

        const pickup = pickupsByOrder.get(selectedOrderId);
        const dropoff = dropoffsByOrder.get(selectedOrderId);
        if (!pickup || !dropoff) break;

        route.push(pickup, dropoff);
        unservedOrders.delete(selectedOrderId);
        targetExtreme = targetExtreme === "east" ? "west" : "east";
    }

    return route;
}

const ROUTING_ALGORITHMS = {
    greedy_nearest: {
        label: "Greedy Nearest Stop",
        description: "Select the nearest available stop each step (pickup/dropoff unlocking).",
        buildStops: generateGreedyNearestStops,
    },
    paired_order_greedy: {
        label: "Greedy Paired Orders",
        description: "Select the next order by nearest pickup+dropoff pair, then deliver it immediately.",
        buildStops: generatePairedOrderStops,
    },
    farthest_order_first: {
        label: "Farthest Order First",
        description: "A deliberately wasteful heuristic that serves the farthest pickup first, then completes that order.",
        buildStops: generateFarthestOrderStops,
    },
    pickup_sweep_then_dropoff: {
        label: "Pickup Sweep Then Dropoff Sweep",
        description: "Collect every pickup first, then start delivering all dropoffs afterward.",
        buildStops: generatePickupSweepStops,
    },
    north_south_sweep: {
        label: "North-South Sweep",
        description: "Alternates between the northernmost and southernmost remaining pickup to create visible zig-zagging.",
        buildStops: generateNorthSouthSweepStops,
    },
    longitude_bounce: {
        label: "East-West Bounce",
        description: "Alternates between the easternmost and westernmost pickup to exaggerate cross-city route swings.",
        buildStops: generateLongitudeBounceStops,
    },
};

export const DEFAULT_ROUTING_ALGORITHM = "greedy_nearest";

export function resolveRoutingAlgorithmId(id) {
    if (id && ROUTING_ALGORITHMS[id]) return id;
    return DEFAULT_ROUTING_ALGORITHM;
}

export function getRoutingAlgorithmDetails(id) {
    const resolvedId = resolveRoutingAlgorithmId(id);
    const algorithm = ROUTING_ALGORITHMS[resolvedId];

    return {
        id: resolvedId,
        label: algorithm.label,
        description: algorithm.description,
    };
}

export function getAvailableRoutingAlgorithms() {
    return Object.keys(ROUTING_ALGORITHMS).map((id) => getRoutingAlgorithmDetails(id));
}

/**
 * Generate a delivery route.
 *
 * @param {{ id: string, lat: number, lng: number }} driver
 * @param {Array} orders
 * @param {{ algorithm?: string }} [options]
 * @returns {{
 *   stops: Array,
 *   totalKm: number,
 *   etaMinutes: number
 * }}
 */
export function generateRoute(driver, orders, options = {}) {
    const algorithmId = resolveRoutingAlgorithmId(options.algorithm);
    const algorithm = ROUTING_ALGORITHMS[algorithmId];
    const stops = algorithm.buildStops(driver, orders);

    return buildPlanFromStops(driver, stops);
}
