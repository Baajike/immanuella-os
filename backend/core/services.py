from datetime import timedelta

from django.utils import timezone

from .models import DailyTask, Streak, Task


COMPLETION_DELTAS = {
    Task.Priority.CRITICAL: 10,
    Task.Priority.HIGH: 10,
    Task.Priority.NORMAL: 5,
    Task.Priority.LOW: 3,
}

MISS_DELTAS = {
    Task.Priority.CRITICAL: -15,
    Task.Priority.HIGH: -15,
    Task.Priority.NORMAL: -8,
    Task.Priority.LOW: -5,
}


def score_delta_for_status(daily_task, status):
    if status == DailyTask.Status.COMPLETED:
        return COMPLETION_DELTAS.get(daily_task.task.priority, 0)
    if status == DailyTask.Status.MISSED:
        return MISS_DELTAS.get(daily_task.task.priority, 0)
    return 0


def apply_daily_task_status(daily_task, status, missed_reason=None):
    previous_scored_status = daily_task.score_applied_status
    previous_delta = score_delta_for_status(daily_task, previous_scored_status)
    new_delta = score_delta_for_status(daily_task, status)

    daily_plan = daily_task.daily_plan
    if previous_scored_status != status:
        daily_plan.discipline_score = (
            daily_plan.discipline_score - previous_delta + new_delta
        )
        daily_plan.save(update_fields=["discipline_score", "updated_at"])

    daily_task.status = status
    if status == DailyTask.Status.COMPLETED and daily_task.completed_at is None:
        daily_task.completed_at = timezone.now()
    if status == DailyTask.Status.MISSED and missed_reason is not None:
        daily_task.missed_reason = missed_reason
    daily_task.score_applied_status = status
    daily_task.save(
        update_fields=[
            "status",
            "completed_at",
            "missed_reason",
            "score_applied_status",
            "updated_at",
        ]
    )

    if status == DailyTask.Status.COMPLETED and previous_scored_status != status:
        update_streak_for_completion(daily_task)

    return daily_task


def update_streak_for_completion(daily_task):
    category = daily_task.task.category
    if category is None:
        return None

    completed_date = daily_task.daily_plan.date
    streak, _ = Streak.objects.get_or_create(
        user=daily_task.daily_plan.user,
        category=category,
        defaults={
            "current_streak": 0,
            "longest_streak": 0,
        },
    )

    if streak.last_completed_date == completed_date:
        return streak

    if streak.last_completed_date == completed_date - timedelta(days=1):
        streak.current_streak += 1
    else:
        streak.current_streak = 1

    streak.last_completed_date = completed_date
    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak
    streak.save(
        update_fields=[
            "current_streak",
            "longest_streak",
            "last_completed_date",
            "updated_at",
        ]
    )
    return streak
