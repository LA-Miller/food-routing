import RouteDemoClient from "./RouteDemoClient";

export default function RouteDemoPage() {
  return (
    <main style={{ padding: 16 }}>
      <h1>Route Demo</h1>
      <p>Switch scenarios to compare routing behavior with different pickup/dropoff layouts.</p>
      <RouteDemoClient />
    </main>
  );
}
