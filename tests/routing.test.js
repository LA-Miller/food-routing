import { describe, it, expect } from "vitest";
import { generateRoute } from "../lib/routing";

const driver = { id: "d1", lat: 39.7684, lng: -86.1581 };

const sampleOrders = [
  {
    id: "o1",
    restaurantName: "Restaurant A",
    customerName: "Customer X",
    restaurant: { lat: 39.7684, lng: -86.1581 },
    customer: { lat: 39.776, lng: -86.145 },
  },
  {
    id: "o2",
    restaurantName: "Restaurant B",
    customerName: "Customer Y",
    restaurant: { lat: 39.759, lng: -86.17 },
    customer: { lat: 39.751, lng: -86.155 },
  },
];

describe("generateRoute()", () => {

  it("returns a route with stops", () => {
    const plan = generateRoute(driver, sampleOrders);
    expect(plan.stops.length).toBe(4); // 2 pickups + 2 dropoffs
  });

  it("ensures pickup occurs before dropoff", () => {
    const plan = generateRoute(driver, sampleOrders);

    const indexByKey = {};
    plan.stops.forEach((stop, i) => {
      indexByKey[`${stop.type}:${stop.orderId}`] = i;
    });

    for (const order of sampleOrders) {
      expect(indexByKey[`PICKUP:${order.id}`])
        .toBeLessThan(indexByKey[`DROPOFF:${order.id}`]);
    }
  });

  it("computes positive distance and ETA", () => {
    const plan = generateRoute(driver, sampleOrders);
    expect(plan.totalKm).toBeGreaterThan(0);
    expect(plan.etaMinutes).toBeGreaterThan(0);
  });

});