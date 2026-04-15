"use client";

import { useEffect, useState } from "react";

const initialForm = {
  seed: 20260305,
  batches: 12,
  ordersPerBatch: 6,
  radiusKm: 7,
};

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "-";
}

function formatCreatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ExperimentsClient() {
  const [form, setForm] = useState(initialForm);
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRuns() {
      try {
        setLoadingRuns(true);
        const response = await fetch("/api/experiments", { cache: "no-store" });
        const json = await response.json();
        setRuns(json.runs ?? []);
        setSelectedRun((current) => current ?? json.runs?.[0] ?? null);
      } catch (err) {
        setError(err?.message || "Failed to load experiments.");
      } finally {
        setLoadingRuns(false);
      }
    }

    loadRuns();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setRunning(true);
    setError("");

    try {
      const response = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed: Number(form.seed),
          batches: Number(form.batches),
          ordersPerBatch: Number(form.ordersPerBatch),
          radiusKm: Number(form.radiusKm),
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to run experiment.");

      setRuns((current) => [json.run, ...current.filter((run) => run.id !== json.run.id)].slice(0, 12));
      setSelectedRun(json.run);
    } catch (err) {
      setError(err?.message || "Failed to run experiment.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 20,
            borderRadius: 24,
            background: "rgba(255,255,255,0.84)",
            border: "1px solid rgba(28,25,23,0.08)",
            boxShadow: "0 20px 60px rgba(70,52,24,0.08)",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "#a16207" }}>
            Run Experiment
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Seed</span>
            <input
              type="number"
              value={form.seed}
              onChange={(event) => setForm((current) => ({ ...current, seed: event.target.value }))}
              style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #d6d3d1" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Batches</span>
            <input
              type="number"
              min="1"
              value={form.batches}
              onChange={(event) => setForm((current) => ({ ...current, batches: event.target.value }))}
              style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #d6d3d1" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Orders Per Batch</span>
            <input
              type="number"
              min="1"
              value={form.ordersPerBatch}
              onChange={(event) => setForm((current) => ({ ...current, ordersPerBatch: event.target.value }))}
              style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #d6d3d1" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Scenario Radius (km)</span>
            <input
              type="number"
              min="1"
              step="0.5"
              value={form.radiusKm}
              onChange={(event) => setForm((current) => ({ ...current, radiusKm: event.target.value }))}
              style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #d6d3d1" }}
            />
          </label>

          <button
            type="submit"
            disabled={running}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "12px 16px",
              background: "#1c1917",
              color: "#fff",
              fontWeight: 700,
              cursor: running ? "wait" : "pointer",
            }}
          >
            {running ? "Running..." : "Run Browser Experiment"}
          </button>

          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#57534e" }}>
            This runs the same style of seeded batch comparison as the CLI script, but saves a fresh
            summary into `outputs/web-experiments`.
          </p>
        </form>

        <section
          style={{
            padding: 20,
            borderRadius: 24,
            background: "rgba(255,255,255,0.84)",
            border: "1px solid rgba(28,25,23,0.08)",
            boxShadow: "0 20px 60px rgba(70,52,24,0.08)",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "#a16207" }}>
            Recent Runs
          </div>

          {loadingRuns ? <p style={{ margin: 0 }}>Loading experiments...</p> : null}
          {!loadingRuns && runs.length === 0 ? <p style={{ margin: 0 }}>No saved experiment summaries yet.</p> : null}

          <div style={{ display: "grid", gap: 10 }}>
            {runs.map((run) => {
              const isSelected = selectedRun?.id === run.id;
              return (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setSelectedRun(run)}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    borderRadius: 18,
                    border: isSelected ? "1px solid #d97706" : "1px solid #e7e5e4",
                    background: isSelected ? "#fff7ed" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#1c1917" }}>{formatCreatedAt(run.createdAt)}</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: "#57534e" }}>
                    {run.config.batches} batches, {run.config.ordersPerBatch} orders, radius {run.config.radiusKm} km
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </section>

      {error ? (
        <section style={{ color: "crimson", padding: 16, borderRadius: 18, background: "#fff1f2" }}>
          {error}
        </section>
      ) : null}

      {selectedRun ? (
        <section
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          }}
        >
          <div
            style={{
              padding: 20,
              borderRadius: 24,
              background: "rgba(255,255,255,0.84)",
              border: "1px solid rgba(28,25,23,0.08)",
              boxShadow: "0 20px 60px rgba(70,52,24,0.08)",
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "#a16207" }}>
              Selected Configuration
            </div>
            <div style={{ marginTop: 14, display: "grid", gap: 10, color: "#44403c" }}>
              <div><strong>Seed:</strong> {selectedRun.config.seed}</div>
              <div><strong>Batches:</strong> {selectedRun.config.batches}</div>
              <div><strong>Orders Per Batch:</strong> {selectedRun.config.ordersPerBatch}</div>
              <div><strong>Radius:</strong> {selectedRun.config.radiusKm} km</div>
              <div><strong>Algorithms:</strong> {selectedRun.config.algorithmCount}</div>
            </div>
          </div>

          <div
            style={{
              padding: 20,
              borderRadius: 24,
              background: "rgba(255,255,255,0.84)",
              border: "1px solid rgba(28,25,23,0.08)",
              boxShadow: "0 20px 60px rgba(70,52,24,0.08)",
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "#a16207" }}>
              Quick Takeaways
            </div>
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div>
                <strong>Shortest mean distance:</strong>{" "}
                {selectedRun.summary.slice().sort((a, b) => a.total_km_mean - b.total_km_mean)[0]?.algorithm_label ?? "-"}
              </div>
              <div>
                <strong>Longest mean distance:</strong>{" "}
                {selectedRun.summary.slice().sort((a, b) => b.total_km_mean - a.total_km_mean)[0]?.algorithm_label ?? "-"}
              </div>
              <div>
                <strong>Fastest mean ETA:</strong>{" "}
                {selectedRun.summary.slice().sort((a, b) => a.eta_mean_min - b.eta_mean_min)[0]?.algorithm_label ?? "-"}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {selectedRun ? (
        <section
          style={{
            padding: 20,
            borderRadius: 24,
            background: "rgba(255,255,255,0.84)",
            border: "1px solid rgba(28,25,23,0.08)",
            boxShadow: "0 20px 60px rgba(70,52,24,0.08)",
            overflowX: "auto",
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "#a16207" }}>
            Summary By Algorithm
          </div>
          <table style={{ width: "100%", marginTop: 14, borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e7e5e4" }}>
                <th style={{ padding: "10px 8px" }}>Algorithm</th>
                <th style={{ padding: "10px 8px" }}>Runs</th>
                <th style={{ padding: "10px 8px" }}>Valid Rate</th>
                <th style={{ padding: "10px 8px" }}>Mean KM</th>
                <th style={{ padding: "10px 8px" }}>Median KM</th>
                <th style={{ padding: "10px 8px" }}>Min KM</th>
                <th style={{ padding: "10px 8px" }}>Max KM</th>
                <th style={{ padding: "10px 8px" }}>Mean ETA</th>
                <th style={{ padding: "10px 8px" }}>ETA Std Dev</th>
              </tr>
            </thead>
            <tbody>
              {selectedRun.summary.map((row) => (
                <tr key={row.algorithm_id} style={{ borderBottom: "1px solid #f5f5f4" }}>
                  <td style={{ padding: "10px 8px", fontWeight: 700 }}>{row.algorithm_label}</td>
                  <td style={{ padding: "10px 8px" }}>{row.runs}</td>
                  <td style={{ padding: "10px 8px" }}>{formatNumber(row.route_valid_rate)}</td>
                  <td style={{ padding: "10px 8px" }}>{formatNumber(row.total_km_mean)}</td>
                  <td style={{ padding: "10px 8px" }}>{formatNumber(row.total_km_median)}</td>
                  <td style={{ padding: "10px 8px" }}>{formatNumber(row.total_km_min)}</td>
                  <td style={{ padding: "10px 8px" }}>{formatNumber(row.total_km_max)}</td>
                  <td style={{ padding: "10px 8px" }}>{formatNumber(row.eta_mean_min)}</td>
                  <td style={{ padding: "10px 8px" }}>{formatNumber(row.eta_stddev_min)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
