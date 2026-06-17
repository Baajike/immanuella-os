from collections import defaultdict
from datetime import timedelta

from django.utils import timezone

from .models import DailyTask, WeeklyReview


def get_week_start(value):
    return value - timedelta(days=value.weekday())


def generate_weekly_review(user, week_start_date=None):
    if week_start_date is None:
        week_start_date = timezone.localdate()

    week_start_date = get_week_start(week_start_date)
    week_end_date = week_start_date + timedelta(days=6)

    daily_tasks = list(
        DailyTask.objects.select_related("task", "task__category")
        .filter(
            daily_plan__user=user,
            daily_plan__date__gte=week_start_date,
            daily_plan__date__lte=week_end_date,
        )
    )

    total_tasks = len(daily_tasks)
    completed_tasks = _count_by_status(daily_tasks, DailyTask.Status.COMPLETED)
    missed_tasks = _count_by_status(daily_tasks, DailyTask.Status.MISSED)
    skipped_tasks = _count_by_status(daily_tasks, DailyTask.Status.SKIPPED)
    completion_rate = _completion_rate(completed_tasks, total_tasks)
    strongest_category, weakest_category = _category_extremes(daily_tasks)
    weekly_score = completion_rate
    summary = _build_summary(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        missed_tasks=missed_tasks,
        skipped_tasks=skipped_tasks,
        completion_rate=completion_rate,
        strongest_category=strongest_category,
        weakest_category=weakest_category,
    )

    review, created = WeeklyReview.objects.update_or_create(
        user=user,
        week_start_date=week_start_date,
        defaults={
            "week_end_date": week_end_date,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "missed_tasks": missed_tasks,
            "strongest_category": strongest_category,
            "weakest_category": weakest_category,
            "weekly_score": weekly_score,
            "summary": summary,
        },
    )
    review.skipped_tasks_value = skipped_tasks
    return review, created


def count_skipped_tasks_for_review(review):
    return DailyTask.objects.filter(
        daily_plan__user=review.user,
        daily_plan__date__gte=review.week_start_date,
        daily_plan__date__lte=review.week_end_date,
        status=DailyTask.Status.SKIPPED,
    ).count()


def _count_by_status(daily_tasks, status):
    return sum(1 for daily_task in daily_tasks if daily_task.status == status)


def _completion_rate(completed_tasks, total_tasks):
    if total_tasks == 0:
        return 0
    return round((completed_tasks / total_tasks) * 100)


def _category_extremes(daily_tasks):
    stats = defaultdict(lambda: {"total": 0, "completed": 0, "missed": 0})
    for daily_task in daily_tasks:
        category = daily_task.task.category
        if category is None:
            continue

        stats[category]["total"] += 1
        if daily_task.status == DailyTask.Status.COMPLETED:
            stats[category]["completed"] += 1
        if daily_task.status == DailyTask.Status.MISSED:
            stats[category]["missed"] += 1

    if not stats:
        return None, None

    def strongest_key(item):
        category, values = item
        rate = values["completed"] / values["total"]
        return (rate, values["completed"], -category.id)

    def weakest_key(item):
        category, values = item
        rate = values["completed"] / values["total"]
        return (rate, -values["missed"], category.id)

    strongest_category = max(stats.items(), key=strongest_key)[0]
    weakest_category = min(stats.items(), key=weakest_key)[0]
    return strongest_category, weakest_category


def _build_summary(
    total_tasks,
    completed_tasks,
    missed_tasks,
    skipped_tasks,
    completion_rate,
    strongest_category,
    weakest_category,
):
    if total_tasks == 0:
        return "No tasks were scheduled this week. Plan a small, clear week and give yourself something real to review."

    summary = (
        f"This week you completed {completed_tasks} of {total_tasks} tasks "
        f"({completion_rate}%)."
    )
    if missed_tasks:
        summary += f" {missed_tasks} task(s) were missed."
    if skipped_tasks:
        summary += f" {skipped_tasks} task(s) were intentionally skipped."
    if strongest_category is not None:
        summary += f" {strongest_category.name} was your strongest category."
    if weakest_category is not None:
        summary += f" Give {weakest_category.name} a cleaner first block next week."
    return summary
