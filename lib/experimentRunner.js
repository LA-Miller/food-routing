import { generateRoute, getAvailableRoutingAlgorithms } from "@/lib/routing";

export const DEFAULT_EXPERIMENT_OPTIONS = {
  seed: 20260305,
  batches: 12,
  ordersPerBatch: 6,
  radiusKm: 7,
};

function validateOptions(options) {
  const seed = Number(options?.seed ?? DEFAULT_EXPERIMENT_OPTIONS.seed);
  const batches = Number(options?.batches ?? DEFAULT_EXPERIMENT_OPTIONS.batches);
  const ordersPerBatch = Number(options?.ordersPerBatch ?? DEFAULT_EXPERIMENT_OPTIONS.ordersPerBatch);
  const radiusKm = Number(options?.radiusKm ?? DEFAULT_EXPERIMENT_OPTIONS.radiusKm);

  if (!Number.isInteger(seed)) throw new Error("Seed must be an integer.");
  if (!Number.isInteger(batches) || batches <= 0) throw new Error("Batches must be a positive integer.");
  if (!Number.isInteger(ordersPerBatch) || ordersPerBatch <= 0) throw new Error("Orders per batch must be a positive integer.");
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) throw new Error("Radius must be a positive number.");

  return {
    seed,
    batches,
    ordersPerBatch,
    radiusKm,
  };
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

  const orderIds = [...new Set(plan.stops.map((stop) => stop.orderId))];
  for (const orderId of orderIds) {
    const pickupIndex = firstIndex.get(`PICKUP:${orderId}`);
    const dropoffIndex = firstIndex.get(`DROPOFF:${orderId}`);
    if (pickupIndex == null || dropoffIndex == null) return false;
    if (pickupIndex > dropoffIndex) return false;
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
  const variance = values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function round(value, places = 3) {
  const p = 10 ** places;
  return Math.round(value * p) / p;
}

function summarizeByAlgorithm(runRows) {
  const byAlgorithm = new Map();

  for (const row of runRows) {
    if (!byAlgorithm.has(row.algorithm_id)) byAlgorithm.set(row.algorithm_id, []);
    byAlgorithm.get(row.algorithm_id).push(row);
  }

  const summaryRows = [];

  for (const [algorithmId, rows] of byAlgorithm.entries()) {
    const distances = rows.map((row) => Number(row.total_km));
    const etas = rows.map((row) => Number(row.eta_minutes));
    const validCount = rows.filter((row) => row.route_valid === true).length;

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

export function toCsv(rows, columns) {
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

export function buildExperimentResult(rawOptions = {}) {
  const options = validateOptions(rawOptions);
  const algorithms = getAvailableRoutingAlgorithms();
  const runRows = [];

  for (let batchIndex = 0; batchIndex < options.batches; batchIndex += 1) {
    const batchSeed = options.seed + batchIndex;
    const rng = mulberry32(batchSeed);
    const scenario = makeScenario(rng, batchIndex + 1, options.ordersPerBatch, options.radiusKm);

    for (const algorithm of algorithms) {
      const plan = generateRoute(scenario.driver, scenario.orders, { algorithm: algorithm.id });

      runRows.push({
        batch_index: batchIndex + 1,
        batch_seed: batchSeed,
        algorithm_id: algorithm.id,
        algorithm_label: algorithm.label,
        driver_id: scenario.driver.id,
        order_count: scenario.orders.length,
        stop_count: plan.stops.length,
        total_km: plan.totalKm,
        eta_minutes: plan.etaMinutes,
        route_valid: validateRoute(plan),
      });
    }
  }

  const summary = summarizeByAlgorithm(runRows);

  return {
    config: {
      ...options,
      algorithmCount: algorithms.length,
      algorithms,
    },
    summary,
    runs: runRows,
  };
}

export function formatExperimentCard(result, runId) {
  return {
    id: runId,
    createdAt: runId,
    config: result.config,
    summary: result.summary,
  };
}
