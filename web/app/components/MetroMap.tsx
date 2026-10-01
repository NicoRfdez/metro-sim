'use client';

import { useEffect, useRef, useState } from 'react';
import { metroApi } from '../services/api';

declare global {
    interface Window {
        Plotly: any;
    }
}

const LINE_COLORS: Record<string, string> = {
    'L1': '#ED1C24',
    'L2': '#F7941D',
    'L3': '#8B5A2B',
    'L4': '#004B87',
    'L4A': '#00B2A9',
    'L5': '#009639',
    'L6': '#B38FBF',
};

const ALL_LINES = ['L1', 'L2', 'L3', 'L4', 'L4A', 'L5', 'L6'];

export default function MetroMap({ selectedLine, currentHour, onMetricsUpdate }: { selectedLine: string, currentHour: number, onMetricsUpdate?: (metrics: any) => void }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    
    // State to hold pre-fetched data
    const [networkTopology, setNetworkTopology] = useState<any>(null);
    const [allLoadsMap, setAllLoadsMap] = useState<Map<number, Map<string, number>> | null>(null);

    // 1. Fetch ALL data (topology + all hours loads) on mount or line change
    useEffect(() => {
        let isMounted = true;
        
        const fetchBaseData = async () => {
            setLoading(true);
            try {
                // Fetch all stops
                const allStops = await metroApi.getAllStops();
                const stopMap = new Map();
                allStops.forEach((s: any) => stopMap.set(s.stop_id, s));

                // Fetch routes and stops sequence
                const linesToDraw = selectedLine === 'all' ? ALL_LINES : [selectedLine];
                const lineStops = [];
                for (const line of linesToDraw) {
                    const trips = await metroApi.getTripsByRoute(line, 0);
                    if (trips.length === 0) continue;
                    
                    const middleIndex = Math.floor(trips.length / 2);
                    const tripId = trips[middleIndex].trip_id;
                    
                    const stopTimes = await metroApi.getStopTimesByTrip(tripId);
                    stopTimes.sort((a: any, b: any) => a.stop_sequence - b.stop_sequence);
                    lineStops.push({ line, stopTimes });
                }

                if (isMounted) setNetworkTopology({ stopMap, lineStops });

                // Fetch all passenger loads for hours 6 to 23 concurrently
                const hoursToFetch = Array.from({length: 18}, (_, i) => i + 6);
                const allLoads = await Promise.all(
                    hoursToFetch.map(h => metroApi.getPassengerLoads(h))
                );
                
                const loadMapByHour = new Map<number, Map<string, number>>();
                hoursToFetch.forEach((hour, idx) => {
                    const loadsForHour = allLoads[idx];
                    const loadMap = new Map<string, number>();
                    loadsForHour.forEach((l: any) => loadMap.set(l.stop, l.volume));
                    loadMapByHour.set(hour, loadMap);
                });
                
                if (isMounted) setAllLoadsMap(loadMapByHour);

            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchBaseData();

        return () => {
            isMounted = false;
        };
    }, [selectedLine]);

    // 2. Plot the data whenever currentHour, topology, or loads change
    useEffect(() => {
        if (!networkTopology || !allLoadsMap || !mapRef.current) return;

        const { stopMap, lineStops } = networkTopology;
        const currentLoadMap = allLoadsMap.get(currentHour) || new Map<string, number>();
        const traces: any[] = [];

        let totalPax = 0;
        let stationLoads: {name: string, volume: number}[] = [];

        for (const { line, stopTimes } of lineStops) {
            const lons: number[] = [];
            const lats: number[] = [];
            const hoverNames: string[] = [];
            const stationLabels: string[] = [];
            const markerSizes: number[] = [];
            const markerColors: number[] = [];

            stopTimes.forEach((st: any) => {
                const stopData = stopMap.get(st.stop); 
                if (stopData) {
                    lons.push(stopData.stop_lon);
                    lats.push(stopData.stop_lat);
                    
                    const cleanName = stopData.stop_name.split(' Dirección')[0];
                    const volume = currentLoadMap.get(st.stop) || 0;
                    hoverNames.push(`<b>${cleanName}</b><br>Carga: ${volume.toLocaleString()} pax`);
                    stationLabels.push(cleanName);
                    
                    const size = 6 + (volume / 2500) * 20; 
                    markerSizes.push(size > 25 ? 25 : size);
                    markerColors.push(volume);

                    totalPax += volume;
                    stationLoads.push({ name: cleanName, volume });
                }
            });
            traces.push({
                type: 'scatter',
                mode: selectedLine === 'all' ? 'lines+markers' : 'lines+markers+text',
                x: lons,
                y: lats,
                line: { color: LINE_COLORS[line] || '#ffffff', width: 4 },
                marker: { 
                    size: markerSizes, 
                    color: markerColors, 
                    colorscale: [
                        [0, '#22c55e'],
                        [0.5, '#eab308'],
                        [1, '#ef4444']
                    ], 
                    cmin: 0,
                    cmax: 2000,
                    opacity: 0.9,
                    line: { color: 'white', width: 1 }
                },
                text: selectedLine === 'all' ? hoverNames : stationLabels,
                hovertext: hoverNames,
                hoverinfo: 'text',
                textposition: 'top right',
                textfont: {
                    color: '#1a1a1a',
                    size: 11,
                    family: 'system-ui, sans-serif',
                },
                name: `Línea ${line.replace('L', '')}`
            });
        }
        
        if (onMetricsUpdate) {
            // Deduplicate stations (since some stations like Baquedano are in multiple lines)
            const uniqueStations = new Map<string, number>();
            stationLoads.forEach(s => {
                const existing = uniqueStations.get(s.name) || 0;
                uniqueStations.set(s.name, Math.max(existing, s.volume));
            });
            const deduplicated = Array.from(uniqueStations.entries()).map(([name, volume]) => ({name, volume}));
            
            deduplicated.sort((a, b) => b.volume - a.volume);
            onMetricsUpdate({
                totalPax,
                averagePax: deduplicated.length > 0 ? Math.round(totalPax / deduplicated.length) : 0,
                topStations: deduplicated.slice(0, 3)
            });
        }

        const layout = {
            title: {
                text: `Simulación de Afluencia - ${currentHour}:00 hrs`,
                font: { color: '#1a1a1a' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: true,
            legend: {
                font: { color: '#1a1a1a' },
                bgcolor: 'rgba(244, 236, 224, 0.8)',
                x: 0.02,
                y: 0.98
            },
            xaxis: { showgrid: false, zeroline: false, visible: false, scaleanchor: 'y', scaleratio: 1, fixedrange: true },
            yaxis: { showgrid: false, zeroline: false, visible: false, fixedrange: true },
            margin: { l: 20, r: 20, t: 40, b: 20 },
            autosize: true,
            dragmode: false // Deshabilita hacer zoom/arrastrar
        };

        const config = { responsive: true, displayModeBar: false };
        
        if (window.Plotly) {
            // Plotly.react is much faster than newPlot for updating existing charts
            window.Plotly.react(mapRef.current, traces, layout, config);
        }
    }, [currentHour, networkTopology, allLoadsMap, selectedLine]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {loading && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'black', zIndex: 10 }}>
                    Cargando topología y datos de afluencia (por favor espera)...
                </div>
            )}
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
