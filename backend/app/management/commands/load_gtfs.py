import os
import csv
from django.core.management.base import BaseCommand
from django.db import transaction
from app.models import Route, Trip, Stop, StopTime, Shape

class Command(BaseCommand):
    help = 'Loads Metro GTFS data from text files into the database'

    def handle(self, *args, **kwargs):
        base_path = '/home/nicofdez/Documentos/uc/2026-2/infovis/metro-sim/data/raw/GTFS_20260829'
        
        # 1. Load Routes
        self.stdout.write('Loading Routes...')
        metro_routes = ['L1', 'L2', 'L3', 'L4', 'L4A', 'L5', 'L6']
        valid_routes = set()
        routes_to_create = []
        with open(os.path.join(base_path, 'routes.txt'), encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['route_id'] in metro_routes:
                    valid_routes.add(row['route_id'])
                    routes_to_create.append(Route(
                        route_id=row['route_id'],
                        agency_id=row.get('agency_id'),
                        route_short_name=row.get('route_short_name'),
                        route_long_name=row.get('route_long_name'),
                        route_desc=row.get('route_desc'),
                        route_type=int(row['route_type']) if row.get('route_type') else 0,
                        route_url=row.get('route_url'),
                        route_color=row.get('route_color'),
                        route_text_color=row.get('route_text_color')
                    ))
        Route.objects.all().delete()
        Route.objects.bulk_create(routes_to_create)
        self.stdout.write(f'Loaded {len(routes_to_create)} routes.')

        # 2. Load Trips
        self.stdout.write('Loading Trips...')
        valid_trips = set()
        valid_shapes = set()
        trips_to_create = []
        with open(os.path.join(base_path, 'trips.txt'), encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['route_id'] in valid_routes:
                    valid_trips.add(row['trip_id'])
                    if row.get('shape_id'):
                        valid_shapes.add(row['shape_id'])
                    trips_to_create.append(Trip(
                        trip_id=row['trip_id'],
                        route_id=row['route_id'],
                        service_id=row.get('service_id'),
                        trip_headsign=row.get('trip_headsign'),
                        direction_id=int(row['direction_id']) if row.get('direction_id') else None,
                        shape_id=row.get('shape_id'),
                        trip_short_name=row.get('trip_short_name'),
                        wheelchair_accessible=int(row['wheelchair_accessible']) if row.get('wheelchair_accessible') else None,
                        bikes_allowed=int(row['bikes_allowed']) if row.get('bikes_allowed') else None,
                    ))
        Trip.objects.all().delete()
        Trip.objects.bulk_create(trips_to_create)
        self.stdout.write(f'Loaded {len(trips_to_create)} trips.')

        # 3. Load Stop Times to find valid stops
        self.stdout.write('Loading Stop Times (this may take a bit)...')
        valid_stops = set()
        stop_times_to_create = []
        with open(os.path.join(base_path, 'stop_times.txt'), encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['trip_id'] in valid_trips:
                    valid_stops.add(row['stop_id'])
                    stop_times_to_create.append(StopTime(
                        trip_id=row['trip_id'],
                        arrival_time=row['arrival_time'],
                        departure_time=row['departure_time'],
                        stop_id=row['stop_id'],
                        stop_sequence=int(row['stop_sequence']),
                        pickup_type=int(row['pickup_type']) if row.get('pickup_type') else None,
                        drop_off_type=int(row['drop_off_type']) if row.get('drop_off_type') else None,
                        timepoint=int(row['timepoint']) if row.get('timepoint') else None,
                    ))
        
        # 4. Load Stops
        self.stdout.write('Loading Stops...')
        stops_to_create = []
        with open(os.path.join(base_path, 'stops.txt'), encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['stop_id'] in valid_stops:
                    stops_to_create.append(Stop(
                        stop_id=row['stop_id'],
                        stop_code=row.get('stop_code'),
                        stop_name=row['stop_name'],
                        stop_lat=float(row['stop_lat']),
                        stop_lon=float(row['stop_lon']),
                        stop_url=row.get('stop_url'),
                        wheelchair_boarding=int(row['wheelchair_boarding']) if row.get('wheelchair_boarding') else None,
                        location_type=int(row['location_type']) if row.get('location_type') else None,
                        parent_station=row.get('parent_station'),
                        level_id=row.get('level_id'),
                    ))
        Stop.objects.all().delete()
        Stop.objects.bulk_create(stops_to_create)
        self.stdout.write(f'Loaded {len(stops_to_create)} stops.')

        # Insert stop_times now that Stops and Trips are in DB
        StopTime.objects.all().delete()
        
        # Bulk create stop times in chunks
        chunk_size = 50000
        for i in range(0, len(stop_times_to_create), chunk_size):
            StopTime.objects.bulk_create(stop_times_to_create[i:i+chunk_size])
            self.stdout.write(f'Inserted {min(i+chunk_size, len(stop_times_to_create))}/{len(stop_times_to_create)} stop times...')

        # 5. Load Shapes
        self.stdout.write('Loading Shapes (this may take a bit)...')
        shapes_to_create = []
        Shape.objects.all().delete()
        with open(os.path.join(base_path, 'shapes.txt'), encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['shape_id'] in valid_shapes:
                    shapes_to_create.append(Shape(
                        shape_id=row['shape_id'],
                        shape_pt_lat=float(row['shape_pt_lat']),
                        shape_pt_lon=float(row['shape_pt_lon']),
                        shape_pt_sequence=int(row['shape_pt_sequence'])
                    ))
                    
                    if len(shapes_to_create) >= chunk_size:
                        Shape.objects.bulk_create(shapes_to_create)
                        shapes_to_create = []
        if shapes_to_create:
            Shape.objects.bulk_create(shapes_to_create)
        
        count_shapes = Shape.objects.count()
        self.stdout.write(f'Loaded {count_shapes} shape points.')
        self.stdout.write(self.style.SUCCESS('Successfully loaded GTFS data!'))
