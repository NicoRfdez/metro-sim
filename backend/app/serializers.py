from rest_framework import serializers
from .models import Route, Stop, Trip, StopTime, Shape, PassengerLoad

class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = '__all__'

class StopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stop
        fields = '__all__'

class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = '__all__'

class StopTimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StopTime
        fields = '__all__'

class ShapeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shape
        fields = '__all__'

class PassengerLoadSerializer(serializers.ModelSerializer):
    class Meta:
        model = PassengerLoad
        fields = '__all__'
