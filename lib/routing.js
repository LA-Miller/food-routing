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
