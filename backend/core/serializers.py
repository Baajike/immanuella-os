from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .defaults import create_default_categories_for_user
from .models import Category, DailyPlan, DailyTask, Streak, Task, WeeklyReview
from .weekly_reviews import count_skipped_tasks_for_review


User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    created_at = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "password", "name", "created_at"]

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(
            username=validated_data["email"],
            email=validated_data["email"],
            first_name=validated_data.get("first_name", ""),
        )
        user.set_password(password)
        user.save()
        create_default_categories_for_user(user)
        return user


class CurrentUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name")
    created_at = serializers.DateTimeField(source="date_joined")

    class Meta:
        model = User
        fields = ["id", "email", "name", "created_at"]


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise AuthenticationFailed("No active account found with the given credentials")

        self.user = authenticate(
            request=self.context.get("request"),
            username=user.get_username(),
            password=attrs.get("password"),
        )

        if self.user is None or not self.user.is_active:
            raise AuthenticationFailed("No active account found with the given credentials")

        refresh = self.get_token(self.user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "color", "icon", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "color"]


class TaskSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.none(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "category",
            "priority",
            "estimated_duration_minutes",
            "due_date",
            "repeat_type",
            "repeat_days",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            self.fields["category"].queryset = Category.objects.filter(user=request.user)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["category"] = (
            TaskCategorySerializer(instance.category).data
            if instance.category_id
            else None
        )
        return data


class DailyTaskSummarySerializer(serializers.ModelSerializer):
    category = TaskCategorySerializer(read_only=True)

    class Meta:
        model = Task
        fields = ["id", "title", "category", "priority", "estimated_duration_minutes"]


class DailyTaskSerializer(serializers.ModelSerializer):
    task = DailyTaskSummarySerializer(read_only=True)

    class Meta:
        model = DailyTask
        fields = [
            "id",
            "task",
            "scheduled_start_time",
            "scheduled_end_time",
            "status",
            "completed_at",
            "missed_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class RecommendationTaskSerializer(serializers.ModelSerializer):
    category = TaskCategorySerializer(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "category",
            "priority",
            "estimated_duration_minutes",
            "due_date",
        ]


class RecommendationDailyTaskSerializer(serializers.ModelSerializer):
    task = RecommendationTaskSerializer(read_only=True)

    class Meta:
        model = DailyTask
        fields = [
            "id",
            "task",
            "scheduled_start_time",
            "scheduled_end_time",
            "status",
            "created_at",
        ]


class StreakSerializer(serializers.ModelSerializer):
    category = TaskCategorySerializer(read_only=True)

    class Meta:
        model = Streak
        fields = [
            "id",
            "category",
            "current_streak",
            "longest_streak",
            "last_completed_date",
        ]


class DailyPlanSerializer(serializers.ModelSerializer):
    daily_tasks = DailyTaskSerializer(many=True, read_only=True)

    class Meta:
        model = DailyPlan
        fields = [
            "id",
            "date",
            "discipline_score",
            "notes",
            "daily_tasks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "discipline_score", "daily_tasks", "created_at", "updated_at"]


class AddDailyTaskSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()
    scheduled_start_time = serializers.TimeField(required=False, allow_null=True)
    scheduled_end_time = serializers.TimeField(required=False, allow_null=True)

    def validate_task_id(self, value):
        request = self.context["request"]
        if not Task.objects.filter(id=value, user=request.user).exists():
            raise serializers.ValidationError("Task does not exist.")
        return value


class MissDailyTaskSerializer(serializers.Serializer):
    missed_reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


class RescheduleDailyTaskSerializer(serializers.Serializer):
    scheduled_start_time = serializers.TimeField(required=True)
    scheduled_end_time = serializers.TimeField(required=False, allow_null=True)
    target_date = serializers.DateField(required=False)


class WeeklyReviewSerializer(serializers.ModelSerializer):
    strongest_category = TaskCategorySerializer(read_only=True)
    weakest_category = TaskCategorySerializer(read_only=True)
    skipped_tasks = serializers.SerializerMethodField()
    completion_rate = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyReview
        fields = [
            "id",
            "week_start_date",
            "week_end_date",
            "total_tasks",
            "completed_tasks",
            "missed_tasks",
            "skipped_tasks",
            "completion_rate",
            "strongest_category",
            "weakest_category",
            "weekly_score",
            "summary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_skipped_tasks(self, obj):
        if hasattr(obj, "skipped_tasks_value"):
            return obj.skipped_tasks_value
        return count_skipped_tasks_for_review(obj)

    def get_completion_rate(self, obj):
        if obj.total_tasks == 0:
            return 0
        return round((obj.completed_tasks / obj.total_tasks) * 100)
