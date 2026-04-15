# Food Routing Capstone - Project Update Deck Content

## Slide 1 - Title
- Food Routing Capstone: Routing Simulator Progress Update
- Team: [Your Team Names]
- Date: March 2026

## Slide 2 - Objectives and Milestones
### Project Objectives
- Build a web-based simulator for food-delivery routing in city-scale scenarios.
- Compare routing strategies using measurable outputs (distance and ETA).
- Move from straight-line estimates toward road-network-aware routing behavior.
- Provide interactive scenario-based demos for reproducible evaluation.

### Milestones (from full git history)
- 2026-02-25: Initial Next.js project scaffold.
- 2026-02-25: Route demo MVP added (`/route-demo`), routing API, baseline greedy route generation, map visualization, initial tests.
- 2026-03-04: Scenario catalog expanded and documented (dense, long-leg, verification scenarios).
- 2026-03-04: Routing verification tools added (road-network path rendering, metric source labels, algorithm switching, changelog).
- 2026-03-04: Miles conversion and experiment output snapshots added.

## Slide 3 - Achieved Results So Far
- Interactive route demo is functional with selectable scenarios and algorithms.
- Two algorithms implemented and switchable in UI:
  - `greedy_nearest`
  - `paired_order_greedy`
- Road-network path + metrics integration (OSRM) with graceful fallback when unavailable.
- Verification scenario added for fixed-coordinate distance/ETA sanity checks.
- Experiment outputs committed for 105 runs per algorithm across 3 configurations.

## Slide 4 - Result Details (Figure 1: Aggregate Comparison)
### Figure 1: Weighted aggregate across all committed experiments (N=105 per algorithm)
| Algorithm | Mean Distance (km) | Mean ETA (min) | Route Valid Rate |
|---|---:|---:|---:|
| Greedy Nearest Stop | 51.10 | 122.64 | 100% |
| Greedy Paired Orders | 83.43 | 200.22 | 100% |

### Key takeaway
- Greedy Nearest outperforms Paired Orders in aggregate by:
  - 32.34 km lower mean distance (38.8% lower)
  - 77.58 min lower mean ETA (38.7% lower)

## Slide 5 - Result Details (Figure 2: Scenario-Level Behavior)
### Figure 2: Scenario-level means from `summary.json`
| Experiment Config | Runs | Greedy Nearest (km / min) | Paired Orders (km / min) | Better |
|---|---:|---|---|---|
| Seed 42, 3 batches, 4 orders | 3 | 25.88 / 62.33 | 35.05 / 84.33 | Greedy Nearest |
| Seed 123, 2 batches, 3 orders | 2 | 21.86 / 52.50 | 20.95 / 50.50 | Paired Orders |
| Seed 42, 100 batches, 8 orders | 100 | 52.44 / 125.85 | 86.13 / 206.69 | Greedy Nearest |

### Interpretation
- Performance is scenario-dependent at small sample sizes.
- With larger workload (100 batches), Greedy Nearest is consistently stronger.

## Slide 6 - Demo Slide (What to Show Live)
### Demo Flow (3-4 minutes)
1. Open `/route-demo`.
2. Select `distance_eta_verification_route`.
3. Toggle algorithm (`greedy_nearest` vs `paired_order_greedy`) and compare stop sequence + totals.
4. Toggle distance unit (`km` <-> `mi`) to show conversion support.
5. Highlight metric/path source badges:
   - Metrics source: road-network OSRM vs Haversine fallback
   - Path source: road path vs straight-line fallback

### Demo Talking Point
- The same scenario can produce meaningfully different route costs depending on algorithm and routing metric source.

## Slide 7 - Continued Work: Programming
- Improve algorithm quality beyond greedy baselines (lookahead, local search, or insertion heuristics).
- Reduce dependence on external OSRM availability (cache, retries, and offline/local routing option).
- Strengthen test execution reliability in constrained environments (current Vitest run is blocked by `spawn EPERM` in this environment).
- Add automation for experiment generation and result summarization.

## Slide 8 - Continued Work: Data
- Expand scenario dataset coverage:
  - More order densities
  - Peak-hour and geographically asymmetric demand
  - Multi-driver assignment cases
- Add controlled synthetic seeds + repeatability metadata.
- Add fairness-oriented fields (driver workload, idle time, assignment balance).
- Separate demo scenarios from benchmark scenarios to avoid bias.

## Slide 9 - Continued Work: Outcome
- Near-term expected outcome:
  - More stable and reproducible comparison of strategies.
  - Clearer evidence for when each algorithm performs well or poorly.
- Mid-term expected outcome:
  - Decision framework for selecting routing strategy by scenario profile.
  - Prototype-ready evaluation report with defensible metrics.

## Slide 10 - Bottlenecks and Objective Adjustment
### Current bottlenecks
- External routing dependency (OSRM availability/latency) can affect metric consistency.
- Evaluation metric set is currently narrow (distance + ETA, limited fairness/service-level metrics).
- Test execution environment issue (`spawn EPERM`) prevents clean CI-like validation here.

### Need to adjust objective?
- Keep core objective unchanged.
- Narrow short-term objective to: "robust reproducible evaluation baseline" before adding advanced optimization.

## Slide 11 - Plan for Next Period
### Next Work Cycle Plan
1. Finalize reproducible experiment protocol (fixed seeds, scenario matrix, result schema).
2. Add at least 2 stronger routing heuristics for comparison.
3. Add metrics: on-time rate proxy, per-driver workload balance, and route consistency.
4. Resolve test-runner environment issue and add a stable CI test command.
5. Deliver an updated benchmark report + improved demo narrative.

### Success criteria for next update
- >= 4 algorithms compared on the same benchmark matrix.
- >= 3 metric families (efficiency, service quality, fairness).
- One-page summary table with statistically stable trends.
