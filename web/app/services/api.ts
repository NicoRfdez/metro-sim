const API_BASE_URL = 'http://localhost:8000/api';

export const metroApi = {
    // Obtener información de un viaje específico para sacar su recorrido (L1, L2, etc)
    getTripsByRoute: async (routeId: string, directionId: number = 0) => {
        const res = await fetch(`${API_BASE_URL}/trips/?route=${routeId}&direction_id=${directionId}`);
        if (!res.ok) throw new Error('Failed to fetch trips');
        return res.json();
    },

    // Obtener la secuencia de paradas de un viaje
    getStopTimesByTrip: async (tripId: string) => {
        const res = await fetch(`${API_BASE_URL}/stoptimes/?trip=${tripId}`);
        if (!res.ok) throw new Error('Failed to fetch stop times');
        return res.json();
    },

    // Obtener la información de todas las paradas (coordenadas)
    getAllStops: async () => {
        const res = await fetch(`${API_BASE_URL}/stops/`);
        if (!res.ok) throw new Error('Failed to fetch stops');
        return res.json();
    },
    
    // Opcional: Obtener todos los shapes (trazados precisos)
    getShapes: async (shapeId: string) => {
        const res = await fetch(`${API_BASE_URL}/shapes/?shape_id=${shapeId}`);
        if (!res.ok) throw new Error('Failed to fetch shapes');
        return res.json();
    },

    // Obtener la afluencia de pasajeros por hora
    getPassengerLoads: async (hour: number) => {
        const res = await fetch(`${API_BASE_URL}/loads/?hour=${hour}`);
        if (!res.ok) throw new Error('Failed to fetch passenger loads');
        return res.json();
    }
};
