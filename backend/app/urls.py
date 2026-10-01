from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'routes', views.RouteViewSet)
router.register(r'stops', views.StopViewSet)
router.register(r'trips', views.TripViewSet)
router.register(r'stoptimes', views.StopTimeViewSet)
router.register(r'shapes', views.ShapeViewSet)
router.register(r'loads', views.PassengerLoadViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
