from rest_framework import viewsets
from .models import Route, Stop, Trip, StopTime, Shape, PassengerLoad
from .serializers import RouteSerializer, StopSerializer, TripSerializer, StopTimeSerializer, ShapeSerializer, PassengerLoadSerializer

class RouteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Route.objects.all()
    serializer_class = RouteSerializer

class StopViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stop.objects.all()
    serializer_class = StopSerializer

class TripViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    filterset_fields = ['route', 'direction_id']

class StopTimeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StopTime.objects.all()
    serializer_class = StopTimeSerializer
    filterset_fields = ['trip', 'stop']

class ShapeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Shape.objects.all()
    serializer_class = ShapeSerializer
    filterset_fields = ['shape_id']

class PassengerLoadViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PassengerLoad.objects.all()
    serializer_class = PassengerLoadSerializer
    filterset_fields = ['stop', 'hour']
