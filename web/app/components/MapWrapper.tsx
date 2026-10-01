'use client';

import dynamic from "next/dynamic";

const MetroMap = dynamic(() => import('./MetroMap'), { ssr: false });

export default function MapWrapper({ selectedLine }: { selectedLine: string }) {
    return <MetroMap selectedLine={selectedLine} />;
}
