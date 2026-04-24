import {
    DEFAULT_ROUTING_ALGORITHM,
    generateRoute,
    getAvailableRoutingAlgorithms,
    getRoutingAlgorithmDetails,
    resolveRoutingAlgorithmId,
} from "@/lib/routing";

const DEFAULT_SCENARIO = "downtown_two_orders";
const DEFAULT_SIMULATION_POLICY = "availability_then_distance";

const SCENARIOS = {
    downtown_two_orders: {
        label: "Downtown Two Orders",
        description: "Small baseline around downtown Indianapolis.",
        driver: { id: "d1", lat: 39.7684, lng: -86.1581 },
        orders: [
            {
                id: "o1",
                restaurantName: "Restaurant A",
                customerName: "Customer X",
                restaurant: { lat: 39.7684, lng: -86.1581 },
                customer: { lat: 39.776, lng: -86.145 },
            },
            {
                id: "o2",
                restaurantName: "Restaurant B",
                customerName: "Customer Y",
                restaurant: { lat: 39.759, lng: -86.17 },
                customer: { lat: 39.751, lng: -86.155 },
            },
        ],
    },
    lunch_rush_four_orders: {
        label: "Lunch Rush (4 Orders)",
        description: "Denser cluster to test pickup/dropoff sequencing under load.",
        driver: { id: "d2", lat: 39.771, lng: -86.165 },
        orders: [
            {
                id: "o3",
                restaurantName: "Pizza Hub",
                customerName: "Ava",
                restaurant: { lat: 39.7725, lng: -86.1588 },
                customer: { lat: 39.7793, lng: -86.1499 },
            },
            {
                id: "o4",
                restaurantName: "Taco Spot",
                customerName: "Noah",
                restaurant: { lat: 39.7658, lng: -86.1704 },
                customer: { lat: 39.7589, lng: -86.1613 },
            },
            {
                id: "o5",
                restaurantName: "Sushi Go",
                customerName: "Mia",
                restaurant: { lat: 39.7691, lng: -86.1473 },
                customer: { lat: 39.7612, lng: -86.1396 },
            },
            {
                id: "o6",
                restaurantName: "Burger Barn",
                customerName: "Liam",
                restaurant: { lat: 39.7548, lng: -86.1721 },
                customer: { lat: 39.7472, lng: -86.1641 },
            },
        ],
    },
    north_south_split: {
        label: "North-South Split",
        description: "Forces the route to cross the city and back.",
        driver: { id: "d3", lat: 39.7838, lng: -86.1575 },
        orders: [
            {
                id: "o7",
                restaurantName: "North Noodles",
                customerName: "Ethan",
                restaurant: { lat: 39.7922, lng: -86.1536 },
                customer: { lat: 39.8023, lng: -86.1435 },
            },
            {
                id: "o8",
                restaurantName: "Midtown Grill",
                customerName: "Sophia",
                restaurant: { lat: 39.7702, lng: -86.1512 },
                customer: { lat: 39.7596, lng: -86.1424 },
            },
            {
                id: "o9",
                restaurantName: "South Curry",
                customerName: "Lucas",
                restaurant: { lat: 39.7449, lng: -86.1598 },
                customer: { lat: 39.7312, lng: -86.1506 },
            },
        ],
    },
    suburb_loop: {
        label: "Suburb Loop",
        description: "Wider spread with longer road legs and a loop-like pattern.",
        driver: { id: "d4", lat: 39.8256, lng: -86.1335 },
        orders: [
            {
                id: "o10",
                restaurantName: "Bagel Point",
                customerName: "Olivia",
                restaurant: { lat: 39.8362, lng: -86.1204 },
                customer: { lat: 39.8468, lng: -86.1089 },
            },
            {
                id: "o11",
                restaurantName: "Pho House",
                customerName: "James",
                restaurant: { lat: 39.8142, lng: -86.1513 },
                customer: { lat: 39.8033, lng: -86.1681 },
            },
            {
                id: "o12",
                restaurantName: "Mediterranean Mix",
                customerName: "Emma",
                restaurant: { lat: 39.7944, lng: -86.1301 },
                customer: { lat: 39.807, lng: -86.1127 },
            },
        ],
    },
    ongoing_dispatch_demo: {
        label: "Ongoing Dispatch (3 Drivers)",
        description: "Incoming orders arrive periodically and are assigned using driver availability plus pickup distance.",
        kind: "ongoing_dispatch",
        drivers: [
            { id: "dA", lat: 39.7684, lng: -86.1581, color: "#1d4ed8" },
            { id: "dB", lat: 39.7759, lng: -86.1454, color: "#b45309" },
            { id: "dC", lat: 39.7588, lng: -86.1706, color: "#047857" },
        ],
        orders: [
            {
                id: "sim1",
                createdMinute: 0,
                restaurantName: "Monument Cafe",
                customerName: "Order 1",
                restaurant: { lat: 39.7688, lng: -86.1589 },
                customer: { lat: 39.7765, lng: -86.1468 },
            },
            {
                id: "sim2",
                createdMinute: 2,
                restaurantName: "South Slice",
                customerName: "Order 2",
                restaurant: { lat: 39.7543, lng: -86.1684 },
                customer: { lat: 39.7448, lng: -86.1561 },
            },
            {
                id: "sim3",
                createdMinute: 4,
                restaurantName: "Lockerbie Sushi",
                customerName: "Order 3",
                restaurant: { lat: 39.7738, lng: -86.1442 },
                customer: { lat: 39.7816, lng: -86.1327 },
            },
            {
                id: "sim4",
                createdMinute: 6,
                restaurantName: "Canal Noodles",
                customerName: "Order 4",
                restaurant: { lat: 39.7706, lng: -86.1715 },
                customer: { lat: 39.7848, lng: -86.1782 },
            },
            {
                id: "sim5",
                createdMinute: 8,
                restaurantName: "Fletcher Tacos",
                customerName: "Order 5",
                restaurant: { lat: 39.7526, lng: -86.1496 },
                customer: { lat: 39.7444, lng: -86.1378 },
            },
            {
                id: "sim6",
                createdMinute: 10,
                restaurantName: "Market Grill",
                customerName: "Order 6",
                restaurant: { lat: 39.7712, lng: -86.1524 },
                customer: { lat: 39.7623, lng: -86.1394 },
            },
            {
                id: "sim7",
                createdMinute: 12,
                restaurantName: "Circle Thai",
                customerName: "Order 7",
                restaurant: { lat: 39.7708, lng: -86.1599 },
                customer: { lat: 39.7824, lng: -86.1658 },
            },
            {
                id: "sim8",
                createdMinute: 14,
                restaurantName: "East Market Deli",
                customerName: "Order 8",
                restaurant: { lat: 39.7681, lng: -86.1417 },
                customer: { lat: 39.7573, lng: -86.1304 },
            },
        ],
    },
    cross_town_dispatch_ten_orders: {
        label: "Cross-Town Dispatch (10 Orders)",
        description: "Three drivers handle a heavier wave of longer east-west and north-south deliveries across Indianapolis.",
        kind: "ongoing_dispatch",
        drivers: [
            { id: "dX", lat: 39.7684, lng: -86.1812, color: "#1d4ed8" },
            { id: "dY", lat: 39.7891, lng: -86.1428, color: "#b45309" },
            { id: "dZ", lat: 39.7448, lng: -86.1566, color: "#047857" },
        ],
        orders: [
            {
                id: "ct1",
                createdMinute: 0,
                restaurantName: "Westside Grill",
                customerName: "Order 1",
                restaurant: { lat: 39.7672, lng: -86.2048 },
                customer: { lat: 39.7796, lng: -86.1214 },
            },
            {
                id: "ct2",
                createdMinute: 2,
                restaurantName: "Broad Ripple Bowls",
                customerName: "Order 2",
                restaurant: { lat: 39.8682, lng: -86.1406 },
                customer: { lat: 39.7427, lng: -86.1849 },
            },
            {
                id: "ct3",
                createdMinute: 4,
                restaurantName: "Fountain Square Pizza",
                customerName: "Order 3",
                restaurant: { lat: 39.7528, lng: -86.1396 },
                customer: { lat: 39.8204, lng: -86.2238 },
            },
            {
                id: "ct4",
                createdMinute: 6,
                restaurantName: "Speedway Tacos",
                customerName: "Order 4",
                restaurant: { lat: 39.8024, lng: -86.2492 },
                customer: { lat: 39.7613, lng: -86.0937 },
            },
            {
                id: "ct5",
                createdMinute: 8,
                restaurantName: "Irvington Noodles",
                customerName: "Order 5",
                restaurant: { lat: 39.7687, lng: -86.0725 },
                customer: { lat: 39.7062, lng: -86.1875 },
            },
            {
                id: "ct6",
                createdMinute: 10,
                restaurantName: "North Meridian Deli",
                customerName: "Order 6",
                restaurant: { lat: 39.9037, lng: -86.1579 },
                customer: { lat: 39.7416, lng: -86.1158 },
            },
            {
                id: "ct7",
                createdMinute: 12,
                restaurantName: "Garfield Park Curry",
                customerName: "Order 7",
                restaurant: { lat: 39.7208, lng: -86.1455 },
                customer: { lat: 39.8489, lng: -86.0916 },
            },
            {
                id: "ct8",
                createdMinute: 14,
                restaurantName: "Canal Bistro",
                customerName: "Order 8",
                restaurant: { lat: 39.7814, lng: -86.1762 },
                customer: { lat: 39.7249, lng: -86.0443 },
            },
            {
                id: "ct9",
                createdMinute: 16,
                restaurantName: "Eastside BBQ",
                customerName: "Order 9",
                restaurant: { lat: 39.7906, lng: -86.0297 },
                customer: { lat: 39.8555, lng: -86.1908 },
            },
            {
                id: "ct10",
                createdMinute: 18,
                restaurantName: "Southwest Sandwich Co.",
                customerName: "Order 10",
                restaurant: { lat: 39.7074, lng: -86.2103 },
                customer: { lat: 39.7928, lng: -86.0611 },
            },
        ],
    },
};

function roundKm(km) {
    return Math.round(km * 100) / 100;
}

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

function kmToMinutes(km) {
    const avgSpeedKmh = 25;
    return (km / avgSpeedKmh) * 60;
}

function toLatLngPath(osrmCoordinates) {
    if (!Array.isArray(osrmCoordinates)) return [];

    return osrmCoordinates
        .filter(
            (coord) =>
                Array.isArray(coord) &&
                coord.length >= 2 &&
                Number.isFinite(coord[0]) &&
                Number.isFinite(coord[1])
        )
        .map(([lng, lat]) => [lat, lng]);
}

async function getRoadRoute(points) {
    if (!Array.isArray(points) || points.length < 2) {
        return {
            roadPath: [],
            roadTotalKm: null,
            roadEtaMinutes: null,
        };
    }

    const coordinateString = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const query = new URLSearchParams({
        overview: "full",
        geometries: "geojson",
        alternatives: "false",
        steps: "false",
    });

    const url = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?${query.toString()}`;

    try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
            return {
                roadPath: [],
                roadTotalKm: null,
                roadEtaMinutes: null,
            };
        }

        const data = await response.json();
        const route = data?.routes?.[0];

        const roadPath = toLatLngPath(route?.geometry?.coordinates);
        const roadTotalKm = Number.isFinite(route?.distance)
            ? roundKm(route.distance / 1000)
            : null;
        const roadEtaMinutes = Number.isFinite(route?.duration)
            ? Math.round(route.duration / 60)
            : null;

        return {
            roadPath,
            roadTotalKm,
            roadEtaMinutes,
        };
    } catch {
        return {
            roadPath: [],
            roadTotalKm: null,
            roadEtaMinutes: null,
        };
    }
}

function buildStraightPath(from, to) {
    return [
        [from.lat, from.lng],
        [to.lat, to.lng],
    ];
}

async function buildTravelSegment(driverId, orderId, kind, from, to, startMinute) {
    const straightKm = haversineKm(from, to);
    const straightMinutes = kmToMinutes(straightKm);
    const route = await getRoadRoute([from, to]);
    const path =
        Array.isArray(route.roadPath) && route.roadPath.length >= 2
            ? route.roadPath
            : buildStraightPath(from, to);

    return {
        driverId,
        orderId,
        kind,
        from,
        to,
        startMinute,
        endMinute: startMinute + straightMinutes,
        totalKm: straightKm,
        path,
    };
}

function compareEvents(a, b) {
    const priorities = {
        ORDER_CREATED: 0,
        ORDER_ASSIGNED: 1,
        PICKUP: 2,
        DROPOFF: 3,
    };

    if (a.minute !== b.minute) return a.minute - b.minute;
    return (priorities[a.kind] ?? 99) - (priorities[b.kind] ?? 99);
}

async function simulateOngoingDispatchScenario(scenario) {
    const driverStates = scenario.drivers.map((driver) => ({
        ...driver,
        startLat: driver.lat,
        startLng: driver.lng,
        currentLocation: { lat: driver.lat, lng: driver.lng },
        availableMinute: 0,
        deliveriesCompleted: 0,
        totalKm: 0,
        segments: [],
    }));

    const events = [];
    const assignedOrders = [];

    for (const order of scenario.orders.slice().sort((a, b) => a.createdMinute - b.createdMinute)) {
        events.push({
            id: `${order.id}-created`,
            kind: "ORDER_CREATED",
            minute: order.createdMinute,
            title: `Order ${order.id} created`,
            detail: `${order.restaurantName} received a new request.`,
            orderId: order.id,
            driverId: null,
            lat: order.restaurant.lat,
            lng: order.restaurant.lng,
        });

        let bestCandidate = null;

        for (const driver of driverStates) {
            const distanceToPickupKm = haversineKm(driver.currentLocation, order.restaurant);
            const waitMinutes = Math.max(0, driver.availableMinute - order.createdMinute);
            const score = waitMinutes * 2 + distanceToPickupKm;
            const candidate = { driver, distanceToPickupKm, waitMinutes, score };

            if (
                !bestCandidate ||
                candidate.score < bestCandidate.score ||
                (
                    candidate.score === bestCandidate.score &&
                    candidate.distanceToPickupKm < bestCandidate.distanceToPickupKm
                )
            ) {
                bestCandidate = candidate;
            }
        }

        const selectedDriver = bestCandidate?.driver;
        if (!selectedDriver) continue;

        const assignMinute = order.createdMinute;
        const driveToPickupStartMinute = Math.max(order.createdMinute, selectedDriver.availableMinute);
        const pickupSegment = await buildTravelSegment(
            selectedDriver.id,
            order.id,
            "TO_PICKUP",
            selectedDriver.currentLocation,
            order.restaurant,
            driveToPickupStartMinute
        );
        const dropoffSegment = await buildTravelSegment(
            selectedDriver.id,
            order.id,
            "TO_DROPOFF",
            order.restaurant,
            order.customer,
            pickupSegment.endMinute
        );

        const pickupMinute = pickupSegment.endMinute;
        const dropoffMinute = dropoffSegment.endMinute;
        const driverWasBusy = selectedDriver.availableMinute > order.createdMinute;

        selectedDriver.segments.push(pickupSegment, dropoffSegment);
        selectedDriver.currentLocation = { ...order.customer };
        selectedDriver.availableMinute = dropoffMinute;
        selectedDriver.deliveriesCompleted += 1;
        selectedDriver.totalKm += pickupSegment.totalKm + dropoffSegment.totalKm;

        assignedOrders.push({
            ...order,
            assignedDriverId: selectedDriver.id,
            assignedMinute: assignMinute,
            pickupMinute,
            dropoffMinute,
            pickupDistanceKm: roundKm(bestCandidate.distanceToPickupKm),
            waitMinutes: roundKm(bestCandidate.waitMinutes),
        });

        events.push({
            id: `${order.id}-assigned`,
            kind: "ORDER_ASSIGNED",
            minute: assignMinute,
            title: `Order ${order.id} assigned`,
            detail: `${selectedDriver.id} selected using availability + distance${driverWasBusy ? " while still completing a prior job" : ""}.`,
            orderId: order.id,
            driverId: selectedDriver.id,
            lat: order.restaurant.lat,
            lng: order.restaurant.lng,
        });
        events.push({
            id: `${order.id}-pickup`,
            kind: "PICKUP",
            minute: pickupMinute,
            title: "Pickup complete",
            detail: `${selectedDriver.id} picked up ${order.restaurantName}.`,
            orderId: order.id,
            driverId: selectedDriver.id,
            lat: order.restaurant.lat,
            lng: order.restaurant.lng,
        });
        events.push({
            id: `${order.id}-dropoff`,
            kind: "DROPOFF",
            minute: dropoffMinute,
            title: "Delivery complete",
            detail: `${selectedDriver.id} delivered order ${order.id}.`,
            orderId: order.id,
            driverId: selectedDriver.id,
            lat: order.customer.lat,
            lng: order.customer.lng,
        });
    }

    const durationMinutes = Math.ceil(
        Math.max(
            ...driverStates.map((driver) => driver.availableMinute),
            ...assignedOrders.map((order) => order.dropoffMinute ?? 0),
            0
        )
    );

    return {
        type: "ongoing_dispatch",
        assignmentPolicy: {
            id: DEFAULT_SIMULATION_POLICY,
            label: "Availability + Distance Dispatch",
            description: "Assigns new orders to drivers using a combined score based on pickup distance and whether that driver is still busy.",
        },
        durationMinutes,
        drivers: driverStates.map((driver) => ({
            id: driver.id,
            color: driver.color,
            startLat: driver.startLat,
            startLng: driver.startLng,
            deliveriesCompleted: driver.deliveriesCompleted,
            totalKm: roundKm(driver.totalKm),
            segments: driver.segments,
        })),
        orders: assignedOrders,
        events: events.sort(compareEvents),
    };
}

function getAvailableScenarios() {
    return Object.entries(SCENARIOS).map(([id, scenario]) => ({
        id,
        label: scenario.label,
        description: scenario.description,
    }));
}

function getScenarioById(id) {
    if (id && SCENARIOS[id]) return { id, ...SCENARIOS[id] };
    return { id: DEFAULT_SCENARIO, ...SCENARIOS[DEFAULT_SCENARIO] };
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const requestedScenarioId = searchParams.get("scenario");
    const requestedAlgorithmId = searchParams.get("algorithm") ?? DEFAULT_ROUTING_ALGORITHM;

    const scenario = getScenarioById(requestedScenarioId);
    const algorithmId = resolveRoutingAlgorithmId(requestedAlgorithmId);
    const algorithm = getRoutingAlgorithmDetails(algorithmId);

    if (scenario.kind === "ongoing_dispatch") {
        const simulation = await simulateOngoingDispatchScenario(scenario);

        return Response.json({
            scenario: {
                id: scenario.id,
                label: scenario.label,
                description: scenario.description,
            },
            algorithm: {
                id: DEFAULT_SIMULATION_POLICY,
                label: simulation.assignmentPolicy.label,
                description: simulation.assignmentPolicy.description,
            },
            availableScenarios: getAvailableScenarios(),
            availableAlgorithms: getAvailableRoutingAlgorithms(),
            simulation,
            issues: [],
        });
    }

    const baselinePlan = generateRoute(scenario.driver, scenario.orders, {
        algorithm: algorithmId,
    });

    const roadRoute = await getRoadRoute([scenario.driver, ...baselinePlan.stops]);

    const hasRoadMetrics =
        Number.isFinite(roadRoute.roadTotalKm) &&
        Number.isFinite(roadRoute.roadEtaMinutes);

    const hasRoadPath = Array.isArray(roadRoute.roadPath) && roadRoute.roadPath.length >= 2;

    const plan = {
        ...baselinePlan,
        totalKm: hasRoadMetrics ? roadRoute.roadTotalKm : baselinePlan.totalKm,
        etaMinutes: hasRoadMetrics ? roadRoute.roadEtaMinutes : baselinePlan.etaMinutes,
        roadPath: roadRoute.roadPath,
        metricsSource: hasRoadMetrics ? "road_network_osrm" : "haversine_fallback",
        pathSource: hasRoadPath ? "road_network_osrm" : "straight_line_fallback",
        baselineTotalKm: baselinePlan.totalKm,
        baselineEtaMinutes: baselinePlan.etaMinutes,
        roadTotalKm: roadRoute.roadTotalKm,
        roadEtaMinutes: roadRoute.roadEtaMinutes,
    };

    // Basic sanity checks: every order pickup appears before its dropoff
    const firstIndexByOrder = new Map();
    plan.stops.forEach((s, i) => {
        const key = `${s.type}:${s.orderId}`;
        firstIndexByOrder.set(key, i);
    });

    const issues = [];
    for (const o of scenario.orders) {
        const p = firstIndexByOrder.get(`PICKUP:${o.id}`);
        const d = firstIndexByOrder.get(`DROPOFF:${o.id}`);
        if (p == null || d == null) issues.push(`Missing stop(s) for order ${o.id}`);
        else if (p > d) issues.push(`Dropoff before pickup for order ${o.id}`);
    }

    return Response.json({
        scenario: {
            id: scenario.id,
            label: scenario.label,
            description: scenario.description,
        },
        algorithm,
        availableScenarios: getAvailableScenarios(),
        availableAlgorithms: getAvailableRoutingAlgorithms(),
        driver: scenario.driver,
        orders: scenario.orders,
        plan,
        issues,
    });
}

