from rest_framework import generics, permissions, viewsets
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Category, Task
from .serializers import (
    CategorySerializer,
    CurrentUserSerializer,
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    TaskSerializer,
)


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
