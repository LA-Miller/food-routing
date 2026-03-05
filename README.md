This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Capstone: Food Delivery Routing Simulator

A web-based system to **simulate food-delivery routing in a city** and evaluate how different routing strategies perform under realistic constraints (distance/ETA accuracy, batching, driver assignment fairness vs efficiency, etc.).

This project focuses on **system design + evaluation**, not inventing new routing algorithms.

## Goals

- Visualize orders, restaurants, drivers, and routes on a map.
- Implement multiple routing / dispatch strategies (baseline → more realistic).
- Compare strategies with clear metrics (ETA error, distance, on-time %, driver utilization, fairness).
- Produce reproducible experiments and an interpretable results report.

## Core Features (Planned)

### Map + Simulation
- Interactive map (orders, restaurants, drivers)
- Playback controls (start/pause/step/speed)
- Scenario generator (random + scripted scenarios)
- Event timeline (order created → assigned → picked up → delivered)

### Routing / Dispatch Strategies
- **Baseline**: Haversine (straight-line), greedy assignment
- **Improved**: road-network routing (via routing engine / API)
- **Batching**: combine multiple deliveries per driver (simple heuristics)
- **Fairness controls**: constraints or re-ranking to reduce driver inequity

### Metrics / Evaluation
- Total delivery time, mean/median delivery time
- Distance traveled (and cost proxy)
- On-time rate (vs SLA)
- Driver utilization / idle time
- Fairness indicators (e.g., variance of earnings/time, Gini-style measure)

## Tech Stack (Proposed)

- **Frontend**: Next.js (App Router), Leaflet for maps
- **Backend**: Node.js (API routes or separate server)
- **Data**: JSON scenario files + optional Postgres for persistence
- **Routing**: start with Haversine; upgrade to road-network routing (e.g., OSRM/Valhalla/GraphHopper or a map API)

> If you’re keeping this lightweight, start with “all local JSON” + deterministic random seeds.

## Repo Structure (Suggested)
## Seeded Batch Experiments

Run reproducible batch comparisons across routing algorithms and export CSV/JSON metrics:

```bash
npm run experiment -- --seed 42 --batches 100 --orders 8 --radius-km 7
```

Outputs are written to timestamped folders under `outputs/experiments/` and include:
- `runs.csv` (one row per batch x algorithm)
- `summary_by_algorithm.csv` (aggregated metrics)
- `summary.json` (config + summary metrics)
