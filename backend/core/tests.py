from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .defaults import DEFAULT_CATEGORIES, create_default_categories_for_user
from .models import Category


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
