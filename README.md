# ImmanuellaOS

Personal life operating system for planning the day, tracking consistency, and reviewing weekly progress.

## Backend Setup

The backend is a Django + Django REST Framework project in `backend/`.

### 1. Create and activate a virtual environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Create your environment file

Copy `backend/.env.example` to `backend/.env`.

SQLite is the default local database. You do not need to install or configure PostgreSQL for beginner-friendly local development.

To use PostgreSQL instead, set `DATABASE_URL` in `backend/.env`:

```text
DATABASE_URL=postgres://postgres:postgres@localhost:5432/immanuella_os
```

If `DATABASE_URL` is missing or empty, Django uses SQLite at `backend/db.sqlite3`.

### 4. Run Django migrations

This creates the local SQLite database automatically when using the default setup.

```powershell
python manage.py migrate
```

### 5. Start the backend server

```powershell
python manage.py runserver
```

The backend will run at `http://127.0.0.1:8000/`.

The frontend local dev origin `http://localhost:3000` is already allowed by CORS.

## Auth Endpoints

Authentication endpoints live under `/api/v1/auth/`.

- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/token/refresh/`
- `GET /api/v1/auth/me/`

### Local Auth Testing

Register a user:

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/auth/register/ `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"immanuella@example.com\",\"password\":\"StrongPassword123\",\"name\":\"Immanuella\"}"
```

Successful registration automatically creates the default categories for that user: Work, Backend, Cybersecurity, Spanish, Personal Projects, Chores, Health, Rest, and Admin.

Log in and get tokens:

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/auth/login/ `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"immanuella@example.com\",\"password\":\"StrongPassword123\"}"
```

Fetch the current user with the returned access token:

```powershell
curl http://127.0.0.1:8000/api/v1/auth/me/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Category API

Category endpoints live under `/api/v1/categories/` and require a JWT access token.

- `GET /api/v1/categories/`
- `POST /api/v1/categories/`
- `GET /api/v1/categories/{id}/`
- `PATCH /api/v1/categories/{id}/`
- `DELETE /api/v1/categories/{id}/`

Create a category:

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/categories/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Spanish\",\"color\":\"#10B981\",\"icon\":\"language\"}"
```

List your categories:

```powershell
curl http://127.0.0.1:8000/api/v1/categories/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Update a category:

```powershell
curl -X PATCH http://127.0.0.1:8000/api/v1/categories/1/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"color\":\"#22C55E\"}"
```

Delete a category:

```powershell
curl -X DELETE http://127.0.0.1:8000/api/v1/categories/1/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Task API

Task endpoints live under `/api/v1/tasks/` and require a JWT access token.

- `GET /api/v1/tasks/`
- `POST /api/v1/tasks/`
- `GET /api/v1/tasks/{id}/`
- `PATCH /api/v1/tasks/{id}/`
- `DELETE /api/v1/tasks/{id}/`

Supported list filters: `category`, `priority`, `repeat_type`, `is_active`, and `due_date`.

Create a task:

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/tasks/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"title\":\"Backend study session\",\"description\":\"Work through DRF tutorial\",\"category\":1,\"priority\":\"high\",\"estimated_duration_minutes\":60,\"due_date\":\"2026-06-20\",\"repeat_type\":\"weekdays\",\"repeat_days\":null}"
```

List and filter your tasks:

```powershell
curl "http://127.0.0.1:8000/api/v1/tasks/?priority=high&is_active=true" `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Update a task:

```powershell
curl -X PATCH http://127.0.0.1:8000/api/v1/tasks/1/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"priority\":\"critical\",\"estimated_duration_minutes\":90}"
```

Delete a task:

```powershell
curl -X DELETE http://127.0.0.1:8000/api/v1/tasks/1/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Daily Plan API

Daily plan endpoints live under `/api/v1/daily-plans/` and require a JWT access token.

- `GET /api/v1/daily-plans/today/`
- `GET /api/v1/daily-plans/{date}/`
- `POST /api/v1/daily-plans/{date}/tasks/`
- `PATCH /api/v1/daily-plans/tasks/{daily_task_id}/complete/`
- `PATCH /api/v1/daily-plans/tasks/{daily_task_id}/miss/`
- `PATCH /api/v1/daily-plans/tasks/{daily_task_id}/reschedule/`
- `PATCH /api/v1/daily-plans/tasks/{daily_task_id}/skip/`

Get or create today's plan:

```powershell
curl http://127.0.0.1:8000/api/v1/daily-plans/today/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Get a plan by date:

```powershell
curl http://127.0.0.1:8000/api/v1/daily-plans/2026-06-20/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Add an existing task to a plan:

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/daily-plans/2026-06-20/tasks/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"task_id\":1,\"scheduled_start_time\":\"19:00:00\",\"scheduled_end_time\":\"20:00:00\"}"
```

Mark a daily task completed:

```powershell
curl -X PATCH http://127.0.0.1:8000/api/v1/daily-plans/tasks/1/complete/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Mark a daily task missed:

```powershell
curl -X PATCH http://127.0.0.1:8000/api/v1/daily-plans/tasks/1/miss/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"missed_reason\":\"Ran out of time\"}"
```

Reschedule a daily task:

```powershell
curl -X PATCH http://127.0.0.1:8000/api/v1/daily-plans/tasks/1/reschedule/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"scheduled_start_time\":\"21:00:00\",\"scheduled_end_time\":\"21:30:00\",\"target_date\":\"2026-06-21\"}"
```

Skip a daily task:

```powershell
curl -X PATCH http://127.0.0.1:8000/api/v1/daily-plans/tasks/1/skip/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```
