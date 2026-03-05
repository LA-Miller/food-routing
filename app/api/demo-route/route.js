import {
    DEFAULT_ROUTING_ALGORITHM,
    generateRoute,
    getAvailableRoutingAlgorithms,
    getRoutingAlgorithmDetails,
    resolveRoutingAlgorithmId,
} from "@/lib/routing";

const DEFAULT_SCENARIO = "downtown_two_orders";

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
    distance_eta_verification_route: {
        label: "Distance/ETA Verification Route",
        description: "Single direct run between two fixed coordinates for metric verification.",
        driver: { id: "d5", lat: 39.88971, lng: -86.07932 },
        orders: [
            {
                id: "o13",
                restaurantName: "Verification Start",
                customerName: "Verification End",
                restaurant: { lat: 39.88971, lng: -86.07932 },
                customer: { lat: 39.76957, lng: -86.17374 },
            },
        ],
    },
};

function roundKm(km) {
    return Math.round(km * 100) / 100;
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


