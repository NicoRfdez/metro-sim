'use client';

import { useEffect, useRef, useState } from 'react';
import { metroApi, type Stop, type StopTime } from '../services/api';
import { asset } from '../lib/paths';

// Tipos mínimos de Plotly (cargado vía CDN en layout.tsx)
type PlotlyTrace = Record<string, unknown>;
interface PlotlyHoverEvent {
    points?: { customdata?: number }[];
}
interface PlotlyElement extends HTMLDivElement {
    on: (event: string, handler: (data: PlotlyHoverEvent) => unknown) => void;
    __eventsBound?: boolean;
}
interface PlotlyStatic {
    react: (el: HTMLElement, data: PlotlyTrace[], layout: Record<string, unknown>, config: Record<string, unknown>) => Promise<unknown>;
}

declare global {
    interface Window {
        Plotly?: PlotlyStatic;
        webkitAudioContext?: typeof AudioContext;
    }
}

export interface MapMetrics {
    totalPax: number;
    averagePax: number;
    topStations: { name: string; volume: number }[];
}

interface NetworkTopology {
    stopMap: Map<string, Stop>;
    lineStops: { line: string; stopTimes: StopTime[] }[];
}

const LINE_COLORS: Record<string, string> = {
    'L1': '#D55E00', // Bermejo / Vermilion (Okabe-Ito accesible)
    'L2': '#F0E442', // Amarillo luminoso accesible
    'L3': '#E69F00', // Naranja ámbar accesible
    'L4': '#0072B2', // Azul cobalto accesible
    'L4A': '#56B4E9', // Celeste cielo accesible
    'L5': '#009E73', // Verde azulado accesible
    'L6': '#CC79A7', // Magenta púrpura accesible
};

const BADGE_TEXT_COLORS: Record<string, string> = {
    'L1': '#ffffff',
    'L2': '#0f172a',
    'L3': '#0f172a',
    'L4': '#ffffff',
    'L4A': '#0f172a',
    'L5': '#ffffff',
    'L6': '#ffffff',
};

// Estaciones de combinación del Metro de Santiago
const COMBINATIONS: Record<string, string[]> = {
    'San Pablo': ['L1', 'L5'],
    'Los Héroes': ['L1', 'L2'],
    'Universidad de Chile': ['L1', 'L3'],
    'Baquedano': ['L1', 'L5'],
    'Los Leones': ['L1', 'L6'],
    'Tobalaba': ['L1', 'L4'],
    'Puente Cal y Canto': ['L2', 'L3'],
    'Santa Ana': ['L2', 'L5'],
    'Franklin': ['L2', 'L6'],
    'La Cisterna': ['L2', 'L4A'],
    'Plaza de Armas': ['L3', 'L5'],
    'Irarrázaval': ['L3', 'L5'],
    'Ñuñoa': ['L3', 'L6'],
    'Plaza Egaña': ['L3', 'L4'],
    'Vicuña Mackenna': ['L4', 'L4A'],
    'Vicente Valdés': ['L4', 'L5'],
    'Ñuble': ['L5', 'L6'],
};

// Direcciones y desplazamientos radiales (en píxeles) para las flechas de los identificadores de terminales
// Diseñados específicamente para evitar que líneas cercanas (ej: Tobalaba L4 / Los Leones L6, o Vicente Valdés L5 / Vicuña Mackenna L4A) se agrupen
const TERMINAL_CALLOUTS: Record<string, { start: { ax: number; ay: number }; end: { ax: number; ay: number } }> = {
    'L1': {
        start: { ax: -48, ay: 0 },    // San Pablo (Oeste)
        end:   { ax: 48, ay: -10 },   // Los Dominicos (Este)
    },
    'L2': {
        start: { ax: 0, ay: -42 },    // Vespucio Norte (Norte)
        end:   { ax: 0, ay: 44 },     // Hospital El Pino (Sur)
    },
    'L3': {
        start: { ax: -44, ay: -32 },  // Plaza Quilicura (Noroeste)
        end:   { ax: 46, ay: -26 },   // Plaza Egaña (Noreste)
    },
    'L4': {
        start: { ax: 38, ay: -42 },   // Tobalaba (Noreste - apunta hacia arriba y derecha, alejándose de Los Leones L6)
        end:   { ax: 46, ay: 34 },    // Plaza de Puente Alto (Sureste)
    },
    'L4A': {
        start: { ax: 44, ay: -20 },   // Vicuña Mackenna (Este - apunta hacia arriba y derecha, alejándose de Vicente Valdés L5)
        end:   { ax: -46, ay: 16 },   // La Cisterna (Suroeste - alejándose de L2)
    },
    'L5': {
        start: { ax: -46, ay: 34 },   // Plaza de Maipú (Suroeste)
        end:   { ax: 16, ay: 46 },    // Vicente Valdés (Sur - apunta hacia abajo, alejándose de Vicuña Mackenna L4A)
    },
    'L6': {
        start: { ax: -46, ay: 18 },   // Cerrillos (Suroeste)
        end:   { ax: -38, ay: -42 },  // Los Leones (Noroeste - apunta hacia arriba e izquierda, alejándose de Tobalaba L4)
    },
};

const ALL_LINES = ['L1', 'L2', 'L3', 'L4', 'L4A', 'L5', 'L6'];

const LINE_NAMES: Record<string, string> = {
    'L1': 'Línea 1',
    'L2': 'Línea 2',
    'L3': 'Línea 3',
    'L4': 'Línea 4',
    'L4A': 'Línea 4A',
    'L5': 'Línea 5',
    'L6': 'Línea 6',
};

// Encuadres precisos por línea individual para evitar sobreposiciones con la interfaz
// (tarjeta de simulación abajo a la izquierda, escala cromática a la derecha y selector arriba)
const LINE_FRAMING: Record<string, { lon: [number, number]; lat: [number, number] }> = {
    'L1': {
        lon: [-70.76, -70.50],
        lat: [-33.48, -33.37]
    },
    'L2': {
        lon: [-70.77, -70.55],
        lat: [-33.63, -33.32]
    },
    'L3': {
        lon: [-70.76, -70.52],
        lat: [-33.49, -33.33]
    },
    'L4': {
        lon: [-70.67, -70.47],
        lat: [-33.64, -33.38]
    },
    'L4A': {
        lon: [-70.73, -70.53],
        lat: [-33.59, -33.47]
    },
    'L5': {
        lon: [-70.80, -70.55],
        lat: [-33.57, -33.38]
    },
    'L6': {
        lon: [-70.75, -70.56],
        lat: [-33.54, -33.39]
    }
};

let audioCtx: AudioContext | null = null;

const playSonification = (volume: number) => {
    try {
        if (typeof window === 'undefined') return;
        if (!audioCtx) {
            const AudioCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtor) return;
            audioCtx = new AudioCtor();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Mapeamos volumen (0 a 2500) a frecuencia (200 a 800 Hz)
        const frequency = 200 + (Math.min(volume, 2500) / 2500) * 600; 
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

        // Volumen suave y corto (efecto de "burbuja" sonora)
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
        console.error("Audio API error", e);
    }
};

export default function MetroMap({ selectedLine, currentHour, onMetricsUpdate }: { selectedLine: string, currentHour: number, onMetricsUpdate?: (metrics: MapMetrics) => void }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    
    // State to hold pre-fetched data
    const [networkTopology, setNetworkTopology] = useState<NetworkTopology | null>(null);
    const [allLoadsMap, setAllLoadsMap] = useState<Map<number, Map<string, number>> | null>(null);
    const [hoveredVolume, setHoveredVolume] = useState<number | null>(null);
    const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());

    // Resetear líneas ocultas cuando se cambia de línea en el selector
    useEffect(() => {
        setHiddenLines(new Set());
    }, [selectedLine]);

    // 1. Fetch ALL data on mount (carga todas las 7 líneas una sola vez)
    useEffect(() => {
        let isMounted = true;
        
        const fetchBaseData = async () => {
            setLoading(true);
            try {
                // Fetch all stops
                const allStops = await metroApi.getAllStops();
                const stopMap = new Map<string, Stop>();
                allStops.forEach((s) => stopMap.set(s.stop_id, s));

                // Fetch routes and stops sequence for all lines
                const lineStops: NetworkTopology['lineStops'] = [];
                for (const line of ALL_LINES) {
                    const stopTimes = await metroApi.getLineStops(line);
                    if (stopTimes.length === 0) continue;
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
                    loadsForHour.forEach((l) => loadMap.set(l.stop, l.volume));
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
    }, []);

    // 2. Plot the data whenever currentHour, topology, or loads change
    useEffect(() => {
        if (!networkTopology || !allLoadsMap || !mapRef.current) return;

        const { stopMap, lineStops } = networkTopology;
        const currentLoadMap = allLoadsMap.get(currentHour) || new Map<string, number>();
        const traces: PlotlyTrace[] = [];

        let totalPax = 0;
        const stationLoads: {name: string, volume: number}[] = [];
        const isAll = selectedLine === 'all';

        // 2a. Si hay una línea seleccionada individualmente, dibujar las demás líneas como red de referencia tenue (ghost lines)
        if (!isAll) {
            for (const { line, stopTimes } of lineStops) {
                if (line === selectedLine) continue;
                const refLons: number[] = [];
                const refLats: number[] = [];
                stopTimes.forEach(st => {
                    const s = stopMap.get(st.stop);
                    if (s) {
                        refLons.push(s.stop_lon);
                        refLats.push(s.stop_lat);
                    }
                });
                if (refLons.length > 0) {
                    traces.push({
                        type: 'scatter',
                        mode: 'lines',
                        x: refLons,
                        y: refLats,
                        line: { color: 'rgba(148, 163, 184, 0.16)', width: 2, dash: 'dot' },
                        hoverinfo: 'none',
                        showlegend: false
                    });
                }
            }
        }

        // 2b. Trazar la(s) línea(s) activa(s)
        const linesToRender = isAll
            ? lineStops
            : lineStops.filter(ls => ls.line === selectedLine);

        const activeLons: number[] = [];
        const activeLats: number[] = [];
        const stationAnnotations: Record<string, unknown>[] = [];

        for (const { line, stopTimes } of linesToRender) {
            const lons: number[] = [];
            const lats: number[] = [];
            const hoverNames: string[] = [];
            const stationLabels: string[] = [];
            const textPositions: string[] = [];
            const markerSizes: number[] = [];
            const markerColors: number[] = [];
            const markerLineWidths: number[] = [];

            const validStops = stopTimes
                .map(st => ({ st, data: stopMap.get(st.stop) }))
                .filter((item): item is { st: StopTime; data: Stop } => item.data !== undefined);

            validStops.forEach(({ st, data: stopData }, idx) => {
                lons.push(stopData.stop_lon);
                lats.push(stopData.stop_lat);
                activeLons.push(stopData.stop_lon);
                activeLats.push(stopData.stop_lat);

                const cleanName = stopData.stop_name.split(' Dirección')[0].trim();
                const volume = currentLoadMap.get(st.stop) || 0;
                
                // Solo contabilizar métricas si la línea está visible
                if (!isAll || !hiddenLines.has(line)) {
                    totalPax += volume;
                    stationLoads.push({ name: cleanName, volume });
                }

                const otherLines = COMBINATIONS[cleanName]?.filter(l => l !== line) ?? [];
                const isComb = otherLines.length > 0;

                // Tooltip enriquecido
                if (isComb) {
                    hoverNames.push(`<b>${cleanName}</b> <span style="color:#38bdf8">🔄 Comb. ${otherLines.join(', ')}</span><br>Carga: ${volume.toLocaleString()} pax`);
                } else {
                    hoverNames.push(`<b>${cleanName}</b><br>Carga: ${volume.toLocaleString()} pax`);
                }

                // Identificación de estaciones: pastillas con fondo y escalonamiento alternado para evitar sobreposiciones
                if (!isAll) {
                    const prev = idx > 0 ? validStops[idx - 1].data : null;
                    const next = idx < validStops.length - 1 ? validStops[idx + 1].data : null;
                    const dx = (next?.stop_lon ?? prev?.stop_lon ?? stopData.stop_lon) - (prev?.stop_lon ?? next?.stop_lon ?? stopData.stop_lon);
                    const dy = (next?.stop_lat ?? prev?.stop_lat ?? stopData.stop_lat) - (prev?.stop_lat ?? next?.stop_lat ?? stopData.stop_lat);

                    const isHorizontal = Math.abs(dx) >= Math.abs(dy);

                    // Escalonamiento de 4 niveles alternados: Lejos-arriba, Lejos-abajo, Cerca-arriba, Cerca-abajo
                    const tier = idx % 4;
                    let dist = 20;
                    if (tier === 0) dist = -36;     // Arriba / Izquierda lejos
                    else if (tier === 1) dist = 36; // Abajo / Derecha lejos
                    else if (tier === 2) dist = -20;// Arriba / Izquierda cerca
                    else dist = 20;                 // Abajo / Derecha cerca

                    const ax = isHorizontal ? 0 : dist;
                    const ay = isHorizontal ? dist : 0;

                    const combBadge = isComb ? ` <span style="color:#38bdf8; font-size:8px;">🔄${otherLines.join('/')}</span>` : '';

                    stationAnnotations.push({
                        x: stopData.stop_lon,
                        y: stopData.stop_lat,
                        xref: 'x',
                        yref: 'y',
                        text: `<b>${cleanName}</b>${combBadge}`,
                        showarrow: true,
                        arrowhead: 0,
                        arrowwidth: 1,
                        arrowcolor: isComb ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.25)',
                        ax: ax,
                        ay: ay,
                        font: {
                            family: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            size: 9.5,
                            color: '#f8fafc',
                        },
                        bgcolor: 'rgba(15, 23, 42, 0.94)',
                        bordercolor: isComb ? '#38bdf8' : (LINE_COLORS[line] || 'rgba(255, 255, 255, 0.25)'),
                        borderwidth: isComb ? 1.5 : 1,
                        borderpad: 3.5,
                        opacity: 0.98,
                        hovertext: `<b>${cleanName}</b><br>Carga: ${volume.toLocaleString()} pax`,
                    });
                }

                // Marcadores limpios y proporcionales
                const baseSize = 6 + (volume / 2500) * 10;
                const clampedSize = baseSize > 15 ? 15 : baseSize;

                if (!isAll && isComb) {
                    markerSizes.push(Math.max(9, clampedSize + 2));
                    markerLineWidths.push(2.5);
                } else {
                    markerSizes.push(clampedSize);
                    markerLineWidths.push(1.2);
                }
                markerColors.push(volume);
            });

            traces.push({
                type: 'scatter',
                mode: 'lines+markers', // Círculos limpios en el mapa; las etiquetas usan anotaciones tipo pastilla sin solapamiento
                x: lons,
                y: lats,
                visible: (isAll && hiddenLines.has(line)) ? 'legendonly' : true,
                line: { color: LINE_COLORS[line] || '#ffffff', width: isAll ? 3.8 : 4.2 },
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
                    opacity: 0.95,
                    line: { color: '#ffffff', width: markerLineWidths }
                },
                customdata: markerColors,
                text: hoverNames,
                hovertext: hoverNames,
                hoverinfo: 'text',
                name: `Línea ${line.replace('L', '')}`,
                showlegend: isAll,
                meta: { line }
            });
        }

        // 2c. Señalética de identificación: exactamente un identificador por línea de metro con su abreviación oficial
        const annotations: Record<string, unknown>[] = [];

        // Definimos la terminal principal única para cada línea
        const LINE_PRIMARY_TERMINAL: Record<string, 'start' | 'end'> = {
            'L1': 'end',   // Los Dominicos (Este)
            'L2': 'start', // Vespucio Norte (Norte)
            'L3': 'start', // Plaza Quilicura (Noroeste)
            'L4': 'end',   // Plaza de Puente Alto (Sureste)
            'L4A': 'start', // Vicuña Mackenna (Este)
            'L5': 'start', // Plaza de Maipú (Suroeste)
            'L6': 'start', // Cerrillos (Suroeste)
        };

        if (isAll) {
            for (const { line, stopTimes } of lineStops) {
                // Si la línea fue desmarcada en la interfaz de arriba a la izquierda, quitar también su identificador
                if (hiddenLines.has(line)) continue;
                if (stopTimes.length === 0) continue;
                
                const callout = TERMINAL_CALLOUTS[line];
                if (!callout) continue;

                const primary = LINE_PRIMARY_TERMINAL[line] || 'start';
                const targetStopId = primary === 'start' ? stopTimes[0].stop : stopTimes[stopTimes.length - 1].stop;
                const target = stopMap.get(targetStopId);
                const offset = primary === 'start' ? callout.start : callout.end;

                if (target) {
                    const cleanTargetName = target.stop_name.split(' Dirección')[0].trim();
                    annotations.push({
                        x: target.stop_lon,
                        y: target.stop_lat,
                        xref: 'x',
                        yref: 'y',
                        text: `<b>${line}</b>`,
                        showarrow: true,
                        arrowhead: 2,
                        arrowsize: 1,
                        arrowwidth: 2,
                        arrowcolor: LINE_COLORS[line] || '#ffffff',
                        ax: offset.ax,
                        ay: offset.ay,
                        font: {
                            family: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            size: 11.5,
                            color: BADGE_TEXT_COLORS[line] || '#ffffff',
                        },
                        bgcolor: LINE_COLORS[line] || '#1e293b',
                        bordercolor: '#ffffff',
                        borderwidth: 2,
                        borderpad: 5,
                        opacity: 0.98,
                        hovertext: `<b>Línea ${line.replace('L', '')}</b> (${cleanTargetName})`,
                    });
                }
            }
        } else {
            // En vista de línea individual: agregar las pastillas escalonadas de cada estación
            annotations.push(...stationAnnotations);

            // Exactamente un identificador claro para la línea seleccionada en su terminal principal
            const currentLineData = lineStops.find(l => l.line === selectedLine);
            if (currentLineData && currentLineData.stopTimes.length > 0) {
                const callout = TERMINAL_CALLOUTS[selectedLine];
                if (callout) {
                    const primary = LINE_PRIMARY_TERMINAL[selectedLine] || 'start';
                    const targetStopId = primary === 'start' 
                        ? currentLineData.stopTimes[0].stop 
                        : currentLineData.stopTimes[currentLineData.stopTimes.length - 1].stop;
                    const target = stopMap.get(targetStopId);
                    const offset = primary === 'start' ? callout.start : callout.end;

                    if (target) {
                        const cleanTargetName = target.stop_name.split(' Dirección')[0].trim();
                        annotations.push({
                            x: target.stop_lon,
                            y: target.stop_lat,
                            xref: 'x',
                            yref: 'y',
                            text: `<b>${selectedLine}</b>`,
                            showarrow: true,
                            arrowhead: 2,
                            arrowsize: 1,
                            arrowwidth: 2,
                            arrowcolor: LINE_COLORS[selectedLine] || '#ffffff',
                            ax: offset.ax * 1.15,
                            ay: offset.ay * 1.15,
                            font: {
                                family: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                size: 12,
                                color: BADGE_TEXT_COLORS[selectedLine] || '#ffffff',
                            },
                            bgcolor: LINE_COLORS[selectedLine] || '#1e293b',
                            bordercolor: '#ffffff',
                            borderwidth: 2,
                            borderpad: 5,
                            opacity: 0.98,
                            hovertext: `<b>Línea ${selectedLine.replace('L', '')}</b> (${cleanTargetName})`,
                        });
                    }
                }
            }
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

        // 2d. Encuadre personalizado para evitar que las líneas se sobrepongan con la interfaz
        const selectedFraming = !isAll && LINE_FRAMING[selectedLine] ? LINE_FRAMING[selectedLine] : null;

        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: isAll,
            legend: {
                font: {
                    color: '#f8fafc',
                    size: 11,
                    family: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                },
                bgcolor: 'rgba(30, 41, 59, 0.88)',
                bordercolor: 'rgba(255, 255, 255, 0.15)',
                borderwidth: 1,
                x: 0.015,
                y: 0.98
            },
            xaxis: {
                showgrid: false,
                zeroline: false,
                visible: false,
                scaleanchor: 'y',
                scaleratio: 1,
                fixedrange: true,
                range: isAll
                    ? [-70.785, -70.525]
                    : (selectedFraming ? selectedFraming.lon : [-70.785, -70.525])
            },
            yaxis: {
                showgrid: false,
                zeroline: false,
                visible: false,
                fixedrange: true,
                range: isAll
                    ? [-33.625, -33.345]
                    : (selectedFraming ? selectedFraming.lat : [-33.625, -33.345])
            },
            annotations,
            // Márgenes amplios en vista individual para despejar las esquinas donde residen los controles flotantes
            margin: isAll
                ? { l: 15, r: 85, t: 15, b: 20 }
                : { l: 75, r: 130, t: 35, b: 60 },
            autosize: true,
            dragmode: false // Deshabilita hacer zoom/arrastrar
        };

        const config = { responsive: true, displayModeBar: false };
        
        if (window.Plotly && mapRef.current) {
            // Plotly.react is much faster than newPlot for updating existing charts
            window.Plotly.react(mapRef.current, traces, layout, config).then(() => {
                const node = mapRef.current as PlotlyElement | null;
                if (node && !node.__eventsBound) {
                    node.on('plotly_legendclick', (eventData: any) => {
                        new Audio(asset('/sound/soft_click.mp3')).play().catch(e => console.error(e));
                        
                        if (eventData && typeof eventData.curveNumber === 'number') {
                            const trace = eventData.data?.[eventData.curveNumber];
                            let lineKey: string | null = null;
                            if (trace?.meta?.line) {
                                lineKey = trace.meta.line;
                            } else if (trace?.name) {
                                const num = trace.name.replace('Línea ', '').trim();
                                lineKey = `L${num}`;
                            }
                            if (!lineKey && ALL_LINES[eventData.curveNumber]) {
                                lineKey = ALL_LINES[eventData.curveNumber];
                            }
                            if (lineKey) {
                                setHiddenLines(prev => {
                                    const next = new Set(prev);
                                    if (next.has(lineKey!)) {
                                        next.delete(lineKey!);
                                    } else {
                                        next.add(lineKey!);
                                    }
                                    return next;
                                });
                            }
                        }
                        // Previene el restyle interno de Plotly para que React coordine tanto la línea como su señalética
                        return false;
                    });
                    node.on('plotly_legenddoubleclick', (eventData: any) => {
                        new Audio(asset('/sound/soft_click.mp3')).play().catch(e => console.error(e));
                        
                        if (eventData && typeof eventData.curveNumber === 'number') {
                            const trace = eventData.data?.[eventData.curveNumber];
                            let lineKey: string | null = null;
                            if (trace?.meta?.line) {
                                lineKey = trace.meta.line;
                            } else if (trace?.name) {
                                const num = trace.name.replace('Línea ', '').trim();
                                lineKey = `L${num}`;
                            }
                            if (!lineKey && ALL_LINES[eventData.curveNumber]) {
                                lineKey = ALL_LINES[eventData.curveNumber];
                            }
                            if (lineKey) {
                                setHiddenLines(prev => {
                                    const allOtherLines = ALL_LINES.filter(l => l !== lineKey);
                                    const isOnlyThisVisible = prev.size === ALL_LINES.length - 1 && !prev.has(lineKey!);
                                    if (isOnlyThisVisible) {
                                        return new Set();
                                    } else {
                                        return new Set(allOtherLines);
                                    }
                                });
                            }
                        }
                        return false;
                    });
                    node.on('plotly_hover', (data) => {
                        if (data && data.points && data.points.length > 0) {
                            const point = data.points[0];
                            if (point.customdata !== undefined) {
                                playSonification(point.customdata);
                                setHoveredVolume(point.customdata);
                            }
                        }
                    });
                    node.on('plotly_unhover', () => {
                        setHoveredVolume(null);
                    });
                    node.__eventsBound = true;
                }
            });
        }
    }, [currentHour, networkTopology, allLoadsMap, selectedLine, hiddenLines, onMetricsUpdate]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {loading && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#f8fafc', zIndex: 10 }}>
                    Cargando topología y datos de afluencia (por favor espera)...
                </div>
            )}
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            
            {/* Escala Cromática Flotante Vertical a la Derecha */}
            <div style={{
                position: 'absolute',
                top: '50%',
                right: '1.5rem',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                backdropFilter: 'blur(8px)',
                padding: '1.25rem 0.9rem',
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100px',
                border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
                <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    marginBottom: '14px',
                    color: '#f8fafc',
                    textAlign: 'center',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    lineHeight: 1.2
                }}>
                    Afluencia
                    <div style={{ fontSize: '0.62rem', fontWeight: 500, color: '#94a3b8', textTransform: 'none', marginTop: '2px' }}>
                        (pasajeros)
                    </div>
                </div>

                {/* Barra de escala vertical y marcas de valores */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '260px' }}>
                    {/* Barra de gradiente vertical */}
                    <div style={{
                        position: 'relative',
                        width: '16px',
                        height: '100%',
                        background: 'linear-gradient(to top, #22c55e 0%, #eab308 50%, #ef4444 100%)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        {hoveredVolume !== null && (
                            <div style={{
                                position: 'absolute',
                                left: '-4px',
                                right: '-4px',
                                height: '3px',
                                backgroundColor: '#ffffff',
                                bottom: `calc(${Math.min(100, Math.max(0, (hoveredVolume / 2000) * 100))}% - 1.5px)`,
                                transition: 'bottom 0.1s ease-out',
                                zIndex: 5,
                                boxShadow: '0 0 8px rgba(255,255,255,0.9)'
                            }}>
                                {/* Tooltip flotante hacia la izquierda del indicador */}
                                <div style={{
                                    position: 'absolute',
                                    right: '26px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    backgroundColor: '#0f172a',
                                    color: '#f8fafc',
                                    border: '1px solid rgba(255, 255, 255, 0.25)',
                                    fontSize: '0.75rem',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                    pointerEvents: 'none'
                                }}>
                                    {hoveredVolume.toLocaleString()} pax
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rótulos numéricos al costado */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%',
                        fontSize: '0.68rem',
                        color: '#94a3b8',
                        fontWeight: 600,
                        padding: '2px 0'
                    }}>
                        <span style={{ color: '#ef4444' }}>2000+</span>
                        <span>1500</span>
                        <span style={{ color: '#eab308' }}>1000</span>
                        <span>500</span>
                        <span style={{ color: '#22c55e' }}>0</span>
                    </div>
                </div>

                {/* Etiquetas cualitativas debajo */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    marginTop: '12px',
                    fontSize: '0.65rem',
                    color: '#94a3b8',
                    fontWeight: 500,
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '8px',
                    width: '100%'
                }}>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>● Alta</span>
                    <span style={{ color: '#eab308', fontWeight: 600 }}>● Media</span>
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>● Baja</span>
                </div>
            </div>
        </div>
    );
}
