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

export default function MetroMap({ selectedLine }: { selectedLine: string }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAndPlotLines = async () => {
            if (!mapRef.current) return;
            
            try {
                setLoading(true);
                const traces = [];
                
                // 1. Fetch all stops once since they are shared
                const allStops = await metroApi.getAllStops();
                const stopMap = new Map();
                allStops.forEach((s: any) => stopMap.set(s.stop_id, s));

                // Determine which lines to draw
                const linesToDraw = selectedLine === 'all' ? ALL_LINES : [selectedLine];

                for (const line of linesToDraw) {
                    // Fetch trips for the line (direction 0)
                    const trips = await metroApi.getTripsByRoute(line, 0);
                    if (trips.length === 0) continue;
                    
                    // Use a trip from the middle of the day to ensure it spans all stations
                    const middleIndex = Math.floor(trips.length / 2);
                    const tripId = trips[middleIndex].trip_id;
                    
                    // Fetch stop times for this specific trip
                    const stopTimes = await metroApi.getStopTimesByTrip(tripId);
                    stopTimes.sort((a: any, b: any) => a.stop_sequence - b.stop_sequence);
                    
                    const xCoords: number[] = [];
                    const yCoords: number[] = [];
                    const stopNames: string[] = [];
                    
                    stopTimes.forEach((st: any) => {
                        const stopData = stopMap.get(st.stop); // Using st.stop because of ForeignKey serialization
                        if (stopData) {
                            xCoords.push(stopData.stop_lon);
                            yCoords.push(stopData.stop_lat);
                            stopNames.push(stopData.stop_name);
                        }
                    });
                    
                    // Add trace for this line
                    traces.push({
                        type: 'scatter',
                        mode: 'lines+markers',
                        x: xCoords,
                        y: yCoords,
                        line: { color: LINE_COLORS[line] || '#000000', width: 4 },
                        marker: { size: 6, color: 'white', line: { color: LINE_COLORS[line] || '#000000', width: 2 } },
                        text: stopNames,
                        hoverinfo: 'text',
                        name: `Línea ${line.replace('L', '')}`
                    });
                }
                
                const layout = {
                    title: selectedLine === 'all' ? 'Toda la Red de Metro' : `Línea ${selectedLine.replace('L', '')}`,
                    paper_bgcolor: 'white',
                    plot_bgcolor: 'white',
                    showlegend: selectedLine === 'all', // Show legend if all lines
                    xaxis: { showgrid: false, zeroline: false, visible: false, scaleanchor: 'y', scaleratio: 1 },
                    yaxis: { showgrid: false, zeroline: false, visible: false },
                    margin: { l: 20, r: 20, t: 40, b: 20 },
                    autosize: true
                };

                const config = { responsive: true, displayModeBar: false };
                
                if (window.Plotly) {
                    window.Plotly.newPlot(mapRef.current, traces, layout, config);
                } else {
                    console.error("Plotly no está definido en window.");
                }
            } catch (error) {
                console.error("Error cargando los datos del backend:", error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            loadAndPlotLines();
        }, 300);

        return () => clearTimeout(timer);
    }, [selectedLine]); // Re-run effect when selectedLine changes

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {loading && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'black', zIndex: 10 }}>
                    Cargando red...
                </div>
            )}
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
