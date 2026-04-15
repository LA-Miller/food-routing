import RouteDemoClient from "./RouteDemoClient";

export default function RouteDemoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "radial-gradient(circle at top, #fff7d8 0%, #f4efe2 38%, #e8e1d2 100%)",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 18 }}>
        <section
          style={{
            padding: 24,
            borderRadius: 24,
            background: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(28,25,23,0.08)",
            boxShadow: "0 20px 60px rgba(70,52,24,0.08)",
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: "#a16207" }}>
            Interactive Simulation
          </div>
          <h1 style={{ margin: "10px 0 0", fontSize: "clamp(2rem, 3vw, 3.5rem)", lineHeight: 1.05 }}>
            Route Demo
          </h1>
          <p style={{ margin: "12px 0 0", maxWidth: 820, color: "#57534e", lineHeight: 1.7 }}>
            Step through each route event, control playback speed, and inspect how the chosen
            strategy sequences pickups and deliveries across the current scenario.
          </p>
        </section>

        <RouteDemoClient />
      </div>
    </main>
  );
}
