from django.db import models

class Route(models.Model):
    route_id = models.CharField(max_length=50, primary_key=True)
    agency_id = models.CharField(max_length=50, null=True, blank=True)
    route_short_name = models.CharField(max_length=50, null=True, blank=True)
    route_long_name = models.CharField(max_length=255, null=True, blank=True)
    route_desc = models.TextField(null=True, blank=True)
    route_type = models.IntegerField()
    route_url = models.URLField(null=True, blank=True)
    route_color = models.CharField(max_length=10, null=True, blank=True)
    route_text_color = models.CharField(max_length=10, null=True, blank=True)

    def __str__(self):
        return self.route_short_name or self.route_id

class Stop(models.Model):
    stop_id = models.CharField(max_length=50, primary_key=True)
    stop_code = models.CharField(max_length=50, null=True, blank=True)
    stop_name = models.CharField(max_length=255)
    stop_lat = models.FloatField()
    stop_lon = models.FloatField()
    stop_url = models.URLField(null=True, blank=True)
    wheelchair_boarding = models.IntegerField(null=True, blank=True)
    location_type = models.IntegerField(null=True, blank=True)
    parent_station = models.CharField(max_length=50, null=True, blank=True)
    level_id = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return self.stop_name

class Trip(models.Model):
    trip_id = models.CharField(max_length=100, primary_key=True)
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='trips')
    service_id = models.CharField(max_length=50)
    trip_headsign = models.CharField(max_length=255, null=True, blank=True)
    direction_id = models.IntegerField(null=True, blank=True)
    shape_id = models.CharField(max_length=100, null=True, blank=True)
    trip_short_name = models.CharField(max_length=50, null=True, blank=True)
    wheelchair_accessible = models.IntegerField(null=True, blank=True)
    bikes_allowed = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.trip_id

class StopTime(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='stop_times')
    arrival_time = models.CharField(max_length=20)
    departure_time = models.CharField(max_length=20)
    stop = models.ForeignKey(Stop, on_delete=models.CASCADE, related_name='stop_times')
    stop_sequence = models.IntegerField()
    pickup_type = models.IntegerField(null=True, blank=True)
    drop_off_type = models.IntegerField(null=True, blank=True)
    timepoint = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('trip', 'stop_sequence')

    def __str__(self):
        return f"{self.trip_id} - {self.stop_id} - {self.stop_sequence}"

class Shape(models.Model):
    shape_id = models.CharField(max_length=100, db_index=True)
    shape_pt_lat = models.FloatField()
    shape_pt_lon = models.FloatField()
    shape_pt_sequence = models.IntegerField()

    class Meta:
        unique_together = ('shape_id', 'shape_pt_sequence')
        indexes = [
            models.Index(fields=['shape_id']),
        ]

    def __str__(self):
        return f"{self.shape_id} - {self.shape_pt_sequence}"
