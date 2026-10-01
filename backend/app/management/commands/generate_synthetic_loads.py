import math
import random
from django.core.management.base import BaseCommand
from django.db import transaction
from app.models import Stop, PassengerLoad

class Command(BaseCommand):
    help = 'Generates synthetic passenger load data for Metro stops'

    def handle(self, *args, **kwargs):
        self.stdout.write('Generating synthetic passenger loads...')
        
        stops = Stop.objects.all()
        loads_to_create = []

        # Peak hours config
        # AM Peak: 7-9 (max at 8)
        # PM Peak: 17-19 (max at 18)
        # We will use normal distributions to scale the load based on hour

        for stop in stops:
            # Generate a base multiplier for the station based on random size
            # E.g. Tobalaba/Baquedano have larger multipliers
            # We don't have transfer info easily without looking at lines, but we'll assign random base size
            # 10% of stations are HUGE, 30% are Medium, 60% are small
            rand_val = random.random()
            if rand_val > 0.9:
                base_capacity = random.randint(1500, 2500)
            elif rand_val > 0.6:
                base_capacity = random.randint(500, 1000)
            else:
                base_capacity = random.randint(100, 400)

            for hour in range(24):
                # Calculate scaling factor based on hour of day
                # Base load is very low at night
                if hour < 6 or hour > 23:
                    scale = 0.05
                else:
                    # distance to AM peak (8)
                    dist_am = abs(hour - 8)
                    am_factor = math.exp(-(dist_am**2) / 3.0)  # Spread 

                    # distance to PM peak (18)
                    dist_pm = abs(hour - 18)
                    pm_factor = math.exp(-(dist_pm**2) / 3.0)

                    # base daytime load
                    day_factor = 0.3 if 9 <= hour <= 17 else 0.1

                    scale = max(am_factor, pm_factor, day_factor)

                # Add some noise
                noise = random.uniform(0.8, 1.2)
                volume = int(base_capacity * scale * noise)

                # Metro is closed roughly 23:00 to 06:00
                if hour < 6:
                    volume = 0

                loads_to_create.append(PassengerLoad(
                    stop=stop,
                    hour=hour,
                    volume=volume
                ))

        with transaction.atomic():
            PassengerLoad.objects.all().delete()
            # Bulk create in chunks
            chunk_size = 5000
            for i in range(0, len(loads_to_create), chunk_size):
                PassengerLoad.objects.bulk_create(loads_to_create[i:i+chunk_size])
                self.stdout.write(f'Inserted {min(i+chunk_size, len(loads_to_create))}/{len(loads_to_create)} loads...')

        self.stdout.write(self.style.SUCCESS(f'Successfully generated {len(loads_to_create)} load records!'))
