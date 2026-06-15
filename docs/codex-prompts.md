# ImmanuellaOS — Codex Prompts

These prompts are designed to be given to Codex **one at a time, in order**.
Each prompt is scoped to a small, specific piece of work. After each prompt
runs, review the diff/output before moving to the next prompt.

General rules to repeat to Codex if it starts going off-track:

> "Only do what this prompt asks. Don't modify files outside what's described.
> Don't add extra features, libraries, or refactors beyond what's requested.
> After finishing, explain what you changed and what I should test manually."

---

## Phase 1 — Backend Setup

### Prompt 1.1 — Project scaffold
```
Create a new Django project inside `backend/` called `immanuella_os`, with a
single app called `core`. Configure it to use PostgreSQL via environment
variables (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT) loaded with
django-environ, and create a `.env.example` file listing these variables
with placeholder values. Add `rest_framework` and `corsheaders` to
INSTALLED_APPS, with CORS configured to allow `http://localhost:3000`.
Do not create any models yet. Do not touch the `frontend/` directory.
After finishing, explain how to create the `.env` file and run the server.
```

### Prompt 1.2 — JWT auth
```
In the `backend/` Django project, add `djangorestframework-simplejwt` and
configure DRF to use JWT authentication as the default authentication class.
Add these endpoints under `/api/v1/auth/`:
- POST /register/  — create a user with email, password, name (use Django's
  built-in User model; map "name" to first_name)
- POST /login/     — returns access + refresh tokens
- POST /token/refresh/
- POST /logout/    — blacklist the refresh token
- GET  /me/        — returns the current user's id, email, name, created_at

Use email as the login field. Write simple serializers and views in the
`core` app. Do not create Category, Task, or any other models yet.
After finishing, explain how to test register/login/me with curl or Postman.
```

---

## Phase 2 — Task System

### Prompt 2.1 — Category model + API
```
In the `core` app, add a `Category` model exactly matching the spec in
docs/database-design.md section 3.2 (user FK, name, color, icon, timestamps,
unique_together user+name). Create a migration. Add a DRF ModelSerializer and
a ModelViewSet registered at /api/v1/categories/, restricted so a user can
only see/edit/delete their own categories (filter queryset by request.user,
and set user on create automatically).

Also add a post_save signal on the User model (or a hook in the register
view) that creates these 9 default categories for a new user: Work, Backend,
Cybersecurity, Spanish, Personal Projects, Chores, Health, Rest,
Admin / Life Tasks. Pick reasonable default colors and icon name strings for
each.

Do not create Task or any other models yet.
After finishing, explain how to verify the default categories are created on
registration.
```

### Prompt 2.2 — Task model + API
```
In the `core` app, add a `Task` model exactly matching docs/database-design.md
section 3.3 (user FK, category FK with on_delete=SET_NULL/null=True, title,
description, priority choices, estimated_duration_minutes,
due_date, repeat_type choices, repeat_days JSONField, is_active, timestamps).
Create a migration. Add a DRF ModelSerializer (nest a read-only summary of
category: id, name, color) and a ModelViewSet registered at /api/v1/tasks/,
scoped to request.user, supporting filtering by ?category=, ?priority=,
?is_active=, ?repeat_type= via query params.

Do not create DailyPlan, DailyTask, Streak, or WeeklyReview yet.
After finishing, list example requests to create a task and filter the list.
```

---

## Phase 3 — Daily Planning

### Prompt 3.1 — DailyPlan and DailyTask models
```
In the `core` app, add `DailyPlan` and `DailyTask` models exactly matching
docs/database-design.md sections 3.4 and 3.5. DailyPlan: user FK, date,
discipline_score (default 100), notes, timestamps, unique_together
(user, date). DailyTask: daily_plan FK, task FK, scheduled_start_time,
scheduled_end_time, status choices (pending/completed/missed/skipped/
rescheduled, default pending), completed_at, missed_reason, timestamps,
unique_together (daily_plan, task, scheduled_start_time).

Create migrations. Add ModelSerializers for both (DailyTask should nest a
read-only summary of its task: id, title, category {id,name,color}, priority,
estimated_duration_minutes). Do not add any endpoints yet — just models and
serializers.
After finishing, confirm the migrations applied successfully.
```

### Prompt 3.2 — Generate and fetch daily plan
```
In the `core` app, add these endpoints:

- POST /api/v1/daily-plan/generate/  — body: {"date": "YYYY-MM-DD"}.
  If a DailyPlan for (request.user, date) doesn't exist, create it with
  discipline_score=100. Then, for each active Task belonging to the user
  whose repeat_type/repeat_days/due_date indicates it should occur on that
  date, AND that doesn't already have a DailyTask in this plan, create a
  DailyTask with status="pending". Repeat-matching rules:
    - repeat_type="none": only if task.due_date == date
    - repeat_type="daily": always matches
    - repeat_type="weekdays": matches if date is Mon-Fri
    - repeat_type="weekly" or "custom": matches if date.weekday() is in
      task.repeat_days (list of ints, 0=Monday)
  Return the plan with nested daily_tasks (ordered by scheduled_start_time,
  nulls last).

- GET /api/v1/daily-plan/today/  — returns today's plan (server local date)
  with nested daily_tasks, or 404 if it doesn't exist yet.

- GET /api/v1/daily-plan/<date>/  — returns the plan for that date with
  nested daily_tasks, or 404 if it doesn't exist.

- PATCH /api/v1/daily-plan/<date>/notes/  — body: {"notes": "..."}, updates
  notes on that date's plan for request.user.

All endpoints must be scoped to request.user. Don't implement discipline
score recalculation or streak logic yet — discipline_score stays as whatever
value it currently has.
After finishing, explain how to test generating a plan for today.
```

### Prompt 3.3 — Daily task status actions
```
In the `core` app, add these endpoints, all scoped so a user can only act on
their own DailyTasks (via daily_plan.user):

- PATCH /api/v1/daily-tasks/<id>/complete/
  Sets status="completed", completed_at=now(). Returns the updated daily
  task. (Discipline score / streak updates come in a later prompt — for now
  just return the updated daily task with its current daily_plan
  discipline_score field, unchanged.)

- PATCH /api/v1/daily-tasks/<id>/miss/
  Body: {"missed_reason": "optional string"}. Sets status="missed",
  missed_reason from body (default ""). Returns the updated daily task with
  the current daily_plan discipline_score (unchanged for now).

- PATCH /api/v1/daily-tasks/<id>/skip/
  Sets status="skipped". Returns the updated daily task.

- PATCH /api/v1/daily-tasks/<id>/reschedule/
  Body: {"scheduled_start_time": "HH:MM:SS", "scheduled_end_time": "HH:MM:SS"
  (optional), "target_date": "YYYY-MM-DD" (optional)}.
  If target_date is missing or equals the current plan's date, just update
  the scheduled times on this DailyTask. If target_date is a different date,
  set this DailyTask's status="rescheduled", and create/find the DailyPlan
  for (request.user, target_date) and create a new DailyTask there for the
  same Task with status="pending" and the given scheduled times. Return both
  the original (now rescheduled) daily task and the new one if created.

Do not implement streak or discipline score logic in this prompt.
After finishing, explain how to test each action with example requests.
```

---

## Phase 4 — Streaks and Discipline Score

### Prompt 4.1 — Streak model and update logic
```
In the `core` app, add a `Streak` model exactly matching
docs/database-design.md section 3.6 (user FK, category FK, current_streak,
longest_streak, last_completed_date, timestamps, unique_together
(user, category)). Create a migration.

Then update the `complete` action on DailyTask (from the previous prompt) so
that, after marking a DailyTask completed, it updates (or creates) the
Streak row for (request.user, daily_task.task.category):
- If category is null on the task, skip streak update entirely.
- Let today = daily_task.daily_plan.date.
- If streak.last_completed_date == today: do nothing further (already counted
  today).
- Else if streak.last_completed_date == today - 1 day: current_streak += 1.
- Else: current_streak = 1 (streak restarted).
- Set last_completed_date = today.
- If current_streak > longest_streak: longest_streak = current_streak.
Save the streak.

Add a read-only GET /api/v1/streaks/ endpoint listing all Streak rows for
request.user, with nested category {id, name, color}.
After finishing, explain how to test that completing tasks on consecutive
days increments current_streak, and that a gap resets it to 1.
```

### Prompt 4.2 — Discipline score logic
```
In the `core` app, implement discipline score updates inside the `complete`
and `miss` DailyTask actions, using these rules:
- Completing a task with task.priority in ("high","critical"): +10 to
  daily_plan.discipline_score
- Completing a task with task.priority in ("low","normal"): +5
- Missing a task with priority in ("high","critical"): -15
- Missing a task with priority in ("low","normal"): -5
- After applying the above, check: if ALL DailyTasks in this daily_plan now
  have status in ("completed","skipped") and at least one is "completed",
  and this bonus hasn't already been applied today (track this with a
  boolean field `all_priorities_bonus_applied` you add to DailyPlan via a
  small migration), add +20 once and set the flag.
- "Recovery bonus": if completing this task means category C now has a
  completion today, and yesterday's DailyPlan (if it exists) had zero
  completed DailyTasks for category C among ones that existed, add +10.
  Only apply once per category per day (you can check this by seeing if the
  streak's last_completed_date was NOT yesterday before this update, i.e.
  there was a gap).

Save daily_plan after each change. Return the updated discipline_score in
both the `complete` and `miss` responses as `daily_plan_discipline_score`.

Also add:
- GET /api/v1/discipline-score/today/ — returns {date, discipline_score,
  breakdown} where breakdown is a simple list you can reconstruct or track
  via a lightweight log (a JSONField on DailyPlan called `score_log` storing
  a list of {reason, delta} is fine — add via migration).
- POST /api/v1/discipline-score/recalculate/ — body {"date": "YYYY-MM-DD"},
  recomputes discipline_score from scratch for that date's DailyPlan by
  replaying all current DailyTask statuses through the rules above (reset to
  100 first, then apply each task's current status once).

After finishing, explain how to manually test a full day: complete two tasks,
miss one, and verify the score and breakdown.
```

### Prompt 4.3 — Never Miss Twice warning
```
In the `core` app, update the `miss` action on DailyTask so that, after
marking it missed, it checks: did this category (task.category) have ZERO
completed DailyTasks yesterday (in yesterday's DailyPlan for this user, if it
exists) as well as zero completed today (after this miss)? If true, include
a "warning" field in the response with this exact format:

"{Category name} has been missed 2 days in a row. Do one small session
today."

If the condition isn't met, omit the "warning" field entirely (don't include
it as null).
After finishing, explain how to test this by simulating two consecutive
missed days for one category (you can manually create DailyPlan/DailyTask
rows for yesterday via the Django admin or shell for testing).
```

---

## Phase 5 — Frontend Dashboard

### Prompt 5.1 — Frontend scaffold + auth
```
Create a Next.js 14 (App Router) + TypeScript + Tailwind CSS project inside
`frontend/`. Set up:
- An API client module (`lib/api.ts`) that wraps fetch calls to the backend
  at process.env.NEXT_PUBLIC_API_URL, attaching the JWT access token from
  storage as Authorization: Bearer header, and handling 401 by attempting a
  token refresh once.
- Login and Register pages (`/login`, `/register`) using the
  /api/v1/auth/login/ and /register/ endpoints, storing tokens securely
  (httpOnly cookie via a Next.js route handler is preferred; if simpler,
  localStorage is acceptable for this personal MVP — pick one and explain
  the tradeoff).
- An AuthContext/provider that exposes the current user (from
  /api/v1/auth/me/) and a loading state, and a route guard that redirects
  unauthenticated users to /login for all other pages.
- A minimal shared layout with a top nav showing: Dashboard, Today, Tasks,
  Streaks, Weekly Review, and a logout button.

Do not build the actual Dashboard/Today/etc. page content yet — placeholder
pages with just a heading are fine for now.
After finishing, explain how to set NEXT_PUBLIC_API_URL and run the dev
server.
```

### Prompt 5.2 — Dashboard page
```
Build the `/dashboard` page in the `frontend/` Next.js app:
- On load, call GET /api/v1/daily-plan/today/. If it returns 404, call
  POST /api/v1/daily-plan/generate/ with today's date, then use that result.
- Show a greeting with the user's name and today's date.
- Show the current discipline_score from the plan.
- Call GET /api/v1/streaks/ and show each category's current_streak in a
  compact horizontal list (category name + streak count, colored using the
  category's color).
- From the plan's daily_tasks, show "Today's main priorities" — daily tasks
  with task.priority in ("high","critical") and status="pending".
- Show "Missed tasks" — daily tasks with status="missed".
- Add a "What should I do next?" button that calls
  GET /api/v1/recommendation/next/ and displays the result (recommended task
  title + reason) in a card below the button. If recommended_daily_task is
  null, show the provided "reason" text as an encouraging message.

Use Tailwind for styling — keep it clean and readable, no need for a custom
design system yet. Do not build the Today, Tasks, Streaks, or Weekly Review
pages in this prompt.
After finishing, explain what manual setup (test user, a few tasks) is needed
to see the dashboard populated.
```

### Prompt 5.3 — Today page
```
Build the `/today` page in the `frontend/` Next.js app:
- Fetch today's plan the same way as the dashboard (GET
  /api/v1/daily-plan/today/, generate if missing).
- Render daily_tasks as a list ordered by scheduled_start_time (tasks with no
  scheduled time at the end), showing: time range (if set), task title,
  category badge (name + color), priority badge, estimated duration, and a
  status badge (pending/completed/missed/skipped/rescheduled with distinct
  colors).
- For tasks with status="pending", show three buttons: "Complete", "Missed",
  "Skip", calling the corresponding PATCH endpoints
  (/api/v1/daily-tasks/<id>/complete|miss|skip/). On success, update that
  task's status in local state without a full page reload. If the "miss"
  response includes a "warning" field, show it as a dismissible banner at the
  top of the page.
- For the "Missed" button, prompt the user for an optional reason (a simple
  text input in a small modal or inline field is fine) before calling the
  miss endpoint.

Do not implement reschedule UI in this prompt — that can be a follow-up if
needed.
After finishing, explain how to test marking tasks complete/missed/skipped
and seeing the warning banner.
```

### Prompt 5.4 — Task management page
```
Build the `/tasks` page in the `frontend/` Next.js app:
- List all tasks for the user (GET /api/v1/tasks/), showing title, category,
  priority, estimated duration, repeat type, and is_active status.
- A form (modal or inline panel) to create a new task: title, description,
  category (dropdown from GET /api/v1/categories/), priority (dropdown:
  low/normal/high/critical), estimated_duration_minutes (number input),
  due_date (date picker, optional), repeat_type (dropdown:
  none/daily/weekdays/weekly/custom), and if repeat_type is weekly or custom,
  a multi-select of weekdays for repeat_days.
- Allow editing an existing task (same form, pre-filled, PATCH on submit).
- Allow deleting a task (DELETE), with a confirmation prompt. Alternatively
  offer a toggle for is_active (PATCH) as a "soft delete" — include both
  options with delete requiring confirmation.

Do not build the Streaks or Weekly Review pages in this prompt.
After finishing, explain how to test creating a recurring task and confirm it
appears correctly in the dashboard/today views after generating a plan.
```

### Prompt 5.5 — Streaks page
```
Build the `/streaks` page in the `frontend/` Next.js app:
- Fetch GET /api/v1/streaks/.
- Display each category as a card showing: category name (with its color as
  an accent), current_streak (in days), longest_streak, and
  last_completed_date.
- Sort the list so categories with current_streak = 0 appear first (these are
  the ones needing attention), then by descending current_streak.
- If a category's last_completed_date is more than 1 day before today, show a
  small "needs attention" badge on that card.

Keep this page read-only — no editing actions.
After finishing, explain how this page should look after a few days of mixed
completions/misses.
```

---

## Phase 6 — Weekly Review

### Prompt 6.1 — Weekly review generation
```
In the `core` app, add a `WeeklyReview` model exactly matching
docs/database-design.md section 3.7. Create a migration.

Add POST /api/v1/weekly-review/generate/ — body {"date": "YYYY-MM-DD"}
(optional; default to today). Compute week_start_date (Monday) and
week_end_date (Sunday) containing that date. If a WeeklyReview for
(request.user, week_start_date) already exists, return it (200). Otherwise,
aggregate all DailyTask rows whose daily_plan.date is within
[week_start_date, week_end_date] and daily_plan.user = request.user:
- total_tasks = count of all such DailyTasks
- completed_tasks = count with status="completed"
- missed_tasks = count with status="missed"
- For each category present among these tasks, compute completion rate
  (completed / total for that category, among tasks with at least 1 total).
  strongest_category = category with highest completion rate (min 2 tasks to
  qualify; if tie, prefer the one with more completed tasks). weakest_category
  = lowest completion rate (same min-2 rule). If no category qualifies, leave
  both null.
- weekly_score = round(completed_tasks / total_tasks * 100) if total_tasks > 0
  else 0.
- summary: a plain-text string built from a template, e.g.:
  "This week you completed {completed_tasks} of {total_tasks} tasks
  ({weekly_score}%). {strongest_category.name or 'No category'} was your
  strongest area. {weakest_category.name or 'Nothing stood out as weak'} —
  consider making it a priority next week."
Create and save the WeeklyReview (201).

Add GET /api/v1/weekly-review/ (list, ordered by -week_start_date) and
GET /api/v1/weekly-review/<id>/ (detail), both scoped to request.user.
After finishing, explain how to test generating a review for a past week with
sample data.
```

### Prompt 6.2 — Weekly review page
```
Build the `/weekly-review` page in the `frontend/` Next.js app:
- Fetch GET /api/v1/weekly-review/ to list past reviews (show
  week_start_date - week_end_date and weekly_score for each, most recent
  first).
- Add a "Generate this week's review" button that calls POST
  /api/v1/weekly-review/generate/ with today's date, then displays the
  resulting review in detail: total/completed/missed tasks,
  strongest_category, weakest_category, weekly_score, and the summary text.
- Clicking a past review in the list opens its detail (GET
  /api/v1/weekly-review/<id>/) in the same detail panel.

Keep styling consistent with the other pages (reuse existing badge/card
styles where possible).
After finishing, explain how to generate and view a review for a completed
week using test data.
```
