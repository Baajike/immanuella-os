# ImmanuellaOS — API Specification

## 1. General Conventions

- **Base URL**: `/api/v1/`
- **Format**: JSON request/response bodies.
- **Auth**: JWT (access + refresh tokens) via `djangorestframework-simplejwt`
  or similar.
  - Send access token as `Authorization: Bearer <access_token>` header.
  - All endpoints except `register`, `login`, and `token/refresh` require
    authentication.
- **Pagination**: List endpoints use simple page-number pagination:
  `?page=1&page_size=20` (defaults: page=1, page_size=20).
- **Filtering**: Where noted, list endpoints support query params for
  filtering (e.g. `?category=2&status=pending`).
- **Dates/times**: ISO 8601 (`YYYY-MM-DD` for dates, `HH:MM:SS` for times,
  full ISO datetime for timestamps).

### Standard Error Response Format

All error responses follow this shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "A human-readable summary of what went wrong.",
    "details": {
      "field_name": ["Specific issue with this field."]
    }
  }
}
```

Common `code` values: `validation_error`, `not_found`, `permission_denied`,
`authentication_failed`, `not_authenticated`, `server_error`.

HTTP status codes used: `200 OK`, `201 Created`, `204 No Content`,
`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`,
`500 Internal Server Error`.

---

## 2. Authentication

### `POST /api/v1/auth/register/`
Create a new user account. Public.

**Request body**
```json
{
  "email": "immanuella@example.com",
  "password": "StrongPassword123",
  "name": "Immanuella"
}
```

**Response `201 Created`**
```json
{
  "id": 1,
  "email": "immanuella@example.com",
  "name": "Immanuella",
  "created_at": "2026-06-15T10:00:00Z"
}
```

---

### `POST /api/v1/auth/login/`
Obtain JWT access + refresh tokens. Public.

**Request body**
```json
{
  "email": "immanuella@example.com",
  "password": "StrongPassword123"
}
```

**Response `200 OK`**
```json
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}
```

---

### `POST /api/v1/auth/token/refresh/`
Exchange a refresh token for a new access token. Public.

**Request body**
```json
{ "refresh": "eyJ..." }
```

**Response `200 OK`**
```json
{ "access": "eyJ..." }
```

---

### `POST /api/v1/auth/logout/`
Blacklist the provided refresh token (if using token blacklist). Auth required.

**Request body**
```json
{ "refresh": "eyJ..." }
```

**Response `204 No Content`**

---

### `GET /api/v1/auth/me/`
Get the current authenticated user. Auth required.

**Response `200 OK`**
```json
{
  "id": 1,
  "email": "immanuella@example.com",
  "name": "Immanuella",
  "created_at": "2026-06-15T10:00:00Z"
}
```

---

## 3. Categories

### `GET /api/v1/categories/`
List all categories for the current user.

**Response `200 OK`**
```json
{
  "count": 9,
  "results": [
    { "id": 1, "name": "Backend", "color": "#3B82F6", "icon": "code", "created_at": "...", "updated_at": "..." },
    { "id": 2, "name": "Cybersecurity", "color": "#EF4444", "icon": "shield", "created_at": "...", "updated_at": "..." }
  ]
}
```

### `POST /api/v1/categories/`
Create a category.

**Request body**
```json
{ "name": "Spanish", "color": "#10B981", "icon": "language" }
```

**Response `201 Created`** — returns the created category object.

### `PATCH /api/v1/categories/{id}/`
Update a category (partial update).

**Request body**
```json
{ "color": "#22C55E" }
```

**Response `200 OK`** — returns the updated category object.

### `DELETE /api/v1/categories/{id}/`
Delete a category. Tasks referencing it have `category` set to `null`
(see DB design `on_delete=SET_NULL`).

**Response `204 No Content`**

---

## 4. Tasks

### `GET /api/v1/tasks/`
List tasks for the current user.

**Query params**: `?category=<id>`, `?priority=<low|normal|high|critical>`,
`?is_active=true|false`, `?repeat_type=<...>`

**Response `200 OK`**
```json
{
  "count": 12,
  "results": [
    {
      "id": 5,
      "title": "Backend study session",
      "description": "Work through Django REST Framework tutorial, ch. 4",
      "category": { "id": 1, "name": "Backend", "color": "#3B82F6" },
      "priority": "high",
      "estimated_duration_minutes": 60,
      "due_date": null,
      "repeat_type": "weekdays",
      "repeat_days": null,
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### `POST /api/v1/tasks/`
Create a task.

**Request body**
```json
{
  "title": "Backend study session",
  "description": "Work through DRF tutorial, ch. 4",
  "category": 1,
  "priority": "high",
  "estimated_duration_minutes": 60,
  "due_date": null,
  "repeat_type": "weekdays",
  "repeat_days": null
}
```

**Response `201 Created`** — returns the created task object (category
expanded as above).

### `GET /api/v1/tasks/{id}/`
Get a single task's details.

**Response `200 OK`** — same shape as a list item.

### `PATCH /api/v1/tasks/{id}/`
Update a task (partial update). Same body shape as create, all fields
optional.

**Response `200 OK`** — returns the updated task.

### `DELETE /api/v1/tasks/{id}/`
Delete a task. Prefer setting `is_active: false` via PATCH to preserve
history; hard delete removes related `DailyTask` rows via cascade.

**Response `204 No Content`**

---

## 5. Daily Plan

### `POST /api/v1/daily-plan/generate/`
Generate (or fetch existing) plan for a given date by creating `DailyTask`
rows from active recurring/due tasks that match the date.

**Request body**
```json
{ "date": "2026-06-15" }
```

**Response `200 OK`** (existing plan returned) or `201 Created` (new plan
generated)
```json
{
  "id": 42,
  "date": "2026-06-15",
  "discipline_score": 100,
  "notes": "",
  "daily_tasks": [
    {
      "id": 101,
      "task": { "id": 5, "title": "Backend study session", "category": { "id": 1, "name": "Backend", "color": "#3B82F6" }, "priority": "high", "estimated_duration_minutes": 60 },
      "scheduled_start_time": "19:00:00",
      "scheduled_end_time": "20:00:00",
      "status": "pending",
      "completed_at": null,
      "missed_reason": ""
    }
  ]
}
```

### `GET /api/v1/daily-plan/today/`
Get today's plan (server-side "today" based on user's date). Returns `404`
if no plan exists yet (frontend should call `generate/` first).

**Response `200 OK`** — same shape as above.

### `GET /api/v1/daily-plan/{date}/`
Get the plan for a specific date, e.g. `/api/v1/daily-plan/2026-06-10/`.

**Response `200 OK`** — same shape as above, or `404` if none exists.

### `PATCH /api/v1/daily-plan/{date}/notes/`
Update the free-text notes/reflection for a day's plan.

**Request body**
```json
{ "notes": "Felt tired after work, still got cybersecurity done." }
```

**Response `200 OK`** — returns the updated plan (without re-listing all
daily_tasks, just plan fields).

---

## 6. Daily Tasks

### `PATCH /api/v1/daily-tasks/{id}/complete/`
Mark a daily task as completed. Triggers streak update and discipline score
recalculation.

**Request body**: none required (empty body or `{}`)

**Response `200 OK`**
```json
{
  "id": 101,
  "status": "completed",
  "completed_at": "2026-06-15T19:45:00Z",
  "daily_plan_discipline_score": 110
}
```

### `PATCH /api/v1/daily-tasks/{id}/miss/`
Mark a daily task as missed.

**Request body**
```json
{ "missed_reason": "Ran out of time after work" }
```

**Response `200 OK`**
```json
{
  "id": 101,
  "status": "missed",
  "missed_reason": "Ran out of time after work",
  "daily_plan_discipline_score": 85,
  "warning": "Backend has been missed 2 days in a row. Do one small session today."
}
```

> The `warning` field is present only when the "Never Miss Twice" rule is
> triggered for the task's category.

### `PATCH /api/v1/daily-tasks/{id}/reschedule/`
Reschedule a daily task to a new time (same day) or move it to a future date
(creates/updates a `DailyTask` on the target date's plan).

**Request body**
```json
{
  "scheduled_start_time": "21:00:00",
  "scheduled_end_time": "21:30:00",
  "target_date": "2026-06-15"
}
```

**Response `200 OK`** — returns the updated/new daily task object, with
status `rescheduled` on the original if moved to a different date.

### `PATCH /api/v1/daily-tasks/{id}/skip/`
Mark a daily task as skipped (intentional, no penalty to discipline score,
but still recorded for weekly review).

**Request body**: none required

**Response `200 OK`**
```json
{ "id": 101, "status": "skipped" }
```

---

## 7. Streaks

### `GET /api/v1/streaks/`
List all streaks for the current user (one per category).

**Response `200 OK`**
```json
{
  "results": [
    {
      "id": 3,
      "category": { "id": 1, "name": "Backend", "color": "#3B82F6" },
      "current_streak": 4,
      "longest_streak": 9,
      "last_completed_date": "2026-06-14"
    },
    {
      "id": 4,
      "category": { "id": 2, "name": "Cybersecurity", "color": "#EF4444" },
      "current_streak": 0,
      "longest_streak": 6,
      "last_completed_date": "2026-06-12"
    }
  ]
}
```

> Streaks are updated automatically by the `complete`/`miss` endpoints above —
> there is no separate "update streak" endpoint for MVP. The list endpoint is
> read-only.

---

## 8. Discipline Score

### `GET /api/v1/discipline-score/today/`
Get today's discipline score and a breakdown of contributing events.

**Response `200 OK`**
```json
{
  "date": "2026-06-15",
  "discipline_score": 110,
  "breakdown": [
    { "reason": "Completed important task: Backend study session", "delta": 10 },
    { "reason": "Completed all daily priorities", "delta": 20 },
    { "reason": "Missed normal task: Tidy desk", "delta": -5 }
  ]
}
```

### `POST /api/v1/discipline-score/recalculate/`
Force recalculation of today's (or a given date's) discipline score from the
current state of its `DailyTask`s. Useful after bulk status changes.

**Request body**
```json
{ "date": "2026-06-15" }
```

**Response `200 OK`**
```json
{ "date": "2026-06-15", "discipline_score": 110 }
```

---

## 9. Weekly Review

### `POST /api/v1/weekly-review/generate/`
Generate the weekly review for the week containing the given date (or the
most recently completed week if no date is given).

**Request body**
```json
{ "date": "2026-06-14" }
```

**Response `200 OK`** (existing) or `201 Created` (newly generated)
```json
{
  "id": 7,
  "week_start_date": "2026-06-08",
  "week_end_date": "2026-06-14",
  "total_tasks": 28,
  "completed_tasks": 21,
  "missed_tasks": 5,
  "strongest_category": { "id": 2, "name": "Cybersecurity" },
  "weakest_category": { "id": 1, "name": "Backend" },
  "weekly_score": 75,
  "summary": "This week you completed 21 of 28 tasks (75%). Cybersecurity was your strongest category with a 5-day streak. Backend was your weakest with 3 missed sessions. Next week, schedule backend as your first block of the day."
}
```

### `GET /api/v1/weekly-review/`
List all weekly reviews, most recent first.

**Response `200 OK`**
```json
{
  "count": 3,
  "results": [
    { "id": 7, "week_start_date": "2026-06-08", "week_end_date": "2026-06-14", "weekly_score": 75 },
    { "id": 6, "week_start_date": "2026-06-01", "week_end_date": "2026-06-07", "weekly_score": 68 }
  ]
}
```

### `GET /api/v1/weekly-review/{id}/`
Get a single weekly review in full detail.

**Response `200 OK`** — same shape as `generate` response.

---

## 10. Recommendation

### `GET /api/v1/recommendation/next/`
Get the "What should I do next?" recommendation based on the current time,
today's plan, pending/missed tasks, and streak status.

**Query params (optional)**: `?available_minutes=20` — if provided, biases
recommendation toward tasks that fit in the given time window.

**Response `200 OK`**
```json
{
  "recommended_daily_task": {
    "id": 103,
    "task": {
      "id": 6,
      "title": "Cybersecurity: TryHackMe room",
      "category": { "id": 2, "name": "Cybersecurity", "color": "#EF4444" },
      "priority": "high",
      "estimated_duration_minutes": 30
    },
    "scheduled_start_time": "21:00:00",
    "status": "pending"
  },
  "reason": "Cybersecurity has been missed 2 days in a row and fits in your available time. Do this before anything else tonight.",
  "alternatives": [
    {
      "daily_task_id": 104,
      "title": "Spanish: Duolingo + 10 min reading",
      "reason": "Short task, good if you only have 15-20 minutes."
    }
  ]
}
```

**Response `200 OK` (nothing pending)**
```json
{
  "recommended_daily_task": null,
  "reason": "All planned tasks for today are done. Consider reviewing tomorrow's plan or resting.",
  "alternatives": []
}
```

---

## 11. Auth Requirements Summary

| Endpoint group        | Auth required |
|------------------------|----------------|
| `auth/register`, `auth/login`, `auth/token/refresh` | No |
| Everything else        | Yes (JWT Bearer token) |

All authenticated endpoints filter data by `request.user` — a user can never
read or modify another user's categories, tasks, plans, streaks, or reviews.
Attempting to access another user's resource by ID returns `404 Not Found`
(not `403`) to avoid leaking existence of records.
