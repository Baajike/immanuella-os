from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


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
