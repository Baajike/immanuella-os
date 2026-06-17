from rest_framework import generics, permissions, viewsets
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Category
from .serializers import (
    CategorySerializer,
    CurrentUserSerializer,
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
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
