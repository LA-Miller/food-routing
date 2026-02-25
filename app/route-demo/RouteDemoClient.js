"use client";

import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("../components/RouteMap"), { ssr: false });

export default function RouteDemoClient() {
  return <RouteMap />;
}