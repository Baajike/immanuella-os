from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .defaults import create_default_categories_for_user
from .models import Category


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
