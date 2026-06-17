from django.urls import path

from .views import NextRecommendationView


urlpatterns = [
    path("next/", NextRecommendationView.as_view(), name="recommendation-next"),
]
