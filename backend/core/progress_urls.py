from django.urls import path

from .views import NeverMissTwiceWarningView, StreakListView, TodayDisciplineScoreView


urlpatterns = [
    path("streaks/", StreakListView.as_view(), name="streak-list"),
    path(
        "warnings/never-miss-twice/",
        NeverMissTwiceWarningView.as_view(),
        name="never-miss-twice-warning",
    ),
    path(
        "discipline-score/today/",
        TodayDisciplineScoreView.as_view(),
        name="discipline-score-today",
    ),
]
