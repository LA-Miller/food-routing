import RouteDemoClient from "./RouteDemoClient";

export default function RouteDemoPage() {
  return (
    <main style={{ padding: 16 }}>
      <h1>Route Demo</h1>
      <p>Stops + polyline from /api/demo-route</p>
      <RouteDemoClient />
    </main>
  );
}