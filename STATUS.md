# ImmanuellaOS - STATUS

This file tracks build progress across phases and serves as the handoff point
between Codex (execution) and Claude (architecture/review). Update it after
each Codex prompt completes and review is done.

**Last updated**: 2026-06-21
**Current phase**: Deployment preparation
**Current prompt**: Production environment preparation complete

---

## How to use this file

1. Before starting a Codex prompt, check the box for "In progress" under that
   prompt and note the date.
2. After Codex finishes, paste its summary to Claude for review.
3. Once Claude confirms it matches the spec (or after fixes), check the
   prompt's box and add a one-line note if anything deviated from the docs.
4. Update "Current phase" / "Current prompt" at the top so either of us can
   pick up context quickly in a new session.

---

## Phase 1 - Backend Setup

- [x] 1.1 - Project scaffold (Django + DRF + Postgres + CORS)
- [x] 1.2 - JWT auth (register/login/refresh/me)

**Notes**:
- 2026-06-16: Created Django project in `backend/`, configured DRF, CORS, django-environ, and PostgreSQL env vars. Added `core` app with domain placeholder packages for users/tasks/planning/reviews; no models or business features yet.
- 2026-06-16: Phase 1 local database fix: SQLite is now the default database when `DATABASE_URL` is missing or empty; PostgreSQL remains supported through optional `DATABASE_URL`.
- 2026-06-17: Added JWT auth foundation using SimpleJWT with `/api/v1/auth/register/`, `/login/`, `/token/refresh/`, and `/me/`. Registration and current-user serializers/views/routes/tests are in place; logout is still pending because this prompt did not request token blacklist/logout.

---

## Phase 2 - Task System

- [x] 2.1 - Category model + API + default categories on signup
- [x] 2.2 - Task model + API

**Notes**:
- 2026-06-17: Added MVP database models in `core` only: Category, Task, DailyPlan, DailyTask, Streak, and WeeklyReview. Created and applied `core.0001_initial`. No serializers, API endpoints, frontend, or AI features were added.
- 2026-06-17: Added authenticated Category API at `/api/v1/categories/`, scoped to `request.user`, with create/list/update/delete tests. Default categories on signup are still pending. Next recommended prompt: add default category creation on registration, then continue to Task API.
- 2026-06-17: Added idempotent default category creation during registration for Work, Backend, Cybersecurity, Spanish, Personal Projects, Chores, Health, Rest, and Admin. Next recommended prompt: build Task API.
- 2026-06-17: Added authenticated Task API at `/api/v1/tasks/`, scoped to `request.user`, with category ownership validation and filters for category, priority, repeat_type, is_active, and due_date. Next recommended prompt: daily plan generate/fetch endpoints.

---

## Phase 3 - Daily Planning

- [x] 3.1 - DailyPlan and DailyTask models
- [x] 3.2 - Generate and fetch daily plan endpoints
- [x] 3.3 - Daily task status actions (complete/miss/skip/reschedule)

**Notes**:
- 2026-06-17: Added authenticated DailyPlan/DailyTask API at `/api/v1/daily-plans/`: get/create today, fetch by date, add owned task to plan, complete, miss, reschedule, and skip. No streak, discipline score, weekly review, frontend, or AI work was added. Next recommended prompt: review Phase 3 behavior against the original roadmap, then continue to Phase 4 streaks/discipline score.
- 2026-06-17: Backend MVP review confirmed the DailyPlan and DailyTask models are present in `core.0001_initial`; checked off 3.1 to match the implemented state.

---

## Phase 4 - Streaks and Discipline Score

- [x] 4.1 - Streak model + update logic
- [x] 4.2 - Discipline score logic
- [x] 4.3 - Never Miss Twice warning

**Notes**:
- 2026-06-17: Added idempotent discipline score updates for complete/miss/skip, streak updates on completion, `/api/v1/streaks/`, and `/api/v1/discipline-score/today/`. Added `DailyTask.score_applied_status` migration for deterministic score application. Weekly review, frontend, AI, and Never Miss Twice warning were not added. Next recommended prompt: implement Never Miss Twice warning.
- 2026-06-19: Added deterministic Never Miss Twice detection for categorized tasks missed on both today and yesterday, exposed through authenticated `GET /api/v1/warnings/never-miss-twice/`. Added seven isolation/rule tests, typed frontend API support, and a restrained dashboard warning banner that refreshes with dashboard task actions. Phase 4 is complete. Next recommended prompt: run a final MVP QA and demo-readiness pass.
- 2026-06-19: Final post-MVP QA reviewed task CRUD and scheduling, Today actions, dashboard data and warnings, Streaks, Weekly Reviews, authentication refresh, protected routes, navigation, permissions, documentation, and frontend/API types. Fixed an invalid-refresh redirect loop, replaced stale Phase 1 root-page copy, and corrected the auth status label. Next recommended prompt: configure production environment values and deploy the MVP.
- 2026-06-19: Reconciled `docs/api-spec.md` with the implemented MVP and README. Removed legacy contracts, documented current plural route groups and response shapes, and clearly listed superseded draft paths. README required no changes. Next recommended prompt: configure production environment values and deploy the MVP.
- 2026-06-21: Prepared production environment handling without deploying. Django now requires an explicit `SECRET_KEY` when `DEBUG=False` while retaining SQLite defaults for local development and PostgreSQL through `DATABASE_URL`. Production frontend requests require `NEXT_PUBLIC_API_BASE_URL`; environment examples and README now document backend-first deployment, required variables, migrations, host/CORS alignment, and secret handling. Next recommended prompt: choose hosting providers and perform a deployment using platform-specific configuration.

---

## Phase 5 - Frontend Dashboard

- [x] 5.1 - Frontend scaffold + auth
- [x] 5.2 - Dashboard page
- [x] 5.3 - Today page
- [x] 5.4 - Task management page
- [x] 5.5 - Streaks page
- [x] 5b - Recommendation logic (backend)

**Notes**:
- 2026-06-17: Added authenticated rule-based recommendation endpoint at `/api/v1/recommendations/next/`, scoped to today's plan and `request.user`, with ordering for missed tasks, priority, scheduled time, and stable tie-breakers. Frontend, AI, weekly review, and Never Miss Twice warning were not added. Next recommended prompt: implement Never Miss Twice warning before weekly review.
- 2026-06-17: Initialized frontend foundation in `frontend/` with Next.js 14, TypeScript, Tailwind CSS, App Router, a simple check page, prepared `src/app`, `src/components`, `src/lib/api`, `src/types`, and `src/styles` structure, plus `NEXT_PUBLIC_API_BASE_URL` example. Auth UI, backend API calls, dashboard UI, frontend feature pages, and AI features were not added. Next recommended prompt: build frontend auth foundation and shared API client.
- 2026-06-17: Added frontend API client foundation in `frontend/src/lib/api` with typed helpers for register, login, current user, categories, tasks, today's daily plan, next recommendation, streaks, discipline score, and weekly reviews. Added shared TypeScript API response types in `frontend/src/types`. Token storage, React auth context, auth pages, dashboard UI, and AI features were not added. Next recommended prompt: build frontend auth UI and token state.
- 2026-06-17: Added frontend auth UI and token handling: `/login`, `/register`, localStorage token helpers, current-user hook, logout behavior, and a minimal protected `/dashboard` placeholder. Full dashboard widgets, task management UI, and AI features were not added. Next recommended prompt: build the dashboard page using the existing API client.
- 2026-06-17: Replaced the protected `/dashboard` placeholder with the first real dashboard screen. It fetches current user, discipline score, next recommendation, today's daily plan, streaks, and recent weekly reviews, with responsive cards plus loading, empty, and per-section error states. Task creation, category management, weekly review generation UI, and AI features were not added. Next recommended prompt: build the Today page.
- 2026-06-17: Added protected `/tasks` page with authenticated task list, category loading, and basic task creation for title, description, category, priority, estimated duration, due date, and repeat type. Added dashboard navigation to Tasks and a `createTask` API helper. Edit/delete task UI, daily plan scheduling UI, and AI features were not added. Next recommended prompt: build the Today page.
- 2026-06-17: Added frontend daily plan scheduling foundation. The `/tasks` page can schedule an existing task into today's plan with start/end times, and the dashboard today's plan card can mark daily tasks complete, missed, or skipped while refreshing the plan, score, recommendation, and streaks. A dedicated Today page, drag-and-drop calendar UI, task edit/delete UI, and AI features were not added. Next recommended prompt: build the dedicated Today page or streaks page.
- 2026-06-18: Added protected `/today` page for managing today's plan. It fetches today's daily plan, next recommendation, and discipline score; displays all scheduled daily tasks; supports complete, missed, skip, and same-day reschedule actions; and refreshes the plan, recommendation, and score after updates. Drag-and-drop, full calendar UI, frontend streaks page, weekly review page, and AI features were not added. Next recommended prompt: build the frontend streaks page or weekly review page.
- 2026-06-18: Polished the frontend theme with a near-black plum canvas while preserving warm cream/gold accents and parchment recommendation cards. Added consistent Dashboard, Today, Tasks, and Reviews navigation across protected pages. Moved dashboard logout into a separate account menu with an explicit inline confirmation step. No API, backend, business feature, or AI behavior changed.
- 2026-06-18: MVP QA aligned backend routes with frontend API helpers and fixed frontend auth resilience: expired access tokens now use the stored refresh token once, concurrent refresh attempts are deduplicated, transient current-user failures show a retry state instead of redirecting to Login, and DRF field validation errors display useful messages. Fixed a date-dependent recommendation test, corrected stale README setup/auth notes, and corrected the Task Management status checkbox. Django check, all 61 backend tests, migrations, frontend lint, and frontend production build pass. Remaining roadmap gaps are Task edit/delete UI, the frontend Streaks page, and Never Miss Twice warning behavior.
- 2026-06-19: Completed the protected task management page with inline editing for all supported task fields, active/inactive control, and confirmed deletion. Added typed `updateTask` and `deleteTask` API helpers; both actions refresh the task list and show progress, success, and error states. Next recommended prompt: build the protected frontend Streaks page.
- 2026-06-19: Added the protected `/streaks` page and shared navigation link. The page uses the existing authenticated streaks API to show category, current and longest streaks, last completion date, summary totals, a strongest-streak highlight, and loading/error/empty states. Phase 5 frontend screens are now complete. Next recommended prompt: implement the remaining Never Miss Twice warning behavior from Phase 4.3.

---

## Phase 6 - Weekly Review

- [x] 6.1 - Weekly review generation (backend)
- [x] 6.2 - Weekly review page (frontend)

**Notes**:
- 2026-06-17: Added authenticated Weekly Review API at `/api/v1/weekly-reviews/`: generate current week, generate by week start date, list owned reviews, and retrieve owned review details. Reviews aggregate Monday-to-Sunday DailyTask counts, strongest/weakest categories, weekly score, completion rate, skipped count as a computed response field, and rule-based summary text. Frontend, AI, auth behavior changes, and Never Miss Twice warning were not added. Next recommended prompt: implement Never Miss Twice warning before building the weekly review frontend.
- 2026-06-17: Backend MVP review and cleanup completed. URL organization, serializers, views, services, tests, README endpoint docs, and STATUS were reviewed; only a harmless unused import and stale status checkbox needed cleanup. Public API behavior was unchanged.
- 2026-06-18: Added protected `/weekly-reviews` page with review history, current-week generation, specific `week_start_date` generation, full review metrics/categories/summary, and loading, empty, success, and error states. Added shared generation API helpers and dashboard navigation. Charts, AI features, and advanced state libraries were not added. Next recommended prompt: build the frontend streaks page or implement the pending Never Miss Twice warning.

---

## Phase 7 - AI Coach (Future, Post-MVP)

Not started. Do not begin until Phases 1-6 are stable and in daily use.

---

## Open Questions / Decisions Pending

Use this section for anything that came up during a Codex prompt that needs a
decision before moving on (e.g. "discipline score recovery bonus felt too
generous - consider lowering to +5").

-

---

## Deviations from docs/

If Codex implemented something differently than `database-design.md`,
`api-spec.md`, etc., log it here so the docs can be updated to match reality
(or flagged as something to fix).

- 2026-06-17: User explicitly requested all MVP database models during Phase 2. This creates model scaffolding for later roadmap phases earlier than `docs/codex-prompts.md`, but does not add later-phase business logic or endpoints.
