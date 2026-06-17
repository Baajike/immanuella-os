from django.urls import path

from .views import (
    GenerateWeeklyReviewView,
    WeeklyReviewDetailView,
    WeeklyReviewListView,
)


urlpatterns = [
    path("", WeeklyReviewListView.as_view(), name="weekly-review-list"),
    path("generate/", GenerateWeeklyReviewView.as_view(), name="weekly-review-generate-current"),
    path(
        "generate/<str:week_start_date>/",
        GenerateWeeklyReviewView.as_view(),
        name="weekly-review-generate",
    ),
    path("<int:pk>/", WeeklyReviewDetailView.as_view(), name="weekly-review-detail"),
]
