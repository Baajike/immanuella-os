# ImmanuellaOS — MVP Roadmap

This roadmap breaks the build into seven phases. Each phase should be
completable in a focused session (or a few short sessions) and leaves the app
in a working state. Don't start a phase until the previous one is working
end-to-end (even if rough).

Each phase lists: goal, deliverables, and a "done when" checklist.

---

## Phase 1 — Backend Setup

**Goal**: A running Django + DRF backend with auth, connected to PostgreSQL,
deployable locally.

**Deliverables**
- Django project (`backend/`) with PostgreSQL configured via environment
  variables (`.env` + `django-environ` or similar).
- DRF installed and configured.
- JWT auth configured (`djangorestframework-simplejwt`), with
  `register`, `login`, `token/refresh`, `logout`, `me` endpoints working.
- CORS configured for the Next.js frontend's local dev URL.
- Basic project structure: one app (e.g. `core`) for all MVP models.
- `.env.example` committed; `.env` gitignored.

**Done when**
- [ ] `python manage.py runserver` starts without errors.
- [ ] Can register a user via `POST /api/v1/auth/register/`.
- [ ] Can log in and receive access/refresh tokens.
- [ ] `GET /api/v1/auth/me/` returns the logged-in user with a valid token and
      `401` without one.

---

## Phase 2 — Task System

**Goal**: Categories and Tasks fully CRUD-able via API, with seed categories
created on signup.

**Deliverables**
- `Category` and `Task` models + migrations (per `database-design.md`).
- DRF serializers and viewsets for both, scoped to `request.user`.
- Signal or post-register hook that creates the default category set (Work,
  Backend, Cybersecurity, Spanish, Personal Projects, Chores, Health, Rest,
  Admin / Life Tasks) for a new user.
- Endpoints from `api-spec.md` Sections 3 and 4 implemented.

**Done when**
- [ ] New user automatically has the 9 default categories.
- [ ] Can create, list, update, and delete a category.
- [ ] Can create a task with category, priority, duration, repeat type.
- [ ] Can list/filter tasks by category and priority.
- [ ] All endpoints reject requests without a valid JWT.

---

## Phase 3 — Daily Planning

**Goal**: Generate and manage a day's plan from active tasks.

**Deliverables**
- `DailyPlan` and `DailyTask` models + migrations.
- `daily-plan/generate/` endpoint: for a given date, find active `Task`s whose
  `repeat_type`/`repeat_days`/`due_date` match that date and don't already
  have a `DailyTask` for that plan, then create `DailyTask` rows
  (`status="pending"`).
- `daily-plan/today/` and `daily-plan/{date}/` read endpoints.
- `daily-plan/{date}/notes/` update endpoint.
- `daily-tasks/{id}/complete/`, `/miss/`, `/skip/`, `/reschedule/` endpoints
  (status transitions only — discipline score and streak logic come in
  Phase 4, but the status changes should work now).

**Done when**
- [ ] Calling `generate/` for today creates a `DailyPlan` with the correct
      `DailyTask`s based on active tasks' repeat rules.
- [ ] Calling `generate/` again the same day doesn't duplicate `DailyTask`s.
- [ ] Can mark a daily task completed, missed, skipped, or rescheduled, and
      the status persists correctly.
- [ ] `today/` and `{date}/` return the plan with nested daily tasks.

---

## Phase 4 — Streaks and Discipline Score

**Goal**: Completing/missing tasks updates streaks and the day's discipline
score automatically, including the "Never Miss Twice" warning.

**Deliverables**
- `Streak` model + migration, one row per (user, category), created lazily
  (on first relevant event) or seeded alongside default categories.
- Discipline score logic (see rules below) applied inside the
  `complete`/`miss` endpoints, updating `DailyPlan.discipline_score`.
- Streak update logic applied inside the `complete`/`miss` endpoints:
  - On `complete`: if `last_completed_date` is yesterday (or today already),
    increment `current_streak`; otherwise reset `current_streak` to 1.
    Update `longest_streak` if exceeded. Set `last_completed_date` to today.
  - On `miss`: don't directly reset streak on a single miss (streak reset
    happens naturally if no completion occurs for that category — computed
    when the day rolls over or when checked).
- "Never Miss Twice" check: when marking a task `missed`, check whether the
  same category had a `missed`-only (no completions) day yesterday too. If
  so, include a `warning` message in the response (see `api-spec.md`).
- `discipline-score/today/` and `discipline-score/recalculate/` endpoints.

**Discipline score rules (starting point — tune later)**
- Day starts at 100.
- Complete `high`/`critical` priority task: +10
- Complete `low`/`normal` priority task: +5
- Miss `high`/`critical` priority task: -15
- Miss `low`/`normal` priority task: -5
- All of today's daily tasks completed: bonus +20
- Recover after a missed day in a category (i.e. complete something in a
  category that had zero completions yesterday): bonus +10

**Done when**
- [ ] Completing a task updates the relevant streak correctly.
- [ ] Missing the same category two days running returns a warning message.
- [ ] Discipline score changes match the rules above for simple test cases.
- [ ] `streaks/` endpoint returns correct current/longest streaks.

---

## Phase 5 — Frontend Dashboard

**Goal**: A working Next.js frontend covering login, dashboard, and today
page, talking to the real API.

**Deliverables**
- Next.js + TypeScript + Tailwind app (`frontend/`) with:
  - Login/register pages, JWT stored (httpOnly cookie or secure storage),
    auth context/provider, protected routes.
  - **Dashboard page**: greeting, today's date, discipline score, current
    streaks (compact list), today's main priorities (high/critical pending
    tasks), missed tasks, and a "What should I do next?" button that calls
    `recommendation/next/` and displays the result.
  - **Today page**: time-blocked list of today's `DailyTask`s with status
    badges (pending/completed/missed/skipped) and quick actions
    (complete/miss/skip/reschedule).
  - **Task Management page**: create/edit/delete tasks, assign category,
    priority, duration, repeat schedule.
  - **Streaks page**: per-category current/longest streak and missed-days
    indicator.

**Done when**
- [ ] Can log in and land on the dashboard with real data.
- [ ] Dashboard shows correct discipline score, streaks, and priorities for
      "today" (calls `generate/` if no plan exists yet).
- [ ] "What should I do next?" button shows a recommendation (even a basic
      one — full recommendation logic is Phase 5b below).
- [ ] Today page allows marking tasks complete/missed/skipped and the UI
      reflects the change without a full reload.
- [ ] Task Management page supports full CRUD on tasks.
- [ ] Streaks page renders all categories with current data.

### Phase 5b — Recommendation Logic

**Goal**: Implement the rule-based "What should I do next?" engine on the
backend (`recommendation/next/`).

**Rules (in priority order)**
1. If any category has triggered a "Never Miss Twice" warning today (missed
   yesterday and today, with no completion), recommend a pending task from
   that category first — regardless of scheduled time.
2. Otherwise, among today's `pending` daily tasks:
   - Filter to tasks whose `scheduled_start_time` is at or before the current
     time, or has no scheduled time.
   - If `available_minutes` is provided, prefer tasks with
     `estimated_duration_minutes <= available_minutes`.
   - Sort remaining candidates by priority (`critical` > `high` > `normal` >
     `low`), then by earliest `scheduled_start_time`, then by soonest
     `due_date`.
3. If no pending tasks match, return `recommended_daily_task: null` with an
   encouraging "all done" message.
4. Always include up to 2 `alternatives` — other reasonable candidates (e.g.
   a short task that fits in less time, or the next scheduled item).

**Done when**
- [ ] Recommendation correctly prioritizes a "Never Miss Twice" category.
- [ ] Recommendation respects `available_minutes` when provided.
- [ ] Recommendation falls back gracefully when nothing is pending.

---

## Phase 6 — Weekly Review

**Goal**: Generate and view weekly reviews, including the rule-based summary
text and the "Weekly Review" frontend page.

**Deliverables**
- `WeeklyReview` model + migration.
- `weekly-review/generate/` endpoint: aggregates the prior Mon–Sun (or
  current week to date if generated mid-week) `DailyTask`s by category to
  compute `total_tasks`, `completed_tasks`, `missed_tasks`,
  `strongest_category` (highest completion rate, min. N tasks),
  `weakest_category` (lowest completion rate, min. N tasks), and
  `weekly_score` (e.g. `round(completed_tasks / total_tasks * 100)`, blended
  with average daily discipline score).
- Rule-based `summary` text generation (template strings filling in the
  computed values — no AI needed yet). Example template:
  > "This week you completed {completed}/{total} tasks ({pct}%).
  > {strongest} was your strongest category. {weakest} needs attention —
  > make it your first block next week."
- `weekly-review/` list and `weekly-review/{id}/` detail endpoints.
- **Weekly Review page** on the frontend: shows the current/most recent
  review, with a button to generate this week's review, and a list of past
  reviews.

**Done when**
- [ ] Generating a review for a completed week produces correct counts and a
      sensible strongest/weakest category.
- [ ] `weekly_score` is computed consistently and falls in 0–100.
- [ ] Summary text reads naturally and reflects real numbers.
- [ ] Weekly Review page displays the latest review and history list.

---

## Phase 7 — AI Coach (Future, Post-MVP)

**Goal**: Replace/augment the rule-based weekly summary and recommendations
with AI-generated, personalized accountability messages using the OpenAI API.

**Deliverables (future)**
- Backend service that packages a structured summary of the week (completion
  rates per category, streaks, discipline score trend, notes) and sends it to
  an LLM with a prompt that produces a short, direct, "slightly savage but not
  insulting" accountability message in Immanuella's preferred tone.
- Optional: AI-assisted daily recommendation that considers free-text notes
  (e.g. "feeling tired today") alongside the rule-based candidates.
- Caching/rate-limiting to avoid unnecessary API calls (e.g. generate AI
  summary once per week, not on every page load).

**Explicitly not started until Phases 1–6 are stable and in daily use.**
