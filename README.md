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

## Frontend Setup

The frontend is a Next.js app in `frontend/` using TypeScript, Tailwind CSS, and the App Router.

### 1. Install dependencies

```powershell
cd frontend
npm install
```

If PowerShell blocks the `npm` shim on Windows, use:

```powershell
npm.cmd install
```

### 2. Create your environment file

Copy `frontend/.env.example` to `frontend/.env.local`.

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

The frontend scaffold does not call the backend yet; this value is prepared for the API client in the next phase.

### 3. Start the frontend server

```powershell
npm run dev
```

The frontend will run at `http://localhost:3000/`.

### 4. Optional checks

```powershell
npm run lint
npm run build
```

### Frontend API client

Shared frontend API helpers live in `frontend/src/lib/api/` and use `NEXT_PUBLIC_API_BASE_URL`.

```ts
import { getCurrentUser, login } from "@/lib/api";

const tokens = await login({ email, password });
const user = await getCurrentUser(tokens.access);
```

The client supports passing JWT access tokens through `Authorization: Bearer ...` headers. Token storage and React auth context are intentionally deferred to the auth UI phase.

### Frontend auth flow

The frontend includes simple auth pages:

- `http://localhost:3000/login`
- `http://localhost:3000/register`
- `http://localhost:3000/dashboard`

Successful login stores access and refresh tokens in `localStorage` for MVP development. Registration creates the user, logs in with the submitted credentials, stores tokens, and redirects to the protected dashboard placeholder. The dashboard currently shows the current user's name/email and a logout button; the full dashboard UI comes later.

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

## Streaks and Discipline Score

Streak and discipline score endpoints require a JWT access token.

- `GET /api/v1/streaks/`
- `GET /api/v1/discipline-score/today/`

List your streaks:

```powershell
curl http://127.0.0.1:8000/api/v1/streaks/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Get today's discipline score:

```powershell
curl http://127.0.0.1:8000/api/v1/discipline-score/today/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Recommendation API

The rule-based next-task recommendation endpoint requires a JWT access token.

- `GET /api/v1/recommendations/next/`

Get the recommended next daily task:

```powershell
curl http://127.0.0.1:8000/api/v1/recommendations/next/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

The response includes `recommended_task`, `reason`, `message`, `current_time`, and `date`. If today's plan does not exist, or if there are no pending or missed daily tasks, `recommended_task` is `null`.

## Weekly Review API

Weekly review endpoints require a JWT access token.

- `GET /api/v1/weekly-reviews/`
- `GET /api/v1/weekly-reviews/{id}/`
- `POST /api/v1/weekly-reviews/generate/`
- `POST /api/v1/weekly-reviews/generate/{week_start_date}/`

Generate the current week review:

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/weekly-reviews/generate/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Generate a review for a specific Monday-to-Sunday week:

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/weekly-reviews/generate/2026-06-15/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

List your reviews:

```powershell
curl http://127.0.0.1:8000/api/v1/weekly-reviews/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Get one review:

```powershell
curl http://127.0.0.1:8000/api/v1/weekly-reviews/1/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```
