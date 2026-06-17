# ImmanuellaOS - STATUS

This file tracks build progress across phases and serves as the handoff point
between Codex (execution) and Claude (architecture/review). Update it after
each Codex prompt completes and review is done.

**Last updated**: 2026-06-17
**Current phase**: Phase 4 - Streaks and Discipline Score
**Current prompt**: 4.3 - Never Miss Twice warning

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
- [x] 1.2 - JWT auth (register/login/refresh/logout/me)

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

- [ ] 3.1 - DailyPlan and DailyTask models
- [x] 3.2 - Generate and fetch daily plan endpoints
- [x] 3.3 - Daily task status actions (complete/miss/skip/reschedule)

**Notes**:
- 2026-06-17: Added authenticated DailyPlan/DailyTask API at `/api/v1/daily-plans/`: get/create today, fetch by date, add owned task to plan, complete, miss, reschedule, and skip. No streak, discipline score, weekly review, frontend, or AI work was added. Next recommended prompt: review Phase 3 behavior against the original roadmap, then continue to Phase 4 streaks/discipline score.

---

## Phase 4 - Streaks and Discipline Score

- [x] 4.1 - Streak model + update logic
- [x] 4.2 - Discipline score logic
- [ ] 4.3 - Never Miss Twice warning

**Notes**:
- 2026-06-17: Added idempotent discipline score updates for complete/miss/skip, streak updates on completion, `/api/v1/streaks/`, and `/api/v1/discipline-score/today/`. Added `DailyTask.score_applied_status` migration for deterministic score application. Weekly review, frontend, AI, and Never Miss Twice warning were not added. Next recommended prompt: implement Never Miss Twice warning.

---

## Phase 5 - Frontend Dashboard

- [ ] 5.1 - Frontend scaffold + auth
- [ ] 5.2 - Dashboard page
- [ ] 5.3 - Today page
- [ ] 5.4 - Task management page
- [ ] 5.5 - Streaks page
- [ ] 5b - Recommendation logic (backend)

**Notes**:

---

## Phase 6 - Weekly Review

- [ ] 6.1 - Weekly review generation (backend)
- [ ] 6.2 - Weekly review page (frontend)

**Notes**:

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
