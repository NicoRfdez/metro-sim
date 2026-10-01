import os
import csv
import unicodedata
from collections import defaultdict
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from app.models import Stop, PassengerLoad

def normalize(s):
    return unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('utf-8').upper().strip()

class Command(BaseCommand):
    help = 'Loads real passenger load data from raw Viajes CSV'

    def handle(self, *args, **kwargs):
        file_path = '/home/nicofdez/Documentos/uc/2026-2/infovis/metro-sim/data/raw/Viajes_2026-04/Tabla de Viajes/2026-04-14.viajes.csv'
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            return

        self.stdout.write('Building station name mappings...')
        
        alias_map = {
            "PARQUE O'HIGGINS": "PARQUE OHIGGINS",
            "PLAZA DE MAIPU": "PLAZA MAIPU",
            "UNION LATINOAMERICANA": "UNION LATINO AMERICANA",
            "RONDIZZONI": "RONDIZONNI",
            "PRESIDENTE PEDRO AGUIRRE CERDA": "PDTE PEDRO AGUIRRE CERDA",
            "PUENTE CAL Y CANTO": "CAL Y CANTO"
        }
        
        base_name_to_stops = defaultdict(list)
        for stop in Stop.objects.all():
            base_name = stop.stop_name.split(' Dirección')[0].split(' Direccion')[0]
            norm_name = normalize(base_name)
            if base_name.upper() in alias_map:
                norm_name = normalize(alias_map[base_name.upper()])
            elif norm_name in alias_map:
                 norm_name = normalize(alias_map[norm_name])
            base_name_to_stops[norm_name].append(stop)
            
        self.stdout.write(f'Mapped {len(base_name_to_stops)} unique base station names.')

        loads = defaultdict(float) # (normalized_station_name, hour) -> accumulated_volume
        
        self.stdout.write('Parsing massive CSV file (this will take a while)...')
        
        # Column indices based on the header analysis
        col_factor_expansion = 1
        cols_tipo_transporte = [12, 13, 14, 15]
        cols_tiempo_subida = [27, 28, 29, 30]
        cols_paradero_subida = [43, 44, 45, 46]

        line_count = 0
        matched_metro_stages = 0

        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            # Skip header
            header = f.readline()
            
            for line in f:
                line_count += 1
                if line_count % 1000000 == 0:
                    self.stdout.write(f'Processed {line_count} lines...')
                    
                cols = line.strip().split('|')
                if len(cols) < 50:
                    continue
                    
                try:
                    factor = float(cols[col_factor_expansion].replace(',', '.')) if cols[col_factor_expansion] not in ('', '-') else 1.0
                except ValueError:
                    factor = 1.0

                for i in range(4):
                    if cols[cols_tipo_transporte[i]] == '2': # 2 means Metro
                        time_str = cols[cols_tiempo_subida[i]]
                        station_str = cols[cols_paradero_subida[i]]
                        
                        if time_str and time_str != '-' and station_str and station_str != '-':
                            try:
                                # Format: YYYY-MM-DD HH:MM:SS
                                hour = int(time_str[11:13])
                                norm_station = normalize(station_str)
                                loads[(norm_station, hour)] += factor
                                matched_metro_stages += 1
                            except Exception:
                                pass

        self.stdout.write(f'Finished reading CSV. Processed {line_count} lines, found {matched_metro_stages} metro boardings.')
        
        # Now update DB
        loads_to_create = []
        
        # Accumulate by actual Stop objects
        unmatched_stations = set()
        
        for (norm_station, hour), volume in loads.items():
            stops = base_name_to_stops.get(norm_station)
            if not stops:
                # Some stations might have slight naming differences, keep track to report
                unmatched_stations.add(norm_station)
                continue
                
            # Distribute volume equally among direction stops
            vol_per_stop = int(volume / len(stops))
            
            for stop in stops:
                loads_to_create.append(PassengerLoad(
                    stop=stop,
                    hour=hour,
                    volume=vol_per_stop
                ))

        if unmatched_stations:
            self.stdout.write(self.style.WARNING(f'Could not match {len(unmatched_stations)} station names from CSV to DB:'))
            # Print first 20 as sample
            self.stdout.write(', '.join(list(unmatched_stations)[:20]))

        self.stdout.write('Writing to database...')
        with transaction.atomic():
            PassengerLoad.objects.all().delete()
            chunk_size = 5000
            for i in range(0, len(loads_to_create), chunk_size):
                PassengerLoad.objects.bulk_create(loads_to_create[i:i+chunk_size])
        
        self.stdout.write(self.style.SUCCESS(f'Successfully loaded {len(loads_to_create)} load records!'))
