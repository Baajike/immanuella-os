from django.utils import timezone

from .models import DailyPlan, DailyTask, Task


PRIORITY_RANKS = {
    Task.Priority.CRITICAL: 0,
    Task.Priority.HIGH: 0,
    Task.Priority.NORMAL: 1,
    Task.Priority.LOW: 2,
}

STATUS_RANKS = {
    DailyTask.Status.MISSED: 0,
    DailyTask.Status.PENDING: 1,
}


def get_next_daily_task_recommendation(user):
    today = timezone.localdate()
    current_datetime = timezone.localtime()
    current_time = current_datetime.time().replace(microsecond=0)

    plan = (
        DailyPlan.objects.prefetch_related("daily_tasks__task__category")
        .filter(user=user, date=today)
        .first()
    )
    if plan is None:
        return _empty_recommendation(
            today,
            current_time,
            reason="No daily plan exists for today yet.",
            message="Start by planning one small next step, or rest if today is already complete.",
        )

    candidates = list(
        DailyTask.objects.select_related("task", "task__category")
        .filter(
            daily_plan=plan,
            status__in=[DailyTask.Status.PENDING, DailyTask.Status.MISSED],
        )
    )
    if not candidates:
        return _empty_recommendation(
            today,
            current_time,
            reason="There are no pending or missed tasks for today.",
            message="All clear for now. Rest, reset, or plan the next useful thing.",
        )

    recommended_task = sorted(
        candidates,
        key=lambda daily_task: _recommendation_sort_key(daily_task, current_time),
    )[0]

    return {
        "recommended_task": recommended_task,
        "reason": _build_reason(recommended_task, current_time),
        "message": _build_message(recommended_task),
        "current_time": current_time,
        "date": today,
    }


def _empty_recommendation(plan_date, current_time, reason, message):
    return {
        "recommended_task": None,
        "reason": reason,
        "message": message,
        "current_time": current_time,
        "date": plan_date,
    }


def _recommendation_sort_key(daily_task, current_time):
    return (
        STATUS_RANKS[daily_task.status],
        PRIORITY_RANKS.get(daily_task.task.priority, 1),
        *_scheduled_time_key(daily_task.scheduled_start_time, current_time),
        daily_task.created_at,
        daily_task.id,
    )


def _scheduled_time_key(scheduled_start_time, current_time):
    if scheduled_start_time is None:
        return (2, 24 * 60)

    current_minutes = _minutes_since_midnight(current_time)
    scheduled_minutes = _minutes_since_midnight(scheduled_start_time)
    if scheduled_minutes <= current_minutes:
        return (0, current_minutes - scheduled_minutes)
    return (1, scheduled_minutes - current_minutes)


def _minutes_since_midnight(value):
    return value.hour * 60 + value.minute


def _build_reason(daily_task, current_time):
    if daily_task.status == DailyTask.Status.MISSED:
        return "This task was missed, so it gets first attention."

    priority = daily_task.task.get_priority_display().lower()
    if (
        daily_task.scheduled_start_time is not None
        and daily_task.scheduled_start_time <= current_time
    ):
        return f"This {priority} priority task is scheduled and due now."

    return f"This is the highest priority pending task for today."


def _build_message(daily_task):
    if daily_task.status == DailyTask.Status.MISSED:
        return "Pick this back up gently and finish one focused step."
    if daily_task.task.priority in [Task.Priority.CRITICAL, Task.Priority.HIGH]:
        return "This one matters. Give it a focused block and make visible progress."
    return "This is a good next step. Keep it simple and move it forward."
