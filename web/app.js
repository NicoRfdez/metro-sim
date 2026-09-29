// Constantes y Colores Oficiales del Metro de Santiago
const METRO_COLORS = {
    'L1': '#ED1C24', // Rojo
    'L2': '#F8A81C', // Amarillo
    'L3': '#703F2A', // Café (asumiendo valor aproximado)
    'L4': '#0072C6', // Azul
    'L4A': '#0087CE', // Celeste
    'L5': '#00A650', // Verde
    'L6': '#93278F'  // Violeta
};

// Offset en latitud/longitud (aproximadamente 10-15 metros en grados)
const TRACK_OFFSET = 0.00015; 

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar datos extraídos del GTFS
    const response = await fetch('metro_data.json');
    const data = await response.json();
    
    // Obtener el contenedor principal
    const vizContainer = document.getElementById('viz-container');
    
    // Limpiar el placeholder
    vizContainer.innerHTML = '';
    
    // Configuración del layout de Plotly
    const layout = {
        autosize: true,
        margin: { l: 20, r: 20, t: 20, b: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)', // Transparente para usar el fondo CSS
        plot_bgcolor: 'rgba(0,0,0,0)',
        hovermode: 'closest',
        showlegend: false,
        xaxis: {
            showgrid: false,
            zeroline: false,
            visible: false, // Ocultar ejes
            scaleanchor: 'y',
            scaleratio: 1 // Mantener proporción geográfica
        },
        yaxis: {
            showgrid: false,
            zeroline: false,
            visible: false, // Ocultar ejes
        }
    };
    
    // Configuración general de Plotly
    const config = {
        responsive: true,
        displayModeBar: false // Ocultar elementos de distracción
    };
    
    const plotData = [];
    
    // Procesar los datos para Plotly
    // paths tiene formato: "route_id_direction_id": [stop_id1, stop_id2, ...]
    const routes = {};
    
    Object.keys(data.paths).forEach(key => {
        const [routeId, directionId] = key.split('_');
        const stops = data.paths[key].map(stopId => data.stops[stopId]);
        
        if (!routes[routeId]) routes[routeId] = {};
        routes[routeId][directionId] = stops;
    });
    
    // Generar trazos para cada línea y dirección
    Object.keys(routes).forEach(routeId => {
        const color = METRO_COLORS[routeId] || '#ffffff';
        const dir0_stops = routes[routeId]['0'] || [];
        const dir1_stops = routes[routeId]['1'] || [];
        
        // Función para calcular puntos con offset perpendicular
        const calculateOffsetLine = (stops, offset) => {
            const points = stops.filter(s => s != null); // Filtrar nulos por si acaso
            if (points.length < 2) return points;
            
            const offsetPoints = [];
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                const prev = i > 0 ? points[i-1] : null;
                const next = i < points.length - 1 ? points[i+1] : null;
                
                let dx = 0, dy = 0;
                // Calculamos el vector dirección aproximado
                // Como las coordenadas son lon (x) y lat (y)
                if (prev && next) {
                    dx = next.stop_lon - prev.stop_lon;
                    dy = next.stop_lat - prev.stop_lat;
                } else if (prev) {
                    dx = p.stop_lon - prev.stop_lon;
                    dy = p.stop_lat - prev.stop_lat;
                } else if (next) {
                    dx = next.stop_lon - p.stop_lon;
                    dy = next.stop_lat - p.stop_lat;
                }
                
                // Normalizar
                let len = Math.sqrt(dx*dx + dy*dy);
                if (len === 0) { dx = 1; dy = 0; len = 1; }
                dx /= len;
                dy /= len;
                
                // Perpendicular (-dy, dx)
                const nx = -dy;
                const ny = dx;
                
                offsetPoints.push({
                    stop_name: p.stop_name,
                    stop_lon: p.stop_lon + nx * offset,
                    stop_lat: p.stop_lat + ny * offset,
                    original_lon: p.stop_lon,
                    original_lat: p.stop_lat
                });
            }
            return offsetPoints;
        };
        
        // Vía Ida (Dir 0) -> +Offset
        const lineDir0 = calculateOffsetLine(dir0_stops, TRACK_OFFSET);
        // Vía Vuelta (Dir 1) -> -Offset
        const lineDir1 = calculateOffsetLine(dir1_stops, -TRACK_OFFSET);
        
        // Agregar trazado de Vía 0 (Ida)
        if (lineDir0.length > 0) {
            plotData.push({
                type: 'scatter',
                mode: 'lines',
                x: lineDir0.map(p => p.stop_lon),
                y: lineDir0.map(p => p.stop_lat),
                line: { color: color, width: 2, shape: 'spline' }, // Spline para suavizado
                hoverinfo: 'text',
                text: lineDir0.map(p => `Línea ${routeId} - Vía Ida<br>Estación: ${p.stop_name}`),
                name: `${routeId} Ida`
            });
            
            // Simular Trenes en Ida
            // Colocamos trenes artificiales en algunas posiciones de la línea
            const trainIdxs = [Math.floor(lineDir0.length * 0.25), Math.floor(lineDir0.length * 0.75)];
            const trainsX = trainIdxs.map(i => lineDir0[i].stop_lon);
            const trainsY = trainIdxs.map(i => lineDir0[i].stop_lat);
            const trainsText = trainIdxs.map(i => {
                const nextStop = lineDir0[Math.min(i+1, lineDir0.length-1)].stop_name;
                const destination = lineDir0[lineDir0.length-1].stop_name;
                return `<b>Tren Sentido ${destination}</b><br>Siguiente Parada: ${nextStop}`;
            });
            
            plotData.push({
                type: 'scatter',
                mode: 'markers',
                x: trainsX,
                y: trainsY,
                marker: { 
                    symbol: 'triangle-up', 
                    size: 10, 
                    color: '#ffffff', 
                    line: {color: color, width: 2} 
                },
                hoverinfo: 'text',
                text: trainsText,
                name: `Trenes ${routeId} Ida`
            });
        }
        
        // Agregar trazado de Vía 1 (Vuelta)
        if (lineDir1.length > 0) {
            plotData.push({
                type: 'scatter',
                mode: 'lines',
                x: lineDir1.map(p => p.stop_lon),
                y: lineDir1.map(p => p.stop_lat),
                line: { color: color, width: 2, shape: 'spline', dash: 'solid' },
                hoverinfo: 'text',
                text: lineDir1.map(p => `Línea ${routeId} - Vía Vuelta<br>Estación: ${p.stop_name}`),
                name: `${routeId} Vuelta`
            });
            
            // Simular Trenes en Vuelta
            const trainIdxs = [Math.floor(lineDir1.length * 0.35), Math.floor(lineDir1.length * 0.85)];
            const trainsX = trainIdxs.map(i => lineDir1[i].stop_lon);
            const trainsY = trainIdxs.map(i => lineDir1[i].stop_lat);
            const trainsText = trainIdxs.map(i => {
                const nextStop = lineDir1[Math.min(i+1, lineDir1.length-1)].stop_name;
                const destination = lineDir1[lineDir1.length-1].stop_name;
                return `<b>Tren Sentido ${destination}</b><br>Siguiente Parada: ${nextStop}`;
            });
            
            plotData.push({
                type: 'scatter',
                mode: 'markers',
                x: trainsX,
                y: trainsY,
                marker: { 
                    symbol: 'triangle-down', 
                    size: 10, 
                    color: '#ffffff', 
                    line: {color: color, width: 2} 
                },
                hoverinfo: 'text',
                text: trainsText,
                name: `Trenes ${routeId} Vuelta`
            });
        }
        
        // Agregar Estaciones Centrales (Originales) para referencia (opcional)
        // Se dibuja un marcador unificado por estación
        const centralPoints = dir0_stops.length > 0 ? dir0_stops : dir1_stops;
        if (centralPoints.length > 0) {
            plotData.push({
                type: 'scatter',
                mode: 'markers',
                x: centralPoints.map(p => p.stop_lon),
                y: centralPoints.map(p => p.stop_lat),
                marker: { size: 6, color: '#f8fafc', line: { color: '#0f172a', width: 1 } },
                hoverinfo: 'text',
                text: centralPoints.map(p => `Estación: ${p.stop_name}`),
                name: `Estaciones ${routeId}`
            });
        }
    });

    Plotly.newPlot(vizContainer, plotData, layout, config);
    
    // Configurar menú de selección de línea
    const lineSelector = document.getElementById('line-selector');
    if (lineSelector) {
        lineSelector.addEventListener('change', (e) => {
            const selectedLine = e.target.value; // 'all', 'L1', 'L2', etc.
            
            const update = {
                visible: plotData.map(trace => {
                    if (selectedLine === 'all') return true;
                    // trace.name contiene la linea, ej: "L1 Ida", "Estaciones L1"
                    return trace.name.includes(selectedLine);
                })
            };
            Plotly.update(vizContainer, update, {}, [0]); // update visibility
        });
    }
    
    // Asegurar resize dinámico del gráfico al cambiar tamaño de ventana
    window.addEventListener('resize', () => {
        Plotly.Plots.resize(vizContainer);
    });
});
