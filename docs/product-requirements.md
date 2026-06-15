# ImmanuellaOS — Product Requirements Document

## 1. Project Overview

ImmanuellaOS is a personal life operating system: a web application that helps
Immanuella plan her days, track consistency across the areas of life she cares
about (work, backend learning, cybersecurity, Spanish, personal projects,
chores, health, rest, admin), and get a clear, honest answer to the question
**"What should I do now?"**

It is not a generic to-do list. It is an accountability tool that:

- Tracks what was planned vs. what actually happened.
- Surfaces patterns (e.g. "you've skipped backend twice in a row").
- Recommends the next task based on time, priorities, and recent behavior.
- Gives a weekly review with a grade and a recommended focus area.

The tone is direct, honest, playful, and slightly savage — but never insulting
or shaming. The goal is awareness and momentum, not guilt.

## 2. Problem Statement

Immanuella is juggling many parallel goals (a job, backend learning,
cybersecurity learning, Spanish learning, personal software projects,
work-related projects, chores, self-development, and a long-term goal of
financial freedom). When the volume of "things to do" becomes overwhelming,
she defaults to low-effort distractions (social media, YouTube) instead of
acting on her plan.

Existing to-do apps fail because they:

- Treat every task the same, with no sense of identity or category-level
  consistency.
- Don't notice patterns of neglect until it's too late.
- Don't tell the user what to do *right now* given their actual situation.
- Motivate with generic quotes instead of the user's own data.

ImmanuellaOS solves this by combining task management, daily planning, streak
tracking, a discipline score, and a recommendation engine that uses
Immanuella's real schedule and history.

## 3. Target User

**Primary user: Immanuella (single-user MVP).**

Context that shapes the design:

- Student and working professional (currently doing National Service in a
  cybersecurity-related IT role).
- Actively learning backend development, cybersecurity/ethical hacking, and
  Spanish.
- Builds personal and professional software projects regularly.
- Struggles with consistency when overwhelmed — tends to disengage rather than
  triage.
- Prefers simple, direct, practical guidance over long explanations.
- Responds well to a "personal coach" tone: motivating, playful, occasionally
  blunt, never cruel.

The system may be opened up to other users later, but the MVP is explicitly
single-tenant in spirit (even if the data model supports multiple users from
day one for clean architecture).

## 4. Goals

1. Give Immanuella a single place to plan her day across all life categories.
2. Make it obvious, every day, what was done, what was missed, and what's next.
3. Track per-category streaks and a daily discipline score to build awareness
   of consistency over time.
4. Provide a rule-based "What should I do next?" recommendation that responds
   to time of day, priorities, and recent missed tasks.
5. Provide a weekly review that highlights strong/weak categories and
   recommends a focus for the following week.
6. Apply the "Never Miss Twice" rule: one missed day in a category is normal,
   two in a row triggers a visible warning/nudge.
7. Keep the MVP small enough to be built and maintained by one person using AI
   coding assistance (Codex/ChatGPT), with clean docs to keep development
   focused.

## 5. Non-Goals (for MVP)

ImmanuellaOS MVP will **not** include:

- Phone usage monitoring or screen-time tracking.
- Location tracking or geofencing.
- AI-generated coaching messages (rule-based logic only for MVP; AI coach is a
  future phase).
- Calendar sync (Google Calendar, Outlook, etc.).
- Mobile app (web-responsive only).
- Notifications/push reminders (may be considered post-MVP).
- Multi-user collaboration, sharing, or social features.
- Habit-stacking visualizations, gamification beyond streaks and discipline
  score (badges, levels, etc.).
- Offline support / PWA.

These are explicitly deferred so the MVP stays buildable.

## 6. MVP Features

1. User authentication (register, login, logout, current user).
2. Task categories (Work, Backend, Cybersecurity, Spanish, Personal Projects,
   Chores, Health, Rest, Admin/Life Tasks — user can add more).
3. Daily tasks — tasks scheduled for a specific day, optionally recurring.
4. Daily schedule — time-blocked view of the day's tasks.
5. Mark task as completed.
6. Mark task as missed (with optional reason).
7. Streak tracking per category (current streak, longest streak, missed days).
8. Discipline score — daily score starting at 100, adjusted by completions and
   misses.
9. "What should I do next?" — rule-based recommendation engine.
10. Weekly review summary — completed/missed counts, strongest/weakest
    category, weekly grade, recommended focus for next week.

## 7. Future Features (Post-MVP)

- AI Coach: natural-language weekly/daily accountability messages generated
  from completion data, using the OpenAI API.
- Notifications/reminders (email, browser push).
- Energy-level input affecting recommendations.
- Calendar integration.
- Habit templates / quick-add common routines.
- Mobile-friendly PWA with offline support.
- Data export (CSV/JSON) for personal analytics.
- Multi-user support with shared accountability groups.

## 8. User Stories

- As Immanuella, I want to log in and see a dashboard that greets me and shows
  today's priorities, so I immediately know where to focus.
- As Immanuella, I want to create tasks with a category, priority, and
  estimated duration, so the system can reason about my schedule.
- As Immanuella, I want to mark a task as completed or missed, so my history
  reflects reality.
- As Immanuella, I want to see my current streak per category, so I'm aware
  when I'm about to break one.
- As Immanuella, I want the app to warn me if I've missed the same category two
  days in a row, so small lapses don't become patterns.
- As Immanuella, I want to tap a "What should I do next?" button and get a
  single clear recommendation based on my current time, pending tasks, and
  recent misses.
- As Immanuella, I want a weekly review that tells me my strongest and weakest
  categories and what to focus on next week, so I can course-correct.
- As Immanuella, I want my discipline score to reflect my day honestly without
  feeling like punishment, so I stay motivated instead of discouraged.

## 9. Success Metrics

Since this is a personal tool, success is measured qualitatively and
behaviorally rather than via business metrics:

- **Daily usage**: Immanuella opens the app and interacts with it (marks tasks,
  checks recommendations) most days of the week.
- **Reduced overwhelm**: Self-reported reduction in "I don't know what to do"
  moments leading to distraction (social media/YouTube spirals).
- **Streak health**: Fewer categories with 2+ day gaps over time, especially
  for backend and cybersecurity learning.
- **Weekly review usage**: Weekly review is generated and reviewed at least
  once per week, and influences the following week's plan.
- **System reliability**: Core flows (create task, mark complete/missed, get
  recommendation, generate weekly review) work without errors across a typical
  week of use.

## 10. Risks

- **Scope creep**: The "life OS" framing invites endless feature ideas
  (notifications, AI coach, mobile app). Mitigation: strict MVP feature list,
  future features explicitly deferred and documented.
- **Abandonment risk**: Personal tools often get built and then unused.
  Mitigation: keep the daily loop (dashboard → mark tasks → recommendation)
  fast and low-friction; avoid requiring excessive manual data entry.
- **Discipline score causing discouragement**: A poorly tuned scoring system
  could feel punishing. Mitigation: design score rules to reward recovery and
  consistency, not just punish misses; keep messaging framed around awareness.
- **Recommendation logic feels generic or wrong**: If the rule-based engine
  gives bad suggestions, trust in the app drops. Mitigation: keep rules simple,
  transparent, and tunable; allow manual override (mark as skipped) without
  penalty spirals.
- **Over-engineering the data model early**: Adding too many fields/models
  before the MVP is used in practice. Mitigation: build the schema in this doc
  as the baseline, but treat it as versioned — adjust after first real week of
  usage.

## 11. Scope Boundaries

**In scope for MVP:**
- Single-user (architecturally multi-user-ready) web app.
- Auth, categories, tasks, daily plans/tasks, streaks, discipline score,
  rule-based recommendation, weekly review.
- Next.js + TypeScript + Tailwind frontend, Django + DRF backend, PostgreSQL,
  JWT auth.

**Out of scope for MVP (see Future Features):**
- AI-generated coaching content.
- Notifications, calendar sync, mobile app, offline support, multi-user
  social features, analytics export.

Any feature not explicitly listed in Section 6 (MVP Features) requires a
deliberate decision to add it — default answer is "not yet."
