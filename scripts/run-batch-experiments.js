#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULTS = {
  seed: 20260305,
  batches: 50,
  ordersPerBatch: 6,
  radiusKm: 7,
  outputDir: "outputs/experiments",
};

const DEFAULT_ROUTING_ALGORITHM = "greedy_nearest";

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

  return { pickupsByOrder, dropoffsByOrder };
}

function buildPlanFromStops(driver, stops) {
  let current = { lat: driver.lat, lng: driver.lng };
  let totalKm = 0;

  for (const stop of stops) {
    totalKm += haversineKm(current, stop);
    current = { lat: stop.lat, lng: stop.lng };
  }

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
  const remaining = new Map();

  for (const [orderId, pickup] of pickupsByOrder.entries()) {
    remaining.set(`P:${orderId}`, pickup);
  }

  const route = [];
  let current = { lat: driver.lat, lng: driver.lng };

  while (remaining.size > 0) {
    let bestKey = null;
    let bestStop = null;
    let bestDist = Infinity;

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
    id: "greedy_nearest",
    label: "Greedy Nearest Stop",
    description: "Select the nearest available stop each step (pickup/dropoff unlocking).",
    buildStops: generateGreedyNearestStops,
  },
  paired_order_greedy: {
    id: "paired_order_greedy",
    label: "Greedy Paired Orders",
    description: "Select the next order by nearest pickup+dropoff pair, then deliver it immediately.",
    buildStops: generatePairedOrderStops,
  },
};

function resolveRoutingAlgorithmId(id) {
  if (id && ROUTING_ALGORITHMS[id]) return id;
  return DEFAULT_ROUTING_ALGORITHM;
}

function getAvailableRoutingAlgorithms() {
  return Object.values(ROUTING_ALGORITHMS).map((algo) => ({
    id: algo.id,
    label: algo.label,
    description: algo.description,
  }));
}

function generateRoute(driver, orders, options = {}) {
  const algorithmId = resolveRoutingAlgorithmId(options.algorithm);
  const algorithm = ROUTING_ALGORITHMS[algorithmId];
  const stops = algorithm.buildStops(driver, orders);
  return buildPlanFromStops(driver, stops);
}

function parseArgs(argv) {
  const args = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--seed" && next) {
      args.seed = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--batches" && next) {
      args.batches = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--orders" && next) {
      args.ordersPerBatch = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--radius-km" && next) {
      args.radiusKm = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--output-dir" && next) {
      args.outputDir = String(next);
      i += 1;
      continue;
    }
  }

  if (!Number.isInteger(args.seed)) throw new Error("--seed must be an integer");
  if (!Number.isInteger(args.batches) || args.batches <= 0) throw new Error("--batches must be a positive integer");
  if (!Number.isInteger(args.ordersPerBatch) || args.ordersPerBatch <= 0) throw new Error("--orders must be a positive integer");
  if (!Number.isFinite(args.radiusKm) || args.radiusKm <= 0) throw new Error("--radius-km must be a positive number");

  return args;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function nextRandom() {
    t += 0x6d2b79f5;
    let v = Math.imul(t ^ (t >>> 15), 1 | t);
    v ^= v + Math.imul(v ^ (v >>> 7), 61 | v);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}

function randomPointNear(rng, center, radiusKm) {
  const angle = rng() * Math.PI * 2;
  const distance = Math.sqrt(rng()) * radiusKm;

  const latKm = distance * Math.cos(angle);
  const lngKm = distance * Math.sin(angle);

  const lat = center.lat + latKm / 111;
  const lng = center.lng + lngKm / (111 * Math.cos((center.lat * Math.PI) / 180));

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

function makeScenario(rng, index, ordersPerBatch, radiusKm) {
  const cityCenter = { lat: 39.7684, lng: -86.1581 };
  const driver = {
    id: `driver_${index}`,
    ...randomPointNear(rng, cityCenter, radiusKm * 0.7),
  };

  const orders = [];
  for (let i = 0; i < ordersPerBatch; i += 1) {
    const id = `s${index}_o${i + 1}`;
    const pickup = randomPointNear(rng, cityCenter, radiusKm);
    const dropoff = randomPointNear(rng, cityCenter, radiusKm);

    orders.push({
      id,
      restaurantName: `Restaurant ${id}`,
      customerName: `Customer ${id}`,
      restaurant: pickup,
      customer: dropoff,
    });
  }

  return { driver, orders };
}

function validateRoute(plan) {
  const firstIndex = new Map();
  for (let i = 0; i < plan.stops.length; i += 1) {
    const stop = plan.stops[i];
    firstIndex.set(`${stop.type}:${stop.orderId}`, i);
  }

  const orderIds = [...new Set(plan.stops.map((s) => s.orderId))];
  for (const orderId of orderIds) {
    const p = firstIndex.get(`PICKUP:${orderId}`);
    const d = firstIndex.get(`DROPOFF:${orderId}`);
    if (p == null || d == null) return false;
    if (p > d) return false;
  }

  return true;
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function stdDev(values) {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function toCsv(rows, columns) {
  const escapeCell = (cell) => {
    const value = String(cell ?? "");
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const header = columns.join(",");
  const lines = rows.map((row) => columns.map((key) => escapeCell(row[key])).join(","));
  return [header, ...lines].join("\n");
}

function round(value, places = 3) {
  const p = 10 ** places;
  return Math.round(value * p) / p;
}

function summarizeByAlgorithm(runRows) {
  const byAlgo = new Map();

  for (const row of runRows) {
    if (!byAlgo.has(row.algorithm_id)) byAlgo.set(row.algorithm_id, []);
    byAlgo.get(row.algorithm_id).push(row);
  }

  const summaryRows = [];

  for (const [algorithmId, rows] of byAlgo.entries()) {
    const distances = rows.map((r) => Number(r.total_km));
    const etas = rows.map((r) => Number(r.eta_minutes));
    const validCount = rows.filter((r) => r.route_valid === true).length;

    summaryRows.push({
      algorithm_id: algorithmId,
      algorithm_label: rows[0].algorithm_label,
      runs: rows.length,
      route_valid_rate: round(validCount / rows.length, 4),
      total_km_mean: round(mean(distances)),
      total_km_median: round(median(distances)),
      total_km_min: round(Math.min(...distances)),
      total_km_max: round(Math.max(...distances)),
      total_km_stddev: round(stdDev(distances)),
      eta_mean_min: round(mean(etas)),
      eta_median_min: round(median(etas)),
      eta_min_min: round(Math.min(...etas)),
      eta_max_min: round(Math.max(...etas)),
      eta_stddev_min: round(stdDev(etas)),
    });
  }

  return summaryRows.sort((a, b) => a.algorithm_id.localeCompare(b.algorithm_id));
}

function buildOutputDir(baseDir) {
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  return path.join(baseDir, timestamp);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const algorithms = getAvailableRoutingAlgorithms();
  const runRows = [];

  for (let batchIndex = 0; batchIndex < options.batches; batchIndex += 1) {
    const batchSeed = options.seed + batchIndex;
    const rng = mulberry32(batchSeed);
    const scenario = makeScenario(rng, batchIndex + 1, options.ordersPerBatch, options.radiusKm);

    for (const algo of algorithms) {
      const plan = generateRoute(scenario.driver, scenario.orders, { algorithm: algo.id });

      runRows.push({
        batch_index: batchIndex + 1,
        batch_seed: batchSeed,
        algorithm_id: algo.id,
        algorithm_label: algo.label,
        driver_id: scenario.driver.id,
        order_count: scenario.orders.length,
        stop_count: plan.stops.length,
        total_km: plan.totalKm,
        eta_minutes: plan.etaMinutes,
        route_valid: validateRoute(plan),
        default_algorithm_id: DEFAULT_ROUTING_ALGORITHM,
      });
    }
  }

  const summaryRows = summarizeByAlgorithm(runRows);
  const outputDir = buildOutputDir(options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  const runCsvColumns = [
    "batch_index",
    "batch_seed",
    "algorithm_id",
    "algorithm_label",
    "driver_id",
    "order_count",
    "stop_count",
    "total_km",
    "eta_minutes",
    "route_valid",
    "default_algorithm_id",
  ];

  const summaryCsvColumns = [
    "algorithm_id",
    "algorithm_label",
    "runs",
    "route_valid_rate",
    "total_km_mean",
    "total_km_median",
    "total_km_min",
    "total_km_max",
    "total_km_stddev",
    "eta_mean_min",
    "eta_median_min",
    "eta_min_min",
    "eta_max_min",
    "eta_stddev_min",
  ];

  fs.writeFileSync(path.join(outputDir, "runs.csv"), toCsv(runRows, runCsvColumns), "utf8");
  fs.writeFileSync(path.join(outputDir, "summary_by_algorithm.csv"), toCsv(summaryRows, summaryCsvColumns), "utf8");
  fs.writeFileSync(
    path.join(outputDir, "summary.json"),
    JSON.stringify(
      {
        config: {
          ...options,
          algorithmCount: algorithms.length,
          algorithms,
        },
        summary: summaryRows,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Seeded batch experiment complete. Output directory: ${outputDir}`);
  console.log(`Runs: ${runRows.length} (${options.batches} batches x ${algorithms.length} algorithms)`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
