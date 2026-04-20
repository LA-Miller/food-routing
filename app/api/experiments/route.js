import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildExperimentResult, formatExperimentCard, toCsv } from "@/lib/experimentRunner";

const EXPERIMENT_DIRS = ["web-experiments", "experiments", "experiments-smoke", "algo-smoke"];

function getLocalOutputRoot() {
  return path.join(process.cwd(), "outputs");
}

function getWritableOutputRoot() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "food-routing-capstone", "outputs");
  }

  return getLocalOutputRoot();
}

function getReadableOutputRoots() {
  const roots = [getWritableOutputRoot(), getLocalOutputRoot()];
  return [...new Set(roots)];
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readSummaryCards() {
  const cards = [];

  for (const outputRoot of getReadableOutputRoots()) {
    for (const dirName of EXPERIMENT_DIRS) {
      const baseDir = path.join(outputRoot, dirName);

      let entries = [];
      try {
        entries = await fs.readdir(baseDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const runId = entry.name;
        const summaryPath = path.join(baseDir, runId, "summary.json");

        try {
          const content = await fs.readFile(summaryPath, "utf8");
          const parsed = JSON.parse(content);
          cards.push(formatExperimentCard(parsed, runId));
        } catch {
          continue;
        }
      }
    }
  }

  return cards.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 12);
}

export async function GET() {
  const runs = await readSummaryCards();
  return Response.json({ runs });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = buildExperimentResult(body);
    const runId = new Date().toISOString().replace(/:/g, "-");
    const outputRoot = getWritableOutputRoot();
    const outputDir = path.join(outputRoot, "web-experiments", runId);

    await ensureDir(outputDir);

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

    await fs.writeFile(path.join(outputDir, "summary.json"), JSON.stringify(result, null, 2), "utf8");
    await fs.writeFile(path.join(outputDir, "runs.csv"), toCsv(result.runs, runCsvColumns), "utf8");
    await fs.writeFile(path.join(outputDir, "summary_by_algorithm.csv"), toCsv(result.summary, summaryCsvColumns), "utf8");

    return Response.json({
      run: formatExperimentCard(result, runId),
      detail: result,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to run experiment." },
      { status: 400 }
    );
  }
}
