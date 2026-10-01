import csv
from django.core.management.base import BaseCommand
from django.db import transaction
from app.models import Stop, Route, PassengerLoad

class Command(BaseCommand):
    help = 'Loads real passenger load data from CSV'

    def handle(self, *args, **kwargs):
        csv_path = '/home/nicofdez/Documentos/uc/2026-2/infovis/metro-sim/data/processed/afluencia_recorridos_por_hora.csv'
        self.stdout.write('Loading real passenger loads...')
        
        # First, map each route to its stops
        route_stops = {}
        # We only care about routes that actually exist in the DB
        for route in Route.objects.all():
            stops = Stop.objects.filter(stop_times__trip__route=route).distinct()
            if stops.exists():
                route_stops[route.route_id] = list(stops)
                
        self.stdout.write(f'Found {len(route_stops)} matching routes in DB.')

        loads = {} # (stop, hour) -> volume

        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=';')
            for row in reader:
                recorrido = row['recorrido']
                hora = int(row['hora'])
                pasajeros = int(row['cantidad_pasajeros'])

                if recorrido in route_stops:
                    stops = route_stops[recorrido]
                    pasajeros_per_stop = pasajeros // len(stops)

                    for stop in stops:
                        key = (stop.stop_id, hora)
                        loads[key] = loads.get(key, 0) + pasajeros_per_stop

        # Now update DB
        loads_to_create = []
        # Get all stops to avoid multiple queries
        stop_map = {s.stop_id: s for s in Stop.objects.all()}

        for (stop_id, hour), vol in loads.items():
            if stop_id in stop_map:
                loads_to_create.append(PassengerLoad(
                    stop=stop_map[stop_id],
                    hour=hour,
                    volume=vol
                ))

        with transaction.atomic():
            PassengerLoad.objects.all().delete()
            chunk_size = 5000
            for i in range(0, len(loads_to_create), chunk_size):
                PassengerLoad.objects.bulk_create(loads_to_create[i:i+chunk_size])
                self.stdout.write(f'Inserted {min(i+chunk_size, len(loads_to_create))}/{len(loads_to_create)} loads...')
        
        self.stdout.write(self.style.SUCCESS(f'Successfully loaded {len(loads_to_create)} real load records!'))
