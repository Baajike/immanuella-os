from django.conf import settings
from django.db import models


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(TimestampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7)
    icon = models.CharField(max_length=50)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "name"],
                name="unique_category_name_per_user",
            ),
        ]
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return f"{self.name} ({self.user})"


class Task(TimestampedModel):
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class RepeatType(models.TextChoices):
        NONE = "none", "None"
        DAILY = "daily", "Daily"
        WEEKDAYS = "weekdays", "Weekdays"
        WEEKLY = "weekly", "Weekly"
        CUSTOM = "custom", "Custom"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
    )
    estimated_duration_minutes = models.PositiveIntegerField(default=30)
    due_date = models.DateField(null=True, blank=True)
    repeat_type = models.CharField(
        max_length=20,
        choices=RepeatType.choices,
        default=RepeatType.NONE,
    )
    repeat_days = models.JSONField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["priority", "due_date", "title"]

    def __str__(self):
        return self.title


class DailyPlan(TimestampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_plans",
    )
    date = models.DateField()
    discipline_score = models.IntegerField(default=100)
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"],
                name="unique_daily_plan_per_user_date",
            ),
        ]
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user} plan for {self.date}"


class DailyTask(TimestampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        MISSED = "missed", "Missed"
        SKIPPED = "skipped", "Skipped"
        RESCHEDULED = "rescheduled", "Rescheduled"

    daily_plan = models.ForeignKey(
        DailyPlan,
        on_delete=models.CASCADE,
        related_name="daily_tasks",
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="daily_tasks",
    )
    scheduled_start_time = models.TimeField(null=True, blank=True)
    scheduled_end_time = models.TimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    missed_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["daily_plan", "task", "scheduled_start_time"],
                name="unique_daily_task_slot",
            ),
        ]
        indexes = [
            models.Index(fields=["daily_plan", "status"]),
        ]
        ordering = ["scheduled_start_time", "id"]

    def __str__(self):
        return f"{self.task} on {self.daily_plan.date}"


class Streak(TimestampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="streaks",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="streaks",
    )
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_completed_date = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "category"],
                name="unique_streak_per_user_category",
            ),
        ]
        ordering = ["category__name"]

    def __str__(self):
        return f"{self.category}: {self.current_streak} day streak"


class WeeklyReview(TimestampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="weekly_reviews",
    )
    week_start_date = models.DateField()
    week_end_date = models.DateField()
    total_tasks = models.PositiveIntegerField(default=0)
    completed_tasks = models.PositiveIntegerField(default=0)
    missed_tasks = models.PositiveIntegerField(default=0)
    strongest_category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    weakest_category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    weekly_score = models.IntegerField(default=0)
    summary = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "week_start_date"],
                name="unique_weekly_review_per_user_week",
            ),
        ]
        ordering = ["-week_start_date"]

    def __str__(self):
        return f"{self.user} review: {self.week_start_date} to {self.week_end_date}"
