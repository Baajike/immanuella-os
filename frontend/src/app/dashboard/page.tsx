"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedRoute } from "@/components/protected-route";
import {
  completeDailyTask,
  getNextRecommendation,
  getStreaks,
  getTodaysDailyPlan,
  getTodaysDisciplineScore,
  listWeeklyReviews,
  missDailyTask,
  skipDailyTask,
} from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import type {
  DailyPlan,
  DisciplineScore,
  Recommendation,
  Streak,
  WeeklyReview,
} from "@/types";

interface DashboardData {
  disciplineScore: DisciplineScore | null;
  recommendation: Recommendation | null;
  dailyPlan: DailyPlan | null;
  streaks: Streak[];
  weeklyReviews: WeeklyReview[];
}

interface DashboardErrors {
  disciplineScore?: string;
  recommendation?: string;
  dailyPlan?: string;
  streaks?: string;
  weeklyReviews?: string;
}

type DailyTaskAction = "complete" | "missed" | "skip";

const emptyDashboardData: DashboardData = {
  disciplineScore: null,
  recommendation: null,
  dailyPlan: null,
  streaks: [],
  weeklyReviews: [],
};

export default function DashboardPage() {
  const router = useRouter();

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <ProtectedRoute>
      {({ user }) => (
        <DashboardContent
          name={user.name || user.email}
          email={user.email}
          onLogout={handleLogout}
        />
      )}
    </ProtectedRoute>
  );
}

function DashboardContent({
  name,
  email,
  onLogout,
}: {
  name: string;
  email: string;
  onLogout: () => void;
}) {
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [errors, setErrors] = useState<DashboardErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeDailyTaskAction, setActiveDailyTaskAction] = useState<string | null>(null);
  const [dailyTaskActionError, setDailyTaskActionError] = useState<string | null>(null);
  const [dailyTaskActionSuccess, setDailyTaskActionSuccess] = useState<string | null>(
    null,
  );

  const loadDashboard = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      const accessToken = getAccessToken();

      if (!accessToken) {
        setIsLoading(false);
        return;
      }
      const token = accessToken;

      if (showLoading) {
        setIsLoading(true);
      }
      setErrors({});

      const [
        disciplineScore,
        recommendation,
        dailyPlan,
        streaks,
        weeklyReviews,
      ] = await Promise.allSettled([
        getTodaysDisciplineScore(token),
        getNextRecommendation(token),
        getTodaysDailyPlan(token),
        getStreaks(token),
        listWeeklyReviews(token),
      ]);

      setData({
        disciplineScore:
          disciplineScore.status === "fulfilled" ? disciplineScore.value : null,
        recommendation:
          recommendation.status === "fulfilled" ? recommendation.value : null,
        dailyPlan: dailyPlan.status === "fulfilled" ? dailyPlan.value : null,
        streaks: streaks.status === "fulfilled" ? streaks.value : [],
        weeklyReviews:
          weeklyReviews.status === "fulfilled" ? weeklyReviews.value.results : [],
      });

      setErrors({
        disciplineScore:
          disciplineScore.status === "rejected"
            ? getErrorMessage(disciplineScore.reason)
            : undefined,
        recommendation:
          recommendation.status === "rejected"
            ? getErrorMessage(recommendation.reason)
            : undefined,
        dailyPlan:
          dailyPlan.status === "rejected" ? getErrorMessage(dailyPlan.reason) : undefined,
        streaks:
          streaks.status === "rejected" ? getErrorMessage(streaks.reason) : undefined,
        weeklyReviews:
          weeklyReviews.status === "rejected"
            ? getErrorMessage(weeklyReviews.reason)
            : undefined,
      });
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleDailyTaskAction(dailyTaskId: number, action: DailyTaskAction) {
    const token = getAccessToken();
    if (!token) {
      setDailyTaskActionError("Your session is missing. Log in again to update tasks.");
      return;
    }

    const actionKey = `${dailyTaskId}-${action}`;

    try {
      setActiveDailyTaskAction(actionKey);
      setDailyTaskActionError(null);
      setDailyTaskActionSuccess(null);

      if (action === "complete") {
        await completeDailyTask(token, dailyTaskId);
      } else if (action === "missed") {
        await missDailyTask(token, dailyTaskId);
      } else {
        await skipDailyTask(token, dailyTaskId);
      }

      setDailyTaskActionSuccess("Today's plan is updated.");
      await loadDashboard({ showLoading: false });
    } catch (caught) {
      setDailyTaskActionError(getErrorMessage(caught));
    } finally {
      setActiveDailyTaskAction(null);
    }
  }

  const completedToday = useMemo(
    () =>
      data.dailyPlan?.daily_tasks.filter((dailyTask) => dailyTask.status === "completed")
        .length ?? 0,
    [data.dailyPlan],
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-parchment-200">
              ImmanuellaOS
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#fff8e7] sm:text-5xl">
              Hello, {name}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c7b8c3]">
              A quick read on today: score, next move, plan, streaks, and the
              latest weekly review.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#fff8e7]">{email}</p>
              <p className="text-xs text-[#c7b8c3]">Signed in</p>
            </div>
            <Link
              className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-[#fff8e7] transition hover:bg-white/[0.06]"
              href="/today"
            >
              Today
            </Link>
            <Link
              className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-[#fff8e7] transition hover:bg-white/[0.06]"
              href="/tasks"
            >
              Tasks
            </Link>
            <button
              className="rounded-md bg-parchment-100 px-3 py-2 text-sm font-semibold text-plum-950 transition hover:bg-parchment-200"
              onClick={onLogout}
              type="button"
            >
              Log out
            </button>
          </div>
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="grid gap-5">
            <RecommendationCard
              error={errors.recommendation}
              isLoading={isLoading}
              recommendation={data.recommendation}
            />
            <TodaysPlanCard
              activeAction={activeDailyTaskAction}
              actionError={dailyTaskActionError}
              actionSuccess={dailyTaskActionSuccess}
              completedCount={completedToday}
              dailyPlan={data.dailyPlan}
              error={errors.dailyPlan}
              isLoading={isLoading}
              onDailyTaskAction={handleDailyTaskAction}
            />
          </div>

          <div className="grid gap-5">
            <DisciplineScoreCard
              error={errors.disciplineScore}
              isLoading={isLoading}
              score={data.disciplineScore}
            />
            <StreaksCard error={errors.streaks} isLoading={isLoading} streaks={data.streaks} />
            <WeeklyReviewCard
              error={errors.weeklyReviews}
              isLoading={isLoading}
              reviews={data.weeklyReviews}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/15 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-parchment-200">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[#fff8e7]">{title}</h2>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function DisciplineScoreCard({
  score,
  error,
  isLoading,
}: {
  score: DisciplineScore | null;
  error?: string;
  isLoading: boolean;
}) {
  return (
    <DashboardCard eyebrow="Discipline" title="Today's score">
      <SectionState error={error} isLoading={isLoading}>
        {score ? (
          <div>
            <p className="text-5xl font-semibold text-parchment-100">
              {score.discipline_score}
            </p>
            <p className="mt-2 text-sm text-[#c7b8c3]">For {score.date}</p>
          </div>
        ) : (
          <EmptyState message="No score yet. Open today's plan to start the day." />
        )}
      </SectionState>
    </DashboardCard>
  );
}

function RecommendationCard({
  recommendation,
  error,
  isLoading,
}: {
  recommendation: Recommendation | null;
  error?: string;
  isLoading: boolean;
}) {
  const dailyTask = recommendation?.recommended_task;

  return (
    <DashboardCard
      className="border-parchment-200/40 bg-[#fff4cf] text-plum-950"
      eyebrow="What should I do next?"
      title={dailyTask?.task.title ?? "Recommendation"}
    >
      <SectionState darkText error={error} isLoading={isLoading}>
        {recommendation ? (
          dailyTask ? (
            <div>
              <p className="text-sm leading-6 text-[#4f3446]">{recommendation.message}</p>
              <p className="mt-4 rounded-md bg-plum-950/10 px-3 py-2 text-sm text-[#3a2635]">
                {recommendation.reason}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                <span className="rounded-full bg-plum-950 px-3 py-1 text-parchment-100">
                  {dailyTask.task.priority}
                </span>
                {dailyTask.scheduled_start_time ? (
                  <span className="rounded-full bg-plum-950/10 px-3 py-1 text-plum-950">
                    {dailyTask.scheduled_start_time}
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm leading-6 text-[#4f3446]">{recommendation.message}</p>
              <p className="mt-4 text-sm text-[#5d4655]">{recommendation.reason}</p>
            </div>
          )
        ) : (
          <EmptyState darkText message="No recommendation yet. Once today's plan exists, this card will pick the next move." />
        )}
      </SectionState>
    </DashboardCard>
  );
}

function TodaysPlanCard({
  dailyPlan,
  completedCount,
  error,
  isLoading,
  onDailyTaskAction,
  activeAction,
  actionError,
  actionSuccess,
}: {
  dailyPlan: DailyPlan | null;
  completedCount: number;
  error?: string;
  isLoading: boolean;
  onDailyTaskAction: (dailyTaskId: number, action: DailyTaskAction) => void;
  activeAction: string | null;
  actionError: string | null;
  actionSuccess: string | null;
}) {
  const dailyTasks = dailyPlan?.daily_tasks ?? [];

  return (
    <DashboardCard eyebrow="Today" title="Today's plan">
      <SectionState error={error} isLoading={isLoading}>
        {dailyPlan ? (
          dailyTasks.length ? (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3 text-sm text-[#c7b8c3]">
                <span>{dailyPlan.date}</span>
                <span>
                  {completedCount}/{dailyTasks.length} complete
                </span>
              </div>
              <div className="space-y-3">
                {dailyTasks.slice(0, 6).map((dailyTask) => (
                  <div
                    className="rounded-lg border border-white/10 bg-plum-950/50 p-3"
                    key={dailyTask.id}
                  >
                    <div>
                      <p className="font-medium text-[#fff8e7]">{dailyTask.task.title}</p>
                      <p className="mt-1 text-xs text-[#c7b8c3]">
                        {dailyTask.task.category?.name ?? "No category"} ·{" "}
                        {dailyTask.task.priority}
                      </p>
                    </div>
                    <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-[#d8cbd4]">
                      {dailyTask.status}
                    </span>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <DailyTaskActionButton
                        action="complete"
                        activeAction={activeAction}
                        dailyTaskId={dailyTask.id}
                        label="Complete"
                        onDailyTaskAction={onDailyTaskAction}
                      />
                      <DailyTaskActionButton
                        action="missed"
                        activeAction={activeAction}
                        dailyTaskId={dailyTask.id}
                        label="Missed"
                        onDailyTaskAction={onDailyTaskAction}
                      />
                      <DailyTaskActionButton
                        action="skip"
                        activeAction={activeAction}
                        dailyTaskId={dailyTask.id}
                        label="Skip"
                        onDailyTaskAction={onDailyTaskAction}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {actionError ? (
                <p className="mt-4 rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {actionError}
                </p>
              ) : null}
              {actionSuccess ? (
                <p className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                  {actionSuccess}
                </p>
              ) : null}
              {dailyTasks.length > 6 ? (
                <p className="mt-4 text-sm text-[#c7b8c3]">
                  Showing 6 of {dailyTasks.length}. The Today page will handle the full list.
                </p>
              ) : null}
            </div>
          ) : (
            <EmptyState message="Today's plan exists, but no tasks are scheduled yet." />
          )
        ) : (
          <EmptyState message="No daily plan loaded yet. The backend can create today's plan when requested." />
        )}
      </SectionState>
    </DashboardCard>
  );
}

function DailyTaskActionButton({
  dailyTaskId,
  action,
  label,
  activeAction,
  onDailyTaskAction,
}: {
  dailyTaskId: number;
  action: DailyTaskAction;
  label: string;
  activeAction: string | null;
  onDailyTaskAction: (dailyTaskId: number, action: DailyTaskAction) => void;
}) {
  const actionKey = `${dailyTaskId}-${action}`;
  const isActive = activeAction === actionKey;
  const isAnyActionActive = activeAction !== null;

  return (
    <button
      className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-[#fff8e7] transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isAnyActionActive}
      onClick={() => onDailyTaskAction(dailyTaskId, action)}
      type="button"
    >
      {isActive ? "Updating..." : label}
    </button>
  );
}

function StreaksCard({
  streaks,
  error,
  isLoading,
}: {
  streaks: Streak[];
  error?: string;
  isLoading: boolean;
}) {
  return (
    <DashboardCard eyebrow="Consistency" title="Streaks">
      <SectionState error={error} isLoading={isLoading}>
        {streaks.length ? (
          <div className="space-y-3">
            {streaks.slice(0, 5).map((streak) => (
              <div className="flex items-center justify-between gap-3" key={streak.id}>
                <div>
                  <p className="text-sm font-medium text-[#fff8e7]">
                    {streak.category.name}
                  </p>
                  <p className="text-xs text-[#c7b8c3]">
                    Best: {streak.longest_streak} day(s)
                  </p>
                </div>
                <p className="text-lg font-semibold text-parchment-100">
                  {streak.current_streak}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No streaks yet. Complete a categorized task to start one." />
        )}
      </SectionState>
    </DashboardCard>
  );
}

function WeeklyReviewCard({
  reviews,
  error,
  isLoading,
}: {
  reviews: WeeklyReview[];
  error?: string;
  isLoading: boolean;
}) {
  const latestReview = reviews[0];

  return (
    <DashboardCard eyebrow="Review" title="Weekly preview">
      <SectionState error={error} isLoading={isLoading}>
        {latestReview ? (
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-[#c7b8c3]">
                  {latestReview.week_start_date} to {latestReview.week_end_date}
                </p>
                <p className="mt-2 text-4xl font-semibold text-[#fff8e7]">
                  {latestReview.weekly_score}
                </p>
              </div>
              <p className="text-sm text-parchment-100">
                {latestReview.completed_tasks}/{latestReview.total_tasks} done
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#c7b8c3]">{latestReview.summary}</p>
          </div>
        ) : (
          <EmptyState message="No weekly reviews yet. Generate one after there is enough history." />
        )}
      </SectionState>
    </DashboardCard>
  );
}

function SectionState({
  children,
  error,
  isLoading,
  darkText = false,
}: {
  children: React.ReactNode;
  error?: string;
  isLoading: boolean;
  darkText?: boolean;
}) {
  if (isLoading) {
    return (
      <div className={darkText ? "text-sm text-[#5d4655]" : "text-sm text-[#c7b8c3]"}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <p
        className={
          darkText
            ? "rounded-md bg-red-900/10 px-3 py-2 text-sm text-red-950"
            : "rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-100"
        }
      >
        {error}
      </p>
    );
  }

  return <>{children}</>;
}

function EmptyState({ message, darkText = false }: { message: string; darkText?: boolean }) {
  return (
    <p className={darkText ? "text-sm leading-6 text-[#5d4655]" : "text-sm leading-6 text-[#c7b8c3]"}>
      {message}
    </p>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Could not load this section.";
}
