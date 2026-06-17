from django.urls import path

from .views import StreakListView, TodayDisciplineScoreView


urlpatterns = [
    path("streaks/", StreakListView.as_view(), name="streak-list"),
    path(
        "discipline-score/today/",
        TodayDisciplineScoreView.as_view(),
        name="discipline-score-today",
    ),
]
