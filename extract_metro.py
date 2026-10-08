import csv
import json
import os

base_path = os.path.join(os.path.dirname(__file__), 'data', 'raw')

def read_csv(filename):
    with open(os.path.join(base_path, filename), 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

routes = read_csv('routes.txt')
trips = read_csv('trips.txt')
stop_times = read_csv('stop_times.txt')
stops = read_csv('stops.txt')

# Filtrar rutas de metro
metro_routes = [r for r in routes if r['route_id'] in ['L1', 'L2', 'L3', 'L4', 'L4A', 'L5', 'L6']]
metro_route_ids = set(r['route_id'] for r in metro_routes)

# Filtrar viajes de metro
metro_trips = [t for t in trips if t['route_id'] in metro_route_ids]
metro_trip_ids = set(t['trip_id'] for t in metro_trips)

# Crear un mapa rápido para trips: trip_id -> (route_id, direction_id)
trip_info = {t['trip_id']: {'route_id': t['route_id'], 'direction_id': t['direction_id']} for t in metro_trips}

# Filtrar stop_times y extraer secuencia
metro_stop_times = [st for st in stop_times if st['trip_id'] in metro_trip_ids]
metro_stop_ids = set(st['stop_id'] for st in metro_stop_times)

# Agrupar las estaciones por ruta y sentido (para dibujar las líneas)
# Para cada trip, guardamos la secuencia de stops
trips_stops = {}
for st in metro_stop_times:
    tid = st['trip_id']
    if tid not in trips_stops:
        trips_stops[tid] = []
    trips_stops[tid].append({'stop_id': st['stop_id'], 'seq': int(st['stop_sequence'])})

# Para cada ruta y dirección, tomar el trip más largo como representativo para trazar la línea
route_paths = {}
for tid, stops_seq in trips_stops.items():
    r_id = trip_info[tid]['route_id']
    d_id = trip_info[tid]['direction_id']
    key = f"{r_id}_{d_id}"
    
    stops_seq.sort(key=lambda x: x['seq'])
    
    if key not in route_paths or len(stops_seq) > len(route_paths[key]):
        route_paths[key] = [s['stop_id'] for s in stops_seq]

# Filtrar stops de metro
metro_stops_data = {}
for s in stops:
    if s['stop_id'] in metro_stop_ids:
        metro_stops_data[s['stop_id']] = {
            'stop_name': s['stop_name'],
            'stop_lat': float(s['stop_lat']),
            'stop_lon': float(s['stop_lon'])
        }

output = {
    'routes': {r['route_id']: r['route_color'] for r in metro_routes},
    'stops': metro_stops_data,
    'paths': route_paths
}

output_path = os.path.join(os.path.dirname(__file__), 'web', 'public', 'metro_data.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f)
print("Data extracted successfully with built-in csv!")
