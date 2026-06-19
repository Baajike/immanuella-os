from datetime import timedelta

from django.utils import timezone

from .models import DailyTask


def get_never_miss_twice_warnings(user, today=None):
    today = today or timezone.localdate()
    yesterday = today - timedelta(days=1)
    required_dates = {yesterday, today}
    missed_tasks = (
        DailyTask.objects.filter(
            daily_plan__user=user,
            daily_plan__date__in=required_dates,
            status=DailyTask.Status.MISSED,
            task__category__isnull=False,
        )
        .values(
            "task__category_id",
            "task__category__name",
            "task__category__color",
            "daily_plan__date",
        )
        .order_by("task__category__name", "task__category_id")
    )

    categories = {}
    for missed_task in missed_tasks:
        category_id = missed_task["task__category_id"]
        category = categories.setdefault(
            category_id,
            {
                "id": category_id,
                "name": missed_task["task__category__name"],
                "color": missed_task["task__category__color"],
                "dates": set(),
            },
        )
        category["dates"].add(missed_task["daily_plan__date"])

    warnings = []
    for category in categories.values():
        if category["dates"] != required_dates:
            continue

        category_name = category["name"]
        warnings.append(
            {
                "category": {
                    "id": category["id"],
                    "name": category_name,
                    "color": category["color"],
                },
                "message": (
                    f"{category_name} has been missed 2 days in a row. "
                    "One miss is life. Two is a pattern. Do one small session today."
                ),
                "dates": [yesterday.isoformat(), today.isoformat()],
            }
        )

    return warnings
