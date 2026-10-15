'use client';

import dynamic from "next/dynamic";
import type { MapMetrics } from "./MetroMap";

const MetroMap = dynamic(() => import('./MetroMap'), { ssr: false });

export default function MapWrapper({ selectedLine, currentHour, onMetricsUpdate }: { selectedLine: string, currentHour: number, onMetricsUpdate?: (metrics: MapMetrics) => void }) {
    return <MetroMap selectedLine={selectedLine} currentHour={currentHour} onMetricsUpdate={onMetricsUpdate} />;
}
