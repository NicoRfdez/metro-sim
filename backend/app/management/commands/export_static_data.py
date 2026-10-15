"""
Exporta los datos que consume el frontend a archivos JSON estáticos.

Permite publicar la web en GitHub Pages (hosting 100% estático) sin depender
del backend Django en tiempo de ejecución.

Uso (desde /backend):
    python manage.py export_static_data
    python manage.py export_static_data --out ../web/public/data

Genera:
    stops.json  -> [{stop_id, stop_name, stop_lat, stop_lon}, ...]
    lines.json  -> {"L1": [{stop, stop_sequence}, ...], ...}
    loads.json  -> {"6": [{stop, volume}, ...], ...}
    meta.json   -> metadatos de la exportación
"""
import json
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from app.models import PassengerLoad, Route, Stop, StopTime, Trip

DEFAULT_OUT = Path(settings.BASE_DIR).parent / 'web' / 'public' / 'data'


class Command(BaseCommand):
    help = 'Exporta stops, topología de líneas y afluencia por hora a JSON estático para el frontend.'

    def add_arguments(self, parser):
        parser.add_argument('--out', type=str, default=str(DEFAULT_OUT),
                            help='Directorio de salida (por defecto: web/public/data)')
        parser.add_argument('--direction', type=int, default=0,
                            help='direction_id usado para obtener la secuencia de estaciones (por defecto: 0)')

    def handle(self, *args, **options):
        out = Path(options['out']).resolve()
        out.mkdir(parents=True, exist_ok=True)
        direction = options['direction']

        # 1. Estaciones (solo los campos que usa el frontend)
        stops = list(Stop.objects.values('stop_id', 'stop_name', 'stop_lat', 'stop_lon'))
        self._write(out / 'stops.json', stops)

        # 2. Topología: misma lógica que el frontend en modo API
        #    (se toma el viaje "del medio" de cada línea y su secuencia de paradas)
        lines = {}
        for route_id in Route.objects.order_by('route_id').values_list('route_id', flat=True):
            trip_ids = list(Trip.objects.filter(route=route_id, direction_id=direction)
                            .values_list('trip_id', flat=True))
            if not trip_ids:
                continue
            trip_id = trip_ids[len(trip_ids) // 2]
            stop_times = (StopTime.objects.filter(trip=trip_id)
                          .order_by('stop_sequence')
                          .values('stop_id', 'stop_sequence'))
            lines[route_id] = [{'stop': st['stop_id'], 'stop_sequence': st['stop_sequence']}
                               for st in stop_times]
        self._write(out / 'lines.json', lines)

        # 3. Afluencia por hora
        loads = {}
        for row in PassengerLoad.objects.order_by('hour', 'stop_id').values('hour', 'stop_id', 'volume'):
            loads.setdefault(str(row['hour']), []).append({'stop': row['stop_id'], 'volume': row['volume']})
        self._write(out / 'loads.json', loads)

        # 4. Metadatos
        self._write(out / 'meta.json', {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'stops': len(stops),
            'lines': {k: len(v) for k, v in lines.items()},
            'hours': sorted(int(h) for h in loads),
        })

        self.stdout.write(self.style.SUCCESS(f'Datos estáticos exportados en {out}'))

    def _write(self, path: Path, data):
        with path.open('w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        self.stdout.write(f'  · {path.name} ({path.stat().st_size / 1024:.1f} KB)')
