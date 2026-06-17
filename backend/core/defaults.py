from .models import Category


DEFAULT_CATEGORIES = [
    {"name": "Work", "color": "#2563EB", "icon": "briefcase"},
    {"name": "Backend", "color": "#3B82F6", "icon": "code"},
    {"name": "Cybersecurity", "color": "#EF4444", "icon": "shield"},
    {"name": "Spanish", "color": "#10B981", "icon": "languages"},
    {"name": "Personal Projects", "color": "#8B5CF6", "icon": "folder-kanban"},
    {"name": "Chores", "color": "#F59E0B", "icon": "home"},
    {"name": "Health", "color": "#14B8A6", "icon": "heart-pulse"},
    {"name": "Rest", "color": "#6366F1", "icon": "moon"},
    {"name": "Admin", "color": "#64748B", "icon": "clipboard-list"},
]


def create_default_categories_for_user(user):
    for category in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(
            user=user,
            name=category["name"],
            defaults={
                "color": category["color"],
                "icon": category["icon"],
            },
        )
