import { generateRoute } from "@/lib/routing";

export async function GET() {
    const driver = { id: "d1", lat: 39.7684, lng: -86.1581 };

    const orders = [
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

    const plan = generateRoute(driver, orders);

    // Basic sanity checks: every order pickup appears before its dropoff
    const firstIndexByOrder = new Map();
    plan.stops.forEach((s, i) => {
        const key = `${s.type}:${s.orderId}`;
        firstIndexByOrder.set(key, i);
    });

    const issues = [];
    for (const o of orders) {
        const p = firstIndexByOrder.get(`PICKUP:${o.id}`);
        const d = firstIndexByOrder.get(`DROPOFF:${o.id}`);
        if (p == null || d == null) issues.push(`Missing stop(s) for order ${o.id}`);
        else if (p > d) issues.push(`Dropoff before pickup for order ${o.id}`);
    }

    return Response.json({ driver, orders, plan, issues });
}