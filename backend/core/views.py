from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Category, DailyPlan, DailyTask, Streak, Task, WeeklyReview
from .serializers import (
    AddDailyTaskSerializer,
    CategorySerializer,
    CurrentUserSerializer,
    DailyPlanSerializer,
    DailyTaskSerializer,
    EmailTokenObtainPairSerializer,
    MissDailyTaskSerializer,
    RecommendationDailyTaskSerializer,
    RegisterSerializer,
    RescheduleDailyTaskSerializer,
    StreakSerializer,
    TaskSerializer,
    WeeklyReviewSerializer,
)
from .recommendations import get_next_daily_task_recommendation
from .services import apply_daily_task_status
from .weekly_reviews import generate_weekly_review
from .warning_services import get_never_miss_twice_warnings


class RegisterView(generics.CreateAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class CurrentUserView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CurrentUserSerializer

    def get_object(self):
        return self.request.user


class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = (
            Task.objects.filter(user=self.request.user)
            .select_related("category")
        )

        filters = {
            "category": "category_id",
            "priority": "priority",
            "repeat_type": "repeat_type",
            "due_date": "due_date",
        }
        for param, field_name in filters.items():
            value = self.request.query_params.get(param)
            if value not in (None, ""):
                queryset = queryset.filter(**{field_name: value})

        is_active = self.request.query_params.get("is_active")
        if is_active not in (None, ""):
            normalized = is_active.strip().lower()
            if normalized in {"true", "1", "yes"}:
                queryset = queryset.filter(is_active=True)
            elif normalized in {"false", "0", "no"}:
                queryset = queryset.filter(is_active=False)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DailyPlanBaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_plan(self, date_value):
        return (
            DailyPlan.objects.prefetch_related(
                "daily_tasks__task__category",
            )
            .filter(user=self.request.user, date=date_value)
            .first()
        )

    def parse_date_or_400(self, date_string):
        date_value = parse_date(date_string)
        if date_value is None:
            return None, Response(
                {"date": ["Enter a valid date in YYYY-MM-DD format."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return date_value, None


class TodayDailyPlanView(DailyPlanBaseView):
    def get(self, request):
        plan, _ = DailyPlan.objects.get_or_create(
            user=request.user,
            date=timezone.localdate(),
            defaults={"discipline_score": 100},
        )
        plan = self.get_plan(plan.date)
        return Response(DailyPlanSerializer(plan).data)


class DailyPlanByDateView(DailyPlanBaseView):
    def get(self, request, date):
        date_value, error = self.parse_date_or_400(date)
        if error:
            return error

        plan = self.get_plan(date_value)
        if plan is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(DailyPlanSerializer(plan).data)


class AddDailyTaskView(DailyPlanBaseView):
    def post(self, request, date):
        date_value, error = self.parse_date_or_400(date)
        if error:
            return error

        serializer = AddDailyTaskSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        plan, _ = DailyPlan.objects.get_or_create(
            user=request.user,
            date=date_value,
            defaults={"discipline_score": 100},
        )
        task = Task.objects.get(id=serializer.validated_data["task_id"], user=request.user)
        daily_task, created = DailyTask.objects.get_or_create(
            daily_plan=plan,
            task=task,
            scheduled_start_time=serializer.validated_data.get("scheduled_start_time"),
            defaults={
                "scheduled_end_time": serializer.validated_data.get("scheduled_end_time"),
                "status": DailyTask.Status.PENDING,
            },
        )
        if not created and "scheduled_end_time" in serializer.validated_data:
            daily_task.scheduled_end_time = serializer.validated_data.get("scheduled_end_time")
            daily_task.save(update_fields=["scheduled_end_time", "updated_at"])

        return Response(
            DailyTaskSerializer(daily_task).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DailyTaskActionBaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_daily_task(self, daily_task_id):
        return (
            DailyTask.objects.select_related("daily_plan", "task", "task__category")
            .filter(id=daily_task_id, daily_plan__user=self.request.user)
            .first()
        )


class CompleteDailyTaskView(DailyTaskActionBaseView):
    def patch(self, request, daily_task_id):
        daily_task = self.get_daily_task(daily_task_id)
        if daily_task is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        daily_task = apply_daily_task_status(daily_task, DailyTask.Status.COMPLETED)
        return Response(DailyTaskSerializer(daily_task).data)


class MissDailyTaskView(DailyTaskActionBaseView):
    def patch(self, request, daily_task_id):
        daily_task = self.get_daily_task(daily_task_id)
        if daily_task is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = MissDailyTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        daily_task = apply_daily_task_status(
            daily_task,
            DailyTask.Status.MISSED,
            missed_reason=serializer.validated_data.get("missed_reason", ""),
        )
        return Response(DailyTaskSerializer(daily_task).data)


class SkipDailyTaskView(DailyTaskActionBaseView):
    def patch(self, request, daily_task_id):
        daily_task = self.get_daily_task(daily_task_id)
        if daily_task is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        daily_task = apply_daily_task_status(daily_task, DailyTask.Status.SKIPPED)
        return Response(DailyTaskSerializer(daily_task).data)


class RescheduleDailyTaskView(DailyTaskActionBaseView):
    def patch(self, request, daily_task_id):
        daily_task = self.get_daily_task(daily_task_id)
        if daily_task is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = RescheduleDailyTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_date = serializer.validated_data.get("target_date", daily_task.daily_plan.date)
        scheduled_start_time = serializer.validated_data["scheduled_start_time"]
        scheduled_end_time = serializer.validated_data.get("scheduled_end_time")

        if target_date == daily_task.daily_plan.date:
            daily_task.scheduled_start_time = scheduled_start_time
            daily_task.scheduled_end_time = scheduled_end_time
            daily_task.save(
                update_fields=["scheduled_start_time", "scheduled_end_time", "updated_at"],
            )
            return Response(DailyTaskSerializer(daily_task).data)

        daily_task.status = DailyTask.Status.RESCHEDULED
        daily_task.save(update_fields=["status", "updated_at"])
        target_plan, _ = DailyPlan.objects.get_or_create(
            user=request.user,
            date=target_date,
            defaults={"discipline_score": 100},
        )
        new_daily_task, _ = DailyTask.objects.get_or_create(
            daily_plan=target_plan,
            task=daily_task.task,
            scheduled_start_time=scheduled_start_time,
            defaults={
                "scheduled_end_time": scheduled_end_time,
                "status": DailyTask.Status.PENDING,
            },
        )
        return Response(
            {
                "original": DailyTaskSerializer(daily_task).data,
                "new": DailyTaskSerializer(new_daily_task).data,
            }
        )


class StreakListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StreakSerializer
    pagination_class = None

    def get_queryset(self):
        return Streak.objects.filter(user=self.request.user).select_related("category")


class TodayDisciplineScoreView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        plan, _ = DailyPlan.objects.get_or_create(
            user=request.user,
            date=today,
            defaults={"discipline_score": 100},
        )
        return Response(
            {
                "date": plan.date,
                "discipline_score": plan.discipline_score,
            }
        )


class NeverMissTwiceWarningView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        warnings = get_never_miss_twice_warnings(request.user)
        return Response(
            {
                "has_warning": bool(warnings),
                "warnings": warnings,
            }
        )


class NextRecommendationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        recommendation = get_next_daily_task_recommendation(request.user)
        daily_task = recommendation["recommended_task"]

        return Response(
            {
                "recommended_task": (
                    RecommendationDailyTaskSerializer(daily_task).data
                    if daily_task is not None
                    else None
                ),
                "reason": recommendation["reason"],
                "message": recommendation["message"],
                "current_time": recommendation["current_time"],
                "date": recommendation["date"],
            }
        )


class WeeklyReviewListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WeeklyReviewSerializer

    def get_queryset(self):
        return (
            WeeklyReview.objects.filter(user=self.request.user)
            .select_related("strongest_category", "weakest_category")
        )


class WeeklyReviewDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WeeklyReviewSerializer

    def get_queryset(self):
        return (
            WeeklyReview.objects.filter(user=self.request.user)
            .select_related("strongest_category", "weakest_category")
        )


class GenerateWeeklyReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, week_start_date=None):
        date_value = None
        if week_start_date is not None:
            date_value = parse_date(week_start_date)
            if date_value is None:
                return Response(
                    {"week_start_date": ["Enter a valid date in YYYY-MM-DD format."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        review, created = generate_weekly_review(request.user, date_value)
        return Response(
            WeeklyReviewSerializer(review).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
