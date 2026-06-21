# ImmanuellaOS MVP API Specification

This document describes the API currently implemented by the Django backend.
The base path is `/api/v1`.

## 1. Conventions

- Send JSON request bodies with `Content-Type: application/json`.
- Send authenticated requests with `Authorization: Bearer <access_token>`.
- All endpoints require authentication except registration, login, and token
  refresh.
- User-owned querysets are scoped to the authenticated user. Requests for
  another user's object return `404 Not Found` where an object ID is used.
- Category, task, and weekly-review lists are paginated:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": []
}
```

- Validation errors use standard DRF field responses such as
  `{"task_id": ["Task does not exist."]}`. General errors may use
  `{"detail": "Not found."}`.
- Dates use `YYYY-MM-DD`; times use `HH:MM:SS`; datetimes use ISO 8601.

## 2. Authentication

### `POST /api/v1/auth/register/`

Create a user and that user's default categories.

```json
{
  "email": "immanuella@example.com",
  "password": "StrongPassword123",
  "name": "Immanuella"
}
```

Returns `201 Created` with `id`, `email`, `name`, and `created_at`.

### `POST /api/v1/auth/login/`

```json
{
  "email": "immanuella@example.com",
  "password": "StrongPassword123"
}
```

Returns `200 OK`:

```json
{
  "access": "<jwt>",
  "refresh": "<jwt>"
}
```

### `POST /api/v1/auth/token/refresh/`

```json
{
  "refresh": "<refresh_token>"
}
```

Returns `200 OK` with a new `access` token.

### `GET /api/v1/auth/me/`

Returns the authenticated user's `id`, `email`, `name`, and `created_at`.

There is no backend logout or token-blacklist endpoint in the MVP. Frontend
logout clears locally stored tokens.

## 3. Categories

All routes are authenticated and user-scoped.

- `GET /api/v1/categories/` - paginated list
- `POST /api/v1/categories/` - create
- `GET /api/v1/categories/{id}/` - retrieve
- `PUT /api/v1/categories/{id}/` - replace
- `PATCH /api/v1/categories/{id}/` - partially update
- `DELETE /api/v1/categories/{id}/` - delete (`204 No Content`)

Writable fields are `name`, `color`, and `icon`. Responses also include `id`,
`created_at`, and `updated_at`. The authenticated user is attached server-side.

```json
{
  "name": "Spanish",
  "color": "#10B981",
  "icon": "language"
}
```

## 4. Tasks

All routes are authenticated and user-scoped.

- `GET /api/v1/tasks/` - paginated list
- `POST /api/v1/tasks/` - create
- `GET /api/v1/tasks/{id}/` - retrieve
- `PUT /api/v1/tasks/{id}/` - replace
- `PATCH /api/v1/tasks/{id}/` - partially update
- `DELETE /api/v1/tasks/{id}/` - delete (`204 No Content`)

List filters: `category`, `priority`, `repeat_type`, `is_active`, and
`due_date`.

```json
{
  "title": "Backend study session",
  "description": "Work through the DRF tutorial",
  "category": 1,
  "priority": "high",
  "estimated_duration_minutes": 60,
  "due_date": "2026-06-20",
  "repeat_type": "weekdays",
  "repeat_days": null,
  "is_active": true
}
```

`category` may be `null`, but a category ID must belong to the authenticated
user. Priority values are `low`, `normal`, `high`, and `critical`. Repeat
values are `none`, `daily`, `weekdays`, `weekly`, and `custom`.

Task responses expand category as `{id, name, color}` and include `id`,
`created_at`, and `updated_at`.

## 5. Daily Plans and Daily Tasks

All routes are authenticated and user-scoped.

### `GET /api/v1/daily-plans/today/`

Get today's plan. The endpoint creates an empty plan with a discipline score
of 100 if one does not exist.

### `GET /api/v1/daily-plans/{date}/`

Get an existing plan by date. Returns `404` when that date has no plan.

Daily-plan responses have this shape:

```json
{
  "id": 42,
  "date": "2026-06-20",
  "discipline_score": 100,
  "notes": "",
  "daily_tasks": [],
  "created_at": "2026-06-20T08:00:00Z",
  "updated_at": "2026-06-20T08:00:00Z"
}
```

### `POST /api/v1/daily-plans/{date}/tasks/`

Add one of the authenticated user's existing tasks to the plan. The plan is
created if needed.

```json
{
  "task_id": 5,
  "scheduled_start_time": "19:00:00",
  "scheduled_end_time": "20:00:00"
}
```

Returns `201 Created` for a new daily task or `200 OK` when the matching task
and start-time slot already exists.

### Daily-task actions

- `PATCH /api/v1/daily-plans/tasks/{daily_task_id}/complete/`
- `PATCH /api/v1/daily-plans/tasks/{daily_task_id}/miss/`
- `PATCH /api/v1/daily-plans/tasks/{daily_task_id}/skip/`
- `PATCH /api/v1/daily-plans/tasks/{daily_task_id}/reschedule/`

The miss action accepts an optional body:

```json
{
  "missed_reason": "Ran out of time"
}
```

The reschedule action requires a start time. `target_date` is optional; when
it differs from the original plan date, the original daily task becomes
`rescheduled` and a daily task is created or reused on the target plan.

```json
{
  "scheduled_start_time": "21:00:00",
  "scheduled_end_time": "21:30:00",
  "target_date": "2026-06-21"
}
```

Daily-task responses include `id`, nested task summary, scheduled times,
`status`, `completed_at`, `missed_reason`, `created_at`, and `updated_at`.
Statuses are `pending`, `completed`, `missed`, `skipped`, and `rescheduled`.
A cross-date reschedule returns `{original, new}` daily-task objects.

## 6. Streaks, Score, and Warnings

### `GET /api/v1/streaks/`

Returns a plain JSON array, not a paginated response:

```json
[
  {
    "id": 3,
    "category": {"id": 1, "name": "Backend", "color": "#3B82F6"},
    "current_streak": 4,
    "longest_streak": 9,
    "last_completed_date": "2026-06-19"
  }
]
```

### `GET /api/v1/discipline-score/today/`

Gets or creates today's plan and returns:

```json
{
  "date": "2026-06-20",
  "discipline_score": 110
}
```

There is no public score-recalculation endpoint in the MVP.

### `GET /api/v1/warnings/never-miss-twice/`

Returns one warning per categorized area with missed daily tasks both today
and yesterday. Uncategorized tasks and other users' data are ignored.

```json
{
  "has_warning": true,
  "warnings": [
    {
      "category": {"id": 1, "name": "Backend", "color": "#3B82F6"},
      "message": "Backend has been missed 2 days in a row. One miss is life. Two is a pattern. Do one small session today.",
      "dates": ["2026-06-19", "2026-06-20"]
    }
  ]
}
```

## 7. Recommendation

### `GET /api/v1/recommendations/next/`

Uses today's plan and returns the authenticated user's next pending or missed
daily task. Missed tasks rank first, followed by priority and scheduled time.

```json
{
  "recommended_task": null,
  "reason": "There are no pending or missed tasks for today.",
  "message": "All clear for now. Rest, reset, or plan the next useful thing.",
  "current_time": "14:30:00",
  "date": "2026-06-20"
}
```

When present, `recommended_task` contains the daily-task ID, nested task
details, scheduled times, status, and `created_at`. The implemented endpoint
does not accept `available_minutes` and does not return alternatives.

## 8. Weekly Reviews

All routes are authenticated and user-scoped.

- `GET /api/v1/weekly-reviews/` - paginated list, newest first
- `GET /api/v1/weekly-reviews/{id}/` - retrieve one owned review
- `POST /api/v1/weekly-reviews/generate/` - generate/update current week
- `POST /api/v1/weekly-reviews/generate/{week_start_date}/` - generate/update
  the Monday-to-Sunday week containing the supplied date

Generating the same user/week again updates and returns the existing review
with `200 OK`; creating it returns `201 Created`.

```json
{
  "id": 7,
  "week_start_date": "2026-06-15",
  "week_end_date": "2026-06-21",
  "total_tasks": 8,
  "completed_tasks": 5,
  "missed_tasks": 2,
  "skipped_tasks": 1,
  "completion_rate": 63,
  "strongest_category": {"id": 1, "name": "Backend", "color": "#3B82F6"},
  "weakest_category": {"id": 2, "name": "Spanish", "color": "#10B981"},
  "weekly_score": 63,
  "summary": "This week you completed 5 of 8 tasks (63%).",
  "created_at": "2026-06-20T18:00:00Z",
  "updated_at": "2026-06-20T18:00:00Z"
}
```

## 9. Superseded Draft Routes

The following routes appeared in earlier planning documents but are not part
of the implemented MVP API:

- `/api/v1/auth/logout/`
- `/api/v1/daily-plan/generate/`
- `/api/v1/daily-plan/today/`
- `/api/v1/daily-plan/{date}/notes/`
- `/api/v1/daily-tasks/{id}/...`
- `/api/v1/discipline-score/recalculate/`
- `/api/v1/recommendation/next/`
- `/api/v1/weekly-review/...`

Use the implemented plural paths documented above.
