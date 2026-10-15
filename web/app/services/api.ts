import { asset } from '../lib/paths';

/**
 * Capa de acceso a datos con dos modos:
 *
 * - Modo estático (por defecto): lee los JSON pre-generados en /public/data
 *   (`python manage.py export_static_data`). Es el modo usado en GitHub Pages.
 * - Modo API: si se define NEXT_PUBLIC_API_URL (ej. http://localhost:8000/api),
 *   consulta en vivo el backend Django.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
export const USE_STATIC_DATA = API_BASE_URL === '';

export interface Stop {
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
}

export interface StopTime {
    stop: string;
    stop_sequence: number;
}

export interface Trip {
    trip_id: string;
}

export interface PassengerLoad {
    stop: string;
    volume: number;
}

export interface ShapePoint {
    shape_id: string;
    shape_pt_lat: number;
    shape_pt_lon: number;
    shape_pt_sequence: number;
}

const getJson = async <T>(url: string, errorMsg: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${errorMsg} (${res.status})`);
    return res.json() as Promise<T>;
};

// Cache de archivos estáticos para no descargarlos más de una vez
const staticCache = new Map<string, Promise<unknown>>();
const getStatic = <T>(file: string): Promise<T> => {
    if (!staticCache.has(file)) {
        const promise = getJson<T>(asset(`/data/${file}`), `Failed to load ${file}`);
        // Si falla, se elimina del cache para permitir reintentos
        promise.catch(() => staticCache.delete(file));
        staticCache.set(file, promise);
    }
    return staticCache.get(file) as Promise<T>;
};

export const metroApi = {
    // Obtener información de un viaje específico para sacar su recorrido (L1, L2, etc)
    getTripsByRoute: (routeId: string, directionId: number = 0) =>
        getJson<Trip[]>(`${API_BASE_URL}/trips/?route=${routeId}&direction_id=${directionId}`, 'Failed to fetch trips'),

    // Obtener la secuencia de paradas de un viaje
    getStopTimesByTrip: (tripId: string) =>
        getJson<StopTime[]>(`${API_BASE_URL}/stoptimes/?trip=${tripId}`, 'Failed to fetch stop times'),

    // Obtener la información de todas las paradas (coordenadas)
    getAllStops: (): Promise<Stop[]> =>
        USE_STATIC_DATA
            ? getStatic<Stop[]>('stops.json')
            : getJson<Stop[]>(`${API_BASE_URL}/stops/`, 'Failed to fetch stops'),

    // Secuencia ordenada de estaciones de una línea (sentido direction_id = 0).
    // En modo API se toma el viaje "del medio" de la línea y sus stop_times.
    getLineStops: async (line: string): Promise<StopTime[]> => {
        if (USE_STATIC_DATA) {
            const lines = await getStatic<Record<string, StopTime[]>>('lines.json');
            return lines[line] ?? [];
        }
        const trips = await metroApi.getTripsByRoute(line, 0);
        if (trips.length === 0) return [];
        const tripId = trips[Math.floor(trips.length / 2)].trip_id;
        const stopTimes = await metroApi.getStopTimesByTrip(tripId);
        return [...stopTimes].sort((a, b) => a.stop_sequence - b.stop_sequence);
    },

    // Opcional: Obtener todos los shapes (trazados precisos). Solo disponible en modo API.
    getShapes: (shapeId: string) =>
        getJson<ShapePoint[]>(`${API_BASE_URL}/shapes/?shape_id=${shapeId}`, 'Failed to fetch shapes'),

    // Obtener la afluencia de pasajeros por hora
    getPassengerLoads: async (hour: number): Promise<PassengerLoad[]> => {
        if (USE_STATIC_DATA) {
            const loads = await getStatic<Record<string, PassengerLoad[]>>('loads.json');
            return loads[String(hour)] ?? [];
        }
        return getJson<PassengerLoad[]>(`${API_BASE_URL}/loads/?hour=${hour}`, 'Failed to fetch passenger loads');
    },
};
