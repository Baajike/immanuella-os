from django.urls import path

from .views import (
    AddDailyTaskView,
    CompleteDailyTaskView,
    DailyPlanByDateView,
    MissDailyTaskView,
    RescheduleDailyTaskView,
    SkipDailyTaskView,
    TodayDailyPlanView,
)


urlpatterns = [
    path("today/", TodayDailyPlanView.as_view(), name="daily-plan-today"),
    path("<str:date>/", DailyPlanByDateView.as_view(), name="daily-plan-detail"),
    path("<str:date>/tasks/", AddDailyTaskView.as_view(), name="daily-plan-add-task"),
    path(
        "tasks/<int:daily_task_id>/complete/",
        CompleteDailyTaskView.as_view(),
        name="daily-task-complete",
    ),
    path(
        "tasks/<int:daily_task_id>/miss/",
        MissDailyTaskView.as_view(),
        name="daily-task-miss",
    ),
    path(
        "tasks/<int:daily_task_id>/reschedule/",
        RescheduleDailyTaskView.as_view(),
        name="daily-task-reschedule",
    ),
    path(
        "tasks/<int:daily_task_id>/skip/",
        SkipDailyTaskView.as_view(),
        name="daily-task-skip",
    ),
]
