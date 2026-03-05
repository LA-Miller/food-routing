# Changelog

## 2026-03-05
- Added road-network path rendering for routes on the map (OSRM), with straight-line fallback when routing is unavailable.
- Added multiple selectable route scenarios in `/route-demo`, including dense and long-leg test layouts.
- Added road-network-based distance/ETA reporting and surfaced metric/path source labels in the UI.
- Added a distinct custom marker icon for the driver start location.
- Added algorithm switching support with two strategies:
  - `greedy_nearest`
  - `paired_order_greedy`
- Added a dedicated scenario: `distance_eta_verification_route` using coordinates:
  - start: `39.88971, -86.07932`
  - end: `39.76957, -86.17374`
- Added a distance unit selector (`km`/`mi`) to the route demo UI and distance conversion for displayed totals.
- Established this `CHANGELOG.md`; future changes should append a new dated entry.
