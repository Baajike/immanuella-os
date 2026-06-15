# ImmanuellaOS — Database Design

## 1. Database Overview

- **Engine**: PostgreSQL
- **Framework**: Django ORM (models defined as Django models, migrations
  managed via `manage.py makemigrations` / `migrate`)
- **Multi-tenancy**: All user-owned data is scoped via a `user` foreign key,
  even though the MVP has a single real user. This keeps the schema clean if
  the app is shared later.
- **Primary keys**: All models use Django's default auto-incrementing
  `id` (BigAutoField) unless otherwise noted.
- **Timestamps**: All models include `created_at` (auto_now_add) and
  `updated_at` (auto_now) unless noted otherwise.
- **Soft deletes**: Not implemented in MVP. Deletes are hard deletes. Tasks
  that are no longer wanted should be set `is_active = False` instead of
  deleted, to preserve history for streaks/reviews.

## 2. Entity Overview

| Model         | Purpose                                                        |
|---------------|-----------------------------------------------------------------|
| User          | Auth + identity (Django's built-in User, extended if needed)   |
| Category      | Life areas: Work, Backend, Cybersecurity, Spanish, etc.         |
| Task          | A definable unit of work, optionally recurring                 |
| DailyPlan     | One row per user per date, holds discipline score + notes      |
| DailyTask     | A task scheduled into a specific day's plan, with status       |
| Streak        | Per-user, per-category streak tracking                          |
| WeeklyReview  | Per-user, per-week summary and grade                             |

### Relationship summary

- `User` 1—N `Category`
- `User` 1—N `Task`
- `Category` 1—N `Task`
- `User` 1—N `DailyPlan`
- `DailyPlan` 1—N `DailyTask`
- `Task` 1—N `DailyTask` (a task can appear in many daily plans if recurring)
- `User` 1—N `Streak` (one Streak row per Category per User)
- `Category` 1—N `Streak`
- `User` 1—N `WeeklyReview`

```
User
 ├── Category (user)
 │     └── Task (category)
 │           └── DailyTask (task)
 ├── Task (user)
 ├── DailyPlan (user)
 │     └── DailyTask (daily_plan)
 ├── Streak (user, category)
 └── WeeklyReview (user)
```

## 3. Models

### 3.1 User

Use Django's built-in `auth.User` model for the MVP (provides `id`, `username`
or `email`, `password`, `date_joined`, etc.). If custom fields are needed
later (e.g. timezone), extend via a `Profile` model with a OneToOne to `User`
rather than a custom user model, to keep auth simple.

| Field        | Type           | Notes                                  |
|--------------|----------------|------------------------------------------|
| id           | BigAutoField   | Primary key (Django default)            |
| username/email | CharField/EmailField | Used for login (email recommended) |
| password     | CharField      | Hashed by Django auth                   |
| created_at   | DateTimeField  | `date_joined` (Django default)          |
| updated_at   | DateTimeField  | Not in Django's default — add via Profile if needed |

> **Implementation note**: For JWT auth with email login, configure
> `USERNAME_FIELD = "email"` if using a custom user model, or simply use
> `username` as email-formatted strings for simplicity in MVP.

---

### 3.2 Category

| Field       | Type           | Notes                                                  |
|-------------|----------------|---------------------------------------------------------|
| id          | BigAutoField   | Primary key                                             |
| user        | ForeignKey(User, on_delete=CASCADE, related_name="categories") | Owner |
| name        | CharField(50)  | e.g. "Backend", "Cybersecurity", "Spanish"              |
| color       | CharField(7)   | Hex color code, e.g. `#3B82F6`                          |
| icon        | CharField(50)  | Icon identifier/name (string key for frontend icon set) |
| created_at  | DateTimeField  | auto_now_add                                            |
| updated_at  | DateTimeField  | auto_now                                                 |

**Constraints**
- Unique together: (`user`, `name`) — a user cannot have two categories with
  the same name.

**Seed data** (created on user signup, can be edited/extended):
Work, Backend, Cybersecurity, Spanish, Personal Projects, Chores, Health,
Rest, Admin / Life Tasks.

---

### 3.3 Task

| Field                      | Type           | Notes                                              |
|----------------------------|----------------|-----------------------------------------------------|
| id                          | BigAutoField   | Primary key                                         |
| user                        | ForeignKey(User, on_delete=CASCADE, related_name="tasks") | Owner |
| category                    | ForeignKey(Category, on_delete=SET_NULL, null=True, related_name="tasks") | Category, nullable if category deleted |
| title                       | CharField(200) | Required                                            |
| description                 | TextField      | Optional, blank=True                                |
| priority                    | CharField(choices) | `low`, `normal`, `high`, `critical` — default `normal` |
| estimated_duration_minutes  | PositiveIntegerField | Default 30                                    |
| due_date                    | DateField, null=True, blank=True | For one-off tasks with a deadline |
| repeat_type                 | CharField(choices) | `none`, `daily`, `weekdays`, `weekly`, `custom` — default `none` |
| repeat_days                 | JSONField, null=True, blank=True | For `custom`/`weekly`: list of weekday ints (0=Mon..6=Sun) |
| is_active                   | BooleanField   | Default True. Set False instead of deleting to preserve history |
| created_at                  | DateTimeField  | auto_now_add                                        |
| updated_at                  | DateTimeField  | auto_now                                            |

**Constraints**
- `priority` choices: `("low", "Low"), ("normal", "Normal"), ("high", "High"), ("critical", "Critical")`
- `repeat_type` choices: `("none", "None"), ("daily", "Daily"), ("weekdays", "Weekdays"), ("weekly", "Weekly"), ("custom", "Custom")`

**Notes**
- Recurring tasks are "templates": the recommendation/daily-plan generation
  logic creates `DailyTask` rows from active `Task` rows whose repeat schedule
  matches the date.

---

### 3.4 DailyPlan

| Field             | Type           | Notes                                          |
|-------------------|----------------|---------------------------------------------------|
| id                | BigAutoField   | Primary key                                       |
| user              | ForeignKey(User, on_delete=CASCADE, related_name="daily_plans") | Owner |
| date              | DateField      | The plan's date                                   |
| discipline_score  | IntegerField   | Default 100, recalculated as tasks complete/miss |
| notes             | TextField      | Optional, blank=True — free-form reflection      |
| created_at        | DateTimeField  | auto_now_add                                      |
| updated_at        | DateTimeField  | auto_now                                          |

**Constraints**
- Unique together: (`user`, `date`) — one plan per user per day.

---

### 3.5 DailyTask

| Field                  | Type           | Notes                                                       |
|------------------------|----------------|----------------------------------------------------------------|
| id                      | BigAutoField   | Primary key                                                  |
| daily_plan              | ForeignKey(DailyPlan, on_delete=CASCADE, related_name="daily_tasks") | Parent plan |
| task                    | ForeignKey(Task, on_delete=CASCADE, related_name="daily_tasks") | Source task |
| scheduled_start_time    | TimeField, null=True, blank=True | Optional time block start |
| scheduled_end_time      | TimeField, null=True, blank=True | Optional time block end |
| status                  | CharField(choices) | `pending`, `completed`, `missed`, `skipped`, `rescheduled` — default `pending` |
| completed_at            | DateTimeField, null=True, blank=True | Set when marked completed |
| missed_reason           | CharField(255), blank=True | Optional free-text reason when marked missed |
| created_at              | DateTimeField  | auto_now_add                                                 |
| updated_at              | DateTimeField  | auto_now                                                     |

**Constraints**
- `status` choices: `("pending", "Pending"), ("completed", "Completed"), ("missed", "Missed"), ("skipped", "Skipped"), ("rescheduled", "Rescheduled")`
- Unique together: (`daily_plan`, `task`, `scheduled_start_time`) — prevents
  exact duplicate scheduling of the same task in the same slot on the same
  day (a task can still appear more than once a day at different times if
  needed).

**Notes**
- `category` and `priority` for a `DailyTask` are derived via `task.category`
  and `task.priority` — not duplicated on this model, to avoid drift.
- When a `DailyTask` is marked `completed`, the related `Streak` for
  `task.category` should be updated (current_streak incremented if the
  previous day was also completed for that category, or reset/started if not).
- When a `DailyTask` is marked `missed`, streak logic checks for the
  "Never Miss Twice" condition (see `mvp-roadmap.md` / recommendation logic).

---

### 3.6 Streak

| Field               | Type           | Notes                                              |
|---------------------|----------------|--------------------------------------------------|
| id                   | BigAutoField   | Primary key                                       |
| user                 | ForeignKey(User, on_delete=CASCADE, related_name="streaks") | Owner |
| category             | ForeignKey(Category, on_delete=CASCADE, related_name="streaks") | Category being tracked |
| current_streak       | PositiveIntegerField | Default 0 — consecutive days with at least one completed task in this category |
| longest_streak       | PositiveIntegerField | Default 0 — historical max of current_streak |
| last_completed_date  | DateField, null=True, blank=True | Last date this category had a completed task |
| created_at           | DateTimeField  | auto_now_add                                       |
| updated_at           | DateTimeField  | auto_now                                           |

**Constraints**
- Unique together: (`user`, `category`) — one streak row per category per
  user.

**Notes**
- A "missed day" for streak purposes = a day where the user had at least one
  `DailyTask` in that category with status `missed`, or had no completed
  tasks in that category despite having pending ones.
- Streak recalculation can run as part of the nightly/daily plan-rollover job
  (see `mvp-roadmap.md` Phase 4).

---

### 3.7 WeeklyReview

| Field               | Type           | Notes                                             |
|----------------------|----------------|-----------------------------------------------|
| id                    | BigAutoField   | Primary key                                     |
| user                  | ForeignKey(User, on_delete=CASCADE, related_name="weekly_reviews") | Owner |
| week_start_date       | DateField      | Monday of the reviewed week                     |
| week_end_date         | DateField      | Sunday of the reviewed week                     |
| total_tasks           | PositiveIntegerField | Total DailyTasks scheduled in the week    |
| completed_tasks       | PositiveIntegerField | Count with status `completed`             |
| missed_tasks          | PositiveIntegerField | Count with status `missed`                |
| strongest_category    | ForeignKey(Category, on_delete=SET_NULL, null=True, related_name="+") | Category with best completion rate |
| weakest_category      | ForeignKey(Category, on_delete=SET_NULL, null=True, related_name="+") | Category with worst completion rate |
| weekly_score          | IntegerField   | 0–100, derived from completion rate + discipline scores |
| summary               | TextField      | Generated text summary (rule-based for MVP)     |
| created_at            | DateTimeField  | auto_now_add                                     |
| updated_at            | DateTimeField  | auto_now                                         |

**Constraints**
- Unique together: (`user`, `week_start_date`) — one review per user per week.

## 4. Django Implementation Notes

- Group models into a single Django app for MVP (e.g. `core`), or split into
  `accounts`, `tasks`, `planning`, `reviews` if preferred — a single app is
  simpler to manage for a solo MVP.
- Use Django REST Framework `ModelSerializer` for all models; nest related
  read-only fields where useful (e.g. `DailyTaskSerializer` includes a
  read-only `task` summary with title/category/priority).
- Add `ordering = [...]` in `Meta` for sensible default ordering:
  - `Task`: by `priority` (custom order) then `due_date`.
  - `DailyTask`: by `scheduled_start_time`.
  - `WeeklyReview`: by `-week_start_date`.
- Index recommendations:
  - `DailyPlan(user, date)` — already unique-together, indexed by default.
  - `DailyTask(daily_plan, status)` — for fast "today's pending tasks" queries.
  - `Streak(user, category)` — already unique-together.
- All querysets in views/viewsets must be filtered by `request.user` to
  enforce data isolation, even though MVP is single-user — this is required
  for correct permission behavior and future multi-user support.
- Migrations: run `makemigrations` after each model addition during Phase 1–2
  of the roadmap; avoid large speculative schema changes mid-build.
