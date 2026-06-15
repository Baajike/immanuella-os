# AGENTS.md — ImmanuellaOS

This file defines how AI coding agents (Codex, ChatGPT, Claude, etc.) should
behave when working on this project. Read this before making any changes.

## 1. Project Description

ImmanuellaOS is a personal life operating system: a web app that helps the
owner (Immanuella) plan her day across multiple life categories (work,
backend learning, cybersecurity, Spanish, personal projects, chores, health,
rest, admin), track completion vs. misses, maintain per-category streaks, see
a daily discipline score, get a rule-based "what should I do next?"
recommendation, and review weekly progress.

Stack:
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Django + Django REST Framework
- **Database**: PostgreSQL
- **Auth**: JWT (access + refresh)
- **AI**: OpenAI API — **future phase only**, not in MVP

Reference docs (read before starting related work):
- `docs/product-requirements.md` — what we're building and why
- `docs/database-design.md` — models, fields, relationships
- `docs/api-spec.md` — exact endpoint contracts
- `docs/mvp-roadmap.md` — phased build order
- `docs/codex-prompts.md` — the actual step-by-step prompts being executed

## 2. General Coding Rules

- **Stay in scope.** Only implement what the current prompt/task describes.
  Do not add extra features, libraries, abstractions, or "nice to haves"
  unless explicitly asked.
- **Follow the docs.** Model fields, endpoint paths, request/response shapes,
  and choice values must match `docs/database-design.md` and
  `docs/api-spec.md` exactly unless the user explicitly says to change them.
  If something in a prompt conflicts with these docs, flag the conflict
  instead of silently picking one.
- **Don't touch unrelated files.** A backend task should not modify frontend
  files and vice versa, unless the task is explicitly cross-cutting (e.g.
  changing an API contract that the frontend already calls).
- **Small, reviewable changes.** Prefer several small commits/diffs over one
  giant change. After each unit of work, summarize what changed.
- **No speculative AI features.** Do not add OpenAI API calls, AI coach logic,
  or "smart" features beyond rule-based logic unless the task is explicitly
  in Phase 7 (AI Coach).
- **Explain after finishing.** After completing a task, briefly explain (a)
  what was changed/added, (b) how to test it manually, and (c) any follow-up
  the user should be aware of (new env vars, migrations to run, etc.).

## 3. Backend Rules

- All models live in the `core` Django app for the MVP (don't split into
  multiple apps unless asked).
- Every user-owned model has a `user` ForeignKey (directly or via a parent
  like `daily_plan.user`). Every queryset in a view/viewset MUST filter by
  `request.user`. Never return another user's data.
- Use DRF `ModelSerializer` and `ModelViewSet`/`APIView` consistently. Match
  field names and choice values exactly as specified in
  `docs/database-design.md`.
- Endpoint paths, methods, request bodies, and response shapes must match
  `docs/api-spec.md`. If a change is needed, update the doc in the same
  change and call it out explicitly.
- Error responses follow the format in `docs/api-spec.md` Section 1
  (`{"error": {"code", "message", "details"}}`).
- Write a migration for every model change. Never edit an already-applied
  migration that's been committed — create a new one.
- Use environment variables (via `django-environ` or similar) for all
  secrets and DB config. Never hardcode credentials. Update `.env.example`
  when adding new variables.
- Keep business logic (discipline score, streaks, recommendation,
  weekly review) in clearly named functions/services, not buried inline in
  views, so it can be tested and reused.

## 4. Frontend Rules

- Use the App Router, TypeScript, and Tailwind CSS as configured in Phase 5.
- All API calls go through the shared API client (`lib/api.ts`) — don't call
  `fetch` directly in components for endpoints that need auth.
- Keep pages focused: Dashboard, Today, Tasks, Streaks, Weekly Review are
  separate routes/pages as defined in `docs/product-requirements.md` Section
  6 ("Important MVP Screens"). Don't merge or split these without discussion.
- Prefer simple, readable Tailwind utility classes over custom CSS files
  unless a clear pattern repeats often enough to warrant a shared component.
- Handle loading and error states for every API call — never leave a blank
  screen on failure; show a simple message.
- Keep the tone of UI copy consistent with the product's voice: direct,
  honest, encouraging, occasionally playful — never harsh or shaming (see
  `docs/product-requirements.md` Section "Tone of the App").

## 5. Security Rules

- Never log or print passwords, tokens, or `.env` contents.
- JWT access tokens must be short-lived; refresh tokens used only via the
  designated refresh endpoint.
- CORS should only allow the known frontend origin(s) — don't set
  `CORS_ALLOW_ALL_ORIGINS = True` outside of clearly-marked local dev config.
- Validate and sanitize all user input via serializers — don't trust client
  data for fields like `user`, `daily_plan`, etc.; these should be set
  server-side from `request.user` / resolved relationships, not taken from
  the request body.
- Don't commit `.env`, database dumps, or any file containing real
  credentials. `.env.example` only.

## 6. Testing Expectations

The MVP does not require full test coverage, but:

- Any new business logic with rules (discipline score calculation, streak
  updates, "Never Miss Twice" detection, recommendation logic, weekly review
  aggregation) should have at least a few unit tests covering the documented
  rules (see `docs/mvp-roadmap.md` for the exact rules per phase).
- New endpoints should have at least one test confirming: (a) unauthenticated
  requests are rejected, (b) a user cannot access another user's data, and
  (c) the happy path returns the expected shape.
- Frontend: manual testing is acceptable for MVP. If automated frontend tests
  are added later, prefer testing critical flows (login, mark task
  complete/missed, recommendation display) over exhaustive UI coverage.

## 7. Codex Behavior Expectations

- Work through `docs/codex-prompts.md` **in order**, one prompt at a time.
  Don't jump ahead to a later phase's prompt even if it seems related.
- If a prompt references something that doesn't exist yet (a model, field, or
  endpoint from an earlier prompt that wasn't completed), stop and report
  this instead of inventing it.
- If a prompt is ambiguous or seems to conflict with `docs/`, ask for
  clarification rather than guessing — especially for discipline score rules,
  streak logic, and recommendation priority order, since these encode the
  product's core value and getting them wrong undermines the whole app.
- Do not introduce new npm/pip packages beyond what's specified in a prompt
  without calling it out explicitly and explaining why it's needed.
- After each prompt, leave the project in a runnable state (migrations
  applied or instructions to apply them; no broken imports).
