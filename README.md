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

The frontend uses this value for all authenticated API calls. Keep both local servers running while using the app.

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

## Deployment Checklist

This repository is prepared for deployment but does not select or configure a
specific hosting provider. Deploy the backend first so its public API URL is
available when the frontend is built.

### Backend service

1. Set the service root to `backend/` and install `requirements.txt`.
2. Configure these environment variables in the hosting platform:

   - `SECRET_KEY`: required secret value; generate a long random string.
   - `DEBUG=False`: required for production.
   - `ALLOWED_HOSTS`: comma-separated backend hostnames without schemes, for
     example `api.example.com`.
   - `CORS_ALLOWED_ORIGINS`: comma-separated frontend origins with schemes and
     no trailing slash, for example `https://app.example.com`.
   - `DATABASE_URL`: production PostgreSQL connection URL supplied by the
     database provider.

3. Apply database migrations during release:

```powershell
python manage.py migrate
```

4. Run `python manage.py check --deploy` with the production environment set,
   then start the Django WSGI/ASGI application using the process supported by
   the chosen host. Django's development `runserver` is only for local use.

When `DEBUG=False`, startup fails clearly if `SECRET_KEY` is missing. SQLite
remains the automatic local default when `DATABASE_URL` is absent; production
deployments should provide PostgreSQL through `DATABASE_URL`.

### Frontend service

1. Set the service root to `frontend/`.
2. Set `NEXT_PUBLIC_API_BASE_URL` at build time to the deployed backend API
   base, including `/api/v1`, for example:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
```

3. Install dependencies and create the production build:

```powershell
npm install
npm run build
```

4. After the frontend URL is known, confirm that exact origin appears in the
   backend's `CORS_ALLOWED_ORIGINS` and redeploy the backend configuration if
   needed.

Do not commit `backend/.env`, `frontend/.env.local`, database files, or real
credentials. Use each hosting platform's secret and environment management.

### Frontend API client

Shared frontend API helpers live in `frontend/src/lib/api/` and use `NEXT_PUBLIC_API_BASE_URL`.

```ts
import { getCurrentUser, login } from "@/lib/api";

const tokens = await login({ email, password });
const user = await getCurrentUser(tokens.access);
```

The client sends JWT access tokens through `Authorization: Bearer ...` headers. Access and refresh tokens are stored in `localStorage` for the MVP, and authenticated requests retry once through the token refresh endpoint when an access token expires.

### Frontend auth flow

The frontend includes simple auth pages:

- `http://localhost:3000/login`
- `http://localhost:3000/register`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/today`
- `http://localhost:3000/tasks`
- `http://localhost:3000/streaks`
- `http://localhost:3000/weekly-reviews`

Successful login stores access and refresh tokens in `localStorage` for MVP development. Registration creates the user, logs in with the submitted credentials, stores tokens, and redirects to the protected dashboard. The dashboard fetches the current user, today's discipline score, next recommendation, today's plan, streaks, and recent weekly reviews.

The protected Today page shows the full daily plan, next recommendation, discipline score, quick complete/missed/skip actions, and simple rescheduling for each daily task. The protected task page lists the authenticated user's tasks, supports creating and editing all task fields, requires confirmation before deletion, and can schedule an existing task into today's daily plan with a start and end time. The protected Streaks page shows current and longest streaks by category, plus last completion dates and a compact summary. The protected Weekly Reviews page lists review history and can generate the current week or a selected Monday-to-Sunday week. The dashboard provides navigation to each of these workflows.

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
- `GET /api/v1/warnings/never-miss-twice/`

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

Check for categories missed on both today and yesterday:

```powershell
curl http://127.0.0.1:8000/api/v1/warnings/never-miss-twice/ `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

The dashboard shows a quiet Never Miss Twice banner when the response contains warnings. Uncategorized tasks and other users' data are ignored.

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
