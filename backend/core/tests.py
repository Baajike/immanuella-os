from datetime import date, datetime, time
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .defaults import DEFAULT_CATEGORIES, create_default_categories_for_user
from .models import Category, DailyPlan, DailyTask, Streak, Task


User = get_user_model()


@override_settings(
    SECRET_KEY="test-secret-key-for-jwt-signing-at-least-32-characters",
    SIMPLE_JWT={
        "SIGNING_KEY": "test-secret-key-for-jwt-signing-at-least-32-characters",
    },
)
class AuthEndpointTests(APITestCase):
    def test_register_creates_user_with_email_and_name(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "immanuella@example.com",
                "password": "StrongPassword123",
                "name": "Immanuella",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "immanuella@example.com")
        self.assertEqual(response.data["name"], "Immanuella")
        self.assertNotIn("password", response.data)
        self.assertTrue(User.objects.filter(email="immanuella@example.com").exists())

    def test_registration_creates_default_categories(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "immanuella@example.com",
                "password": "StrongPassword123",
                "name": "Immanuella",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="immanuella@example.com")
        self.assertEqual(user.categories.count(), len(DEFAULT_CATEGORIES))
        self.assertEqual(
            set(user.categories.values_list("name", flat=True)),
            {category["name"] for category in DEFAULT_CATEGORIES},
        )

    def test_each_new_user_gets_their_own_default_categories(self):
        first_response = self.client.post(
            reverse("auth-register"),
            {
                "email": "immanuella@example.com",
                "password": "StrongPassword123",
                "name": "Immanuella",
            },
            format="json",
        )
        second_response = self.client.post(
            reverse("auth-register"),
            {
                "email": "ama@example.com",
                "password": "StrongPassword123",
                "name": "Ama",
            },
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        first_user = User.objects.get(email="immanuella@example.com")
        second_user = User.objects.get(email="ama@example.com")
        self.assertEqual(first_user.categories.count(), len(DEFAULT_CATEGORIES))
        self.assertEqual(second_user.categories.count(), len(DEFAULT_CATEGORIES))
        self.assertEqual(
            set(first_user.categories.values_list("name", flat=True)),
            set(second_user.categories.values_list("name", flat=True)),
        )

    def test_default_categories_are_not_shared_between_users(self):
        self.client.post(
            reverse("auth-register"),
            {
                "email": "immanuella@example.com",
                "password": "StrongPassword123",
                "name": "Immanuella",
            },
            format="json",
        )
        self.client.post(
            reverse("auth-register"),
            {
                "email": "ama@example.com",
                "password": "StrongPassword123",
                "name": "Ama",
            },
            format="json",
        )

        first_user = User.objects.get(email="immanuella@example.com")
        second_user = User.objects.get(email="ama@example.com")
        first_category_ids = set(first_user.categories.values_list("id", flat=True))
        second_category_ids = set(second_user.categories.values_list("id", flat=True))

        self.assertEqual(first_category_ids & second_category_ids, set())

    def test_default_category_creation_is_idempotent_for_user(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "immanuella@example.com",
                "password": "StrongPassword123",
                "name": "Immanuella",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="immanuella@example.com")
        create_default_categories_for_user(user)

        self.assertEqual(user.categories.count(), len(DEFAULT_CATEGORIES))

    def test_current_user_requires_authentication(self):
        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_returns_access_and_refresh_tokens(self):
        User.objects.create_user(
            username="immanuella@example.com",
            email="immanuella@example.com",
            password="StrongPassword123",
            first_name="Immanuella",
        )

        response = self.client.post(
            reverse("auth-login"),
            {
                "email": "immanuella@example.com",
                "password": "StrongPassword123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_current_user_returns_authenticated_user(self):
        user = User.objects.create_user(
            username="immanuella@example.com",
            email="immanuella@example.com",
            password="StrongPassword123",
            first_name="Immanuella",
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], user.id)
        self.assertEqual(response.data["email"], "immanuella@example.com")
        self.assertEqual(response.data["name"], "Immanuella")


class CategoryEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="immanuella@example.com",
            email="immanuella@example.com",
            password="StrongPassword123",
            first_name="Immanuella",
        )
        self.other_user = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="StrongPassword123",
            first_name="Other",
        )

    def test_unauthenticated_users_cannot_access_categories(self):
        response = self.client.get(reverse("category-list"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_create_category(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("category-list"),
            {
                "name": "Spanish",
                "color": "#10B981",
                "icon": "language",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        category = Category.objects.get(id=response.data["id"])
        self.assertEqual(category.user, self.user)
        self.assertEqual(category.name, "Spanish")

    def test_authenticated_user_can_list_only_their_own_categories(self):
        self.client.force_authenticate(user=self.user)
        own_category = Category.objects.create(
            user=self.user,
            name="Backend",
            color="#3B82F6",
            icon="code",
        )
        Category.objects.create(
            user=self.other_user,
            name="Cybersecurity",
            color="#EF4444",
            icon="shield",
        )

        response = self.client.get(reverse("category-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], own_category.id)

    def test_authenticated_user_can_update_their_own_category(self):
        self.client.force_authenticate(user=self.user)
        category = Category.objects.create(
            user=self.user,
            name="Spanish",
            color="#10B981",
            icon="language",
        )

        response = self.client.patch(
            reverse("category-detail", args=[category.id]),
            {"color": "#22C55E"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        category.refresh_from_db()
        self.assertEqual(category.color, "#22C55E")

    def test_authenticated_user_cannot_update_another_users_category(self):
        self.client.force_authenticate(user=self.user)
        category = Category.objects.create(
            user=self.other_user,
            name="Cybersecurity",
            color="#EF4444",
            icon="shield",
        )

        response = self.client.patch(
            reverse("category-detail", args=[category.id]),
            {"color": "#22C55E"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        category.refresh_from_db()
        self.assertEqual(category.color, "#EF4444")

    def test_authenticated_user_can_delete_their_own_category(self):
        self.client.force_authenticate(user=self.user)
        category = Category.objects.create(
            user=self.user,
            name="Spanish",
            color="#10B981",
            icon="language",
        )

        response = self.client.delete(reverse("category-detail", args=[category.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=category.id).exists())

    def test_authenticated_user_cannot_delete_another_users_category(self):
        self.client.force_authenticate(user=self.user)
        category = Category.objects.create(
            user=self.other_user,
            name="Cybersecurity",
            color="#EF4444",
            icon="shield",
        )

        response = self.client.delete(reverse("category-detail", args=[category.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Category.objects.filter(id=category.id).exists())


class TaskEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="immanuella@example.com",
            email="immanuella@example.com",
            password="StrongPassword123",
            first_name="Immanuella",
        )
        self.other_user = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="StrongPassword123",
            first_name="Other",
        )
        self.category = Category.objects.create(
            user=self.user,
            name="Backend Custom",
            color="#3B82F6",
            icon="code",
        )
        self.other_category = Category.objects.create(
            user=self.other_user,
            name="Cybersecurity Custom",
            color="#EF4444",
            icon="shield",
        )

    def test_unauthenticated_users_cannot_access_tasks(self):
        response = self.client.get(reverse("task-list"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_create_task(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("task-list"),
            {
                "title": "Backend study session",
                "description": "Work through DRF tutorial",
                "category": self.category.id,
                "priority": "high",
                "estimated_duration_minutes": 60,
                "due_date": "2026-06-20",
                "repeat_type": "weekdays",
                "repeat_days": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.user, self.user)
        self.assertEqual(task.category, self.category)
        self.assertEqual(response.data["category"]["id"], self.category.id)

    def test_authenticated_user_can_list_only_their_own_tasks(self):
        self.client.force_authenticate(user=self.user)
        own_task = Task.objects.create(
            user=self.user,
            category=self.category,
            title="Backend study session",
            priority="high",
            repeat_type="weekdays",
            due_date=date(2026, 6, 20),
        )
        Task.objects.create(
            user=self.other_user,
            category=self.other_category,
            title="Other user task",
            priority="critical",
            repeat_type="daily",
        )

        response = self.client.get(reverse("task-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], own_task.id)

    def test_authenticated_user_can_filter_their_tasks(self):
        self.client.force_authenticate(user=self.user)
        matching_task = Task.objects.create(
            user=self.user,
            category=self.category,
            title="Matching task",
            priority="high",
            repeat_type="weekdays",
            due_date=date(2026, 6, 20),
            is_active=True,
        )
        Task.objects.create(
            user=self.user,
            category=self.category,
            title="Non matching task",
            priority="low",
            repeat_type="daily",
            due_date=date(2026, 6, 21),
            is_active=False,
        )

        response = self.client.get(
            reverse("task-list"),
            {
                "category": self.category.id,
                "priority": "high",
                "repeat_type": "weekdays",
                "is_active": "true",
                "due_date": "2026-06-20",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], matching_task.id)

    def test_authenticated_user_can_update_their_own_task(self):
        self.client.force_authenticate(user=self.user)
        task = Task.objects.create(
            user=self.user,
            category=self.category,
            title="Backend study session",
            priority="normal",
        )

        response = self.client.patch(
            reverse("task-detail", args=[task.id]),
            {"priority": "critical", "estimated_duration_minutes": 90},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.priority, "critical")
        self.assertEqual(task.estimated_duration_minutes, 90)

    def test_authenticated_user_can_delete_their_own_task(self):
        self.client.force_authenticate(user=self.user)
        task = Task.objects.create(
            user=self.user,
            category=self.category,
            title="Backend study session",
        )

        response = self.client.delete(reverse("task-detail", args=[task.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=task.id).exists())

    def test_user_cannot_create_task_using_another_users_category(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("task-list"),
            {
                "title": "Suspicious task",
                "category": self.other_category.id,
                "priority": "high",
                "estimated_duration_minutes": 30,
                "repeat_type": "none",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", response.data)
        self.assertFalse(Task.objects.filter(title="Suspicious task").exists())

    def test_user_cannot_update_task_to_use_another_users_category(self):
        self.client.force_authenticate(user=self.user)
        task = Task.objects.create(
            user=self.user,
            category=self.category,
            title="Backend study session",
        )

        response = self.client.patch(
            reverse("task-detail", args=[task.id]),
            {"category": self.other_category.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", response.data)
        task.refresh_from_db()
        self.assertEqual(task.category, self.category)


class DailyPlanEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="immanuella@example.com",
            email="immanuella@example.com",
            password="StrongPassword123",
            first_name="Immanuella",
        )
        self.other_user = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="StrongPassword123",
            first_name="Other",
        )
        self.category = Category.objects.create(
            user=self.user,
            name="Backend Custom",
            color="#3B82F6",
            icon="code",
        )
        self.other_category = Category.objects.create(
            user=self.other_user,
            name="Other Category",
            color="#EF4444",
            icon="shield",
        )
        self.task = Task.objects.create(
            user=self.user,
            category=self.category,
            title="Backend study session",
            priority="high",
        )
        self.other_task = Task.objects.create(
            user=self.other_user,
            category=self.other_category,
            title="Other user task",
            priority="normal",
        )

    def test_unauthenticated_users_cannot_access_daily_plan_endpoints(self):
        response = self.client.get(reverse("daily-plan-today"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_get_or_create_todays_plan(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("daily-plan-today"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["date"], str(timezone.localdate()))
        self.assertTrue(
            DailyPlan.objects.filter(user=self.user, date=timezone.localdate()).exists()
        )

    def test_authenticated_user_can_get_plan_by_date(self):
        self.client.force_authenticate(user=self.user)
        plan = DailyPlan.objects.create(user=self.user, date=date(2026, 6, 20))

        response = self.client.get(reverse("daily-plan-detail", args=["2026-06-20"]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], plan.id)
        self.assertEqual(response.data["date"], "2026-06-20")

    def test_user_cannot_access_another_users_daily_plan(self):
        self.client.force_authenticate(user=self.user)
        DailyPlan.objects.create(user=self.other_user, date=date(2026, 6, 20))

        response = self.client.get(reverse("daily-plan-detail", args=["2026-06-20"]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_add_their_own_task_to_daily_plan(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("daily-plan-add-task", args=["2026-06-20"]),
            {
                "task_id": self.task.id,
                "scheduled_start_time": "19:00:00",
                "scheduled_end_time": "20:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        daily_task = DailyTask.objects.get(id=response.data["id"])
        self.assertEqual(daily_task.daily_plan.user, self.user)
        self.assertEqual(daily_task.daily_plan.date, date(2026, 6, 20))
        self.assertEqual(daily_task.task, self.task)
        self.assertEqual(daily_task.status, DailyTask.Status.PENDING)

    def test_user_cannot_add_another_users_task_to_their_daily_plan(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("daily-plan-add-task", args=["2026-06-20"]),
            {"task_id": self.other_task.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("task_id", response.data)
        self.assertFalse(
            DailyTask.objects.filter(task=self.other_task, daily_plan__user=self.user).exists()
        )

    def test_user_can_mark_daily_task_completed(self):
        self.client.force_authenticate(user=self.user)
        daily_task = self.create_daily_task()

        response = self.client.patch(reverse("daily-task-complete", args=[daily_task.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        daily_task.refresh_from_db()
        self.assertEqual(daily_task.status, DailyTask.Status.COMPLETED)
        self.assertIsNotNone(daily_task.completed_at)

    def test_user_can_mark_daily_task_missed(self):
        self.client.force_authenticate(user=self.user)
        daily_task = self.create_daily_task()

        response = self.client.patch(
            reverse("daily-task-miss", args=[daily_task.id]),
            {"missed_reason": "Ran out of time"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        daily_task.refresh_from_db()
        self.assertEqual(daily_task.status, DailyTask.Status.MISSED)
        self.assertEqual(daily_task.missed_reason, "Ran out of time")

    def test_user_can_reschedule_daily_task(self):
        self.client.force_authenticate(user=self.user)
        daily_task = self.create_daily_task()

        response = self.client.patch(
            reverse("daily-task-reschedule", args=[daily_task.id]),
            {
                "scheduled_start_time": "21:00:00",
                "scheduled_end_time": "21:30:00",
                "target_date": "2026-06-21",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        daily_task.refresh_from_db()
        self.assertEqual(daily_task.status, DailyTask.Status.RESCHEDULED)
        self.assertEqual(response.data["original"]["id"], daily_task.id)
        self.assertEqual(response.data["new"]["status"], DailyTask.Status.PENDING)
        self.assertTrue(
            DailyTask.objects.filter(
                daily_plan__user=self.user,
                daily_plan__date=date(2026, 6, 21),
                task=self.task,
                scheduled_start_time="21:00:00",
            ).exists()
        )

    def test_user_can_skip_daily_task(self):
        self.client.force_authenticate(user=self.user)
        daily_task = self.create_daily_task()

        response = self.client.patch(reverse("daily-task-skip", args=[daily_task.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        daily_task.refresh_from_db()
        self.assertEqual(daily_task.status, DailyTask.Status.SKIPPED)

    def create_daily_task(self):
        plan = DailyPlan.objects.create(user=self.user, date=date(2026, 6, 20))
        return DailyTask.objects.create(daily_plan=plan, task=self.task)


class StreakAndDisciplineScoreTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="immanuella@example.com",
            email="immanuella@example.com",
            password="StrongPassword123",
            first_name="Immanuella",
        )
        self.other_user = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="StrongPassword123",
            first_name="Other",
        )
        self.category = Category.objects.create(
            user=self.user,
            name="Backend Custom",
            color="#3B82F6",
            icon="code",
        )
        self.task = Task.objects.create(
            user=self.user,
            category=self.category,
            title="Backend study session",
            priority=Task.Priority.HIGH,
        )

    def test_completing_high_priority_daily_task_increases_discipline_score(self):
        self.client.force_authenticate(user=self.user)
        daily_task = self.create_daily_task(priority=Task.Priority.HIGH)

        response = self.client.patch(reverse("daily-task-complete", args=[daily_task.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        daily_task.daily_plan.refresh_from_db()
        self.assertEqual(daily_task.daily_plan.discipline_score, 110)

    def test_missing_high_priority_daily_task_decreases_discipline_score(self):
        self.client.force_authenticate(user=self.user)
        daily_task = self.create_daily_task(priority=Task.Priority.HIGH)

        response = self.client.patch(reverse("daily-task-miss", args=[daily_task.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        daily_task.daily_plan.refresh_from_db()
        self.assertEqual(daily_task.daily_plan.discipline_score, 85)

    def test_skipping_task_does_not_penalize_score(self):
        self.client.force_authenticate(user=self.user)
        daily_task = self.create_daily_task(priority=Task.Priority.HIGH)

        response = self.client.patch(reverse("daily-task-skip", args=[daily_task.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        daily_task.daily_plan.refresh_from_db()
        self.assertEqual(daily_task.daily_plan.discipline_score, 100)

    def test_marking_same_task_complete_twice_does_not_double_count_score(self):
        self.client.force_authenticate(user=self.user)
        daily_task = self.create_daily_task(priority=Task.Priority.HIGH)

        first_response = self.client.patch(reverse("daily-task-complete", args=[daily_task.id]))
        second_response = self.client.patch(reverse("daily-task-complete", args=[daily_task.id]))

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        daily_task.daily_plan.refresh_from_db()
        self.assertEqual(daily_task.daily_plan.discipline_score, 110)

    def test_completing_tasks_on_consecutive_days_increments_streak(self):
        self.client.force_authenticate(user=self.user)
        first = self.create_daily_task(plan_date=date(2026, 6, 20))
        second = self.create_daily_task(plan_date=date(2026, 6, 21))

        self.client.patch(reverse("daily-task-complete", args=[first.id]))
        self.client.patch(reverse("daily-task-complete", args=[second.id]))

        streak = Streak.objects.get(user=self.user, category=self.category)
        self.assertEqual(streak.current_streak, 2)
        self.assertEqual(streak.longest_streak, 2)
        self.assertEqual(streak.last_completed_date, date(2026, 6, 21))

    def test_completing_after_date_gap_resets_streak(self):
        self.client.force_authenticate(user=self.user)
        first = self.create_daily_task(plan_date=date(2026, 6, 20))
        second = self.create_daily_task(plan_date=date(2026, 6, 22))

        self.client.patch(reverse("daily-task-complete", args=[first.id]))
        self.client.patch(reverse("daily-task-complete", args=[second.id]))

        streak = Streak.objects.get(user=self.user, category=self.category)
        self.assertEqual(streak.current_streak, 1)
        self.assertEqual(streak.last_completed_date, date(2026, 6, 22))

    def test_longest_streak_updates_correctly(self):
        self.client.force_authenticate(user=self.user)
        first = self.create_daily_task(plan_date=date(2026, 6, 20))
        second = self.create_daily_task(plan_date=date(2026, 6, 21))
        third = self.create_daily_task(plan_date=date(2026, 6, 23))

        self.client.patch(reverse("daily-task-complete", args=[first.id]))
        self.client.patch(reverse("daily-task-complete", args=[second.id]))
        self.client.patch(reverse("daily-task-complete", args=[third.id]))

        streak = Streak.objects.get(user=self.user, category=self.category)
        self.assertEqual(streak.current_streak, 1)
        self.assertEqual(streak.longest_streak, 2)

    def test_tasks_without_category_do_not_create_streaks(self):
        self.client.force_authenticate(user=self.user)
        task = Task.objects.create(
            user=self.user,
            category=None,
            title="Uncategorized task",
            priority=Task.Priority.NORMAL,
        )
        plan = DailyPlan.objects.create(user=self.user, date=date(2026, 6, 20))
        daily_task = DailyTask.objects.create(daily_plan=plan, task=task)

        response = self.client.patch(reverse("daily-task-complete", args=[daily_task.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Streak.objects.filter(user=self.user).exists())

    def test_users_cannot_access_another_users_streaks_or_score(self):
        other_category = Category.objects.create(
            user=self.other_user,
            name="Other Category",
            color="#EF4444",
            icon="shield",
        )
        Streak.objects.create(
            user=self.other_user,
            category=other_category,
            current_streak=7,
            longest_streak=7,
            last_completed_date=date(2026, 6, 20),
        )
        DailyPlan.objects.create(
            user=self.other_user,
            date=timezone.localdate(),
            discipline_score=42,
        )
        self.client.force_authenticate(user=self.user)

        streak_response = self.client.get(reverse("streak-list"))
        score_response = self.client.get(reverse("discipline-score-today"))

        self.assertEqual(streak_response.status_code, status.HTTP_200_OK)
        self.assertEqual(streak_response.data, [])
        self.assertEqual(score_response.status_code, status.HTTP_200_OK)
        self.assertEqual(score_response.data["discipline_score"], 100)

    def test_unauthenticated_users_cannot_access_streak_or_score_endpoints(self):
        streak_response = self.client.get(reverse("streak-list"))
        score_response = self.client.get(reverse("discipline-score-today"))

        self.assertEqual(streak_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(score_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def create_daily_task(self, priority=Task.Priority.HIGH, plan_date=None):
        if plan_date is None:
            plan_date = date(2026, 6, 20)
        self.task.priority = priority
        self.task.save(update_fields=["priority", "updated_at"])
        plan = DailyPlan.objects.create(user=self.user, date=plan_date)
        return DailyTask.objects.create(daily_plan=plan, task=self.task)


class RecommendationEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="immanuella@example.com",
            email="immanuella@example.com",
            password="StrongPassword123",
            first_name="Immanuella",
        )
        self.other_user = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="StrongPassword123",
            first_name="Other",
        )
        self.category = Category.objects.create(
            user=self.user,
            name="Backend Custom",
            color="#3B82F6",
            icon="code",
        )
        self.other_category = Category.objects.create(
            user=self.other_user,
            name="Other Category",
            color="#EF4444",
            icon="shield",
        )

    def test_unauthenticated_users_cannot_access_recommendation_endpoint(self):
        response = self.client.get(reverse("recommendation-next"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_with_no_daily_plan_gets_empty_recommendation_response(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("recommendation-next"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["recommended_task"])
        self.assertIn("No daily plan", response.data["reason"])
        self.assertIn("message", response.data)

    def test_user_with_no_pending_or_missed_tasks_gets_empty_recommendation_response(self):
        self.client.force_authenticate(user=self.user)
        self.create_daily_task(status=DailyTask.Status.COMPLETED)

        response = self.client.get(reverse("recommendation-next"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["recommended_task"])
        self.assertIn("no pending or missed", response.data["reason"].lower())

    def test_missed_tasks_are_recommended_before_pending_tasks(self):
        self.client.force_authenticate(user=self.user)
        pending_task = self.create_daily_task(
            title="Pending critical task",
            priority=Task.Priority.CRITICAL,
            status=DailyTask.Status.PENDING,
        )
        missed_task = self.create_daily_task(
            title="Missed low task",
            priority=Task.Priority.LOW,
            status=DailyTask.Status.MISSED,
        )

        response = self.client.get(reverse("recommendation-next"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["recommended_task"]["id"], missed_task.id)
        self.assertNotEqual(response.data["recommended_task"]["id"], pending_task.id)

    def test_high_priority_task_is_recommended_before_low_priority_task(self):
        self.client.force_authenticate(user=self.user)
        low_task = self.create_daily_task(
            title="Low priority task",
            priority=Task.Priority.LOW,
        )
        high_task = self.create_daily_task(
            title="High priority task",
            priority=Task.Priority.HIGH,
        )

        response = self.client.get(reverse("recommendation-next"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["recommended_task"]["id"], high_task.id)
        self.assertNotEqual(response.data["recommended_task"]["id"], low_task.id)

    def test_due_scheduled_task_is_recommended_before_later_scheduled_task(self):
        self.client.force_authenticate(user=self.user)
        current_datetime = datetime(2026, 6, 17, 12, 0, tzinfo=timezone.get_current_timezone())
        due_task = self.create_daily_task(
            title="Due scheduled task",
            priority=Task.Priority.NORMAL,
            scheduled_start_time=time(11, 0),
        )
        later_task = self.create_daily_task(
            title="Later scheduled task",
            priority=Task.Priority.NORMAL,
            scheduled_start_time=time(15, 0),
        )

        with patch("core.recommendations.timezone.localtime", return_value=current_datetime):
            response = self.client.get(reverse("recommendation-next"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["recommended_task"]["id"], due_task.id)
        self.assertNotEqual(response.data["recommended_task"]["id"], later_task.id)

    def test_user_never_receives_another_users_daily_task(self):
        self.client.force_authenticate(user=self.user)
        own_task = self.create_daily_task(
            title="Own low task",
            priority=Task.Priority.LOW,
        )
        self.create_daily_task(
            user=self.other_user,
            category=self.other_category,
            title="Other missed critical task",
            priority=Task.Priority.CRITICAL,
            status=DailyTask.Status.MISSED,
        )

        response = self.client.get(reverse("recommendation-next"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["recommended_task"]["id"], own_task.id)
        self.assertEqual(response.data["recommended_task"]["task"]["title"], "Own low task")

    def test_endpoint_returns_expected_response_shape(self):
        self.client.force_authenticate(user=self.user)
        self.create_daily_task(title="Shape task", priority=Task.Priority.HIGH)

        response = self.client.get(reverse("recommendation-next"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data.keys()),
            {"recommended_task", "reason", "message", "current_time", "date"},
        )
        self.assertEqual(
            set(response.data["recommended_task"].keys()),
            {
                "id",
                "task",
                "scheduled_start_time",
                "scheduled_end_time",
                "status",
                "created_at",
            },
        )
        self.assertIn("title", response.data["recommended_task"]["task"])
        self.assertIn("priority", response.data["recommended_task"]["task"])

    def create_daily_task(
        self,
        user=None,
        category=None,
        title="Backend study session",
        priority=Task.Priority.NORMAL,
        status=DailyTask.Status.PENDING,
        scheduled_start_time=None,
    ):
        if user is None:
            user = self.user
        if category is None:
            category = self.category if user == self.user else self.other_category

        plan, _ = DailyPlan.objects.get_or_create(
            user=user,
            date=timezone.localdate(),
            defaults={"discipline_score": 100},
        )
        task = Task.objects.create(
            user=user,
            category=category,
            title=title,
            priority=priority,
        )
        return DailyTask.objects.create(
            daily_plan=plan,
            task=task,
            status=status,
            scheduled_start_time=scheduled_start_time,
        )
