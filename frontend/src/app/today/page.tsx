"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppNavigation } from "@/components/app-navigation";
import { ProtectedRoute } from "@/components/protected-route";
import {
  ApiError,
  completeDailyTask,
  getNextRecommendation,
  getTodaysDailyPlan,
  getTodaysDisciplineScore,
  missDailyTask,
  rescheduleDailyTask,
  skipDailyTask,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type {
  DailyPlan,
  DailyTask,
  DisciplineScore,
  Recommendation,
} from "@/types";

type DailyTaskAction = "complete" | "missed" | "skip";

interface TodayData {
  dailyPlan: DailyPlan | null;
  recommendation: Recommendation | null;
  disciplineScore: DisciplineScore | null;
}

interface TodayErrors {
  dailyPlan?: string;
  recommendation?: string;
  disciplineScore?: string;
}

const emptyTodayData: TodayData = {
  dailyPlan: null,
  recommendation: null,
  disciplineScore: null,
};

export default function TodayPage() {
  return <ProtectedRoute>{() => <TodayContent />}</ProtectedRoute>;
}

function TodayContent() {
  const [data, setData] = useState<TodayData>(emptyTodayData);
  const [errors, setErrors] = useState<TodayErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadToday = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      const token = getAccessToken();

      if (!token) {
        setIsLoading(false);
        setErrors({ dailyPlan: "Your session is missing. Log in again." });
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }
      setErrors({});

      const [dailyPlan, recommendation, disciplineScore] = await Promise.allSettled([
        getTodaysDailyPlan(token),
        getNextRecommendation(token),
        getTodaysDisciplineScore(token),
      ]);

      setData({
        dailyPlan: dailyPlan.status === "fulfilled" ? dailyPlan.value : null,
        recommendation:
          recommendation.status === "fulfilled" ? recommendation.value : null,
        disciplineScore:
          disciplineScore.status === "fulfilled" ? disciplineScore.value : null,
      });

      setErrors({
        dailyPlan:
          dailyPlan.status === "rejected" ? getErrorMessage(dailyPlan.reason) : undefined,
        recommendation:
          recommendation.status === "rejected"
            ? getErrorMessage(recommendation.reason)
            : undefined,
        disciplineScore:
          disciplineScore.status === "rejected"
            ? getErrorMessage(disciplineScore.reason)
            : undefined,
      });
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  const sortedDailyTasks = useMemo(
    () => sortDailyTasks(data.dailyPlan?.daily_tasks ?? []),
    [data.dailyPlan],
  );

  const completedCount = useMemo(
    () => sortedDailyTasks.filter((dailyTask) => dailyTask.status === "completed").length,
    [sortedDailyTasks],
  );

  async function handleDailyTaskAction(dailyTaskId: number, action: DailyTaskAction) {
    const token = getAccessToken();
    if (!token) {
      setActionError("Your session is missing. Log in again to update today.");
      return;
    }

    const actionKey = `${dailyTaskId}-${action}`;

    try {
      setActiveAction(actionKey);
      setActionError(null);
      setSuccessMessage(null);

      if (action === "complete") {
        await completeDailyTask(token, dailyTaskId);
      } else if (action === "missed") {
        await missDailyTask(token, dailyTaskId);
      } else {
        await skipDailyTask(token, dailyTaskId);
      }

      setSuccessMessage("Updated. The score and next move have been refreshed.");
      await loadToday({ showLoading: false });
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  async function handleReschedule(
    dailyTaskId: number,
    scheduledStartTime: string,
    scheduledEndTime: string,
  ) {
    const token = getAccessToken();
    if (!token) {
      setActionError("Your session is missing. Log in again to reschedule today.");
      return;
    }

    try {
      setActiveAction(`${dailyTaskId}-reschedule`);
      setActionError(null);
      setSuccessMessage(null);
      await rescheduleDailyTask(token, dailyTaskId, {
        scheduled_start_time: normalizeTimeInput(scheduledStartTime),
        scheduled_end_time: normalizeTimeInput(scheduledEndTime),
        target_date: data.dailyPlan?.date,
      });
      setSuccessMessage("Rescheduled. Today's plan is refreshed.");
      await loadToday({ showLoading: false });
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-parchment-200">
              Today
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#fff8e7] sm:text-5xl">
              Work the plan.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c7b8c3]">
              See every scheduled daily task, update the truth, and keep the next move visible.
            </p>
          </div>
          <AppNavigation current="today" />
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="grid gap-5">
            <TodaySummaryCard
              completedCount={completedCount}
              dailyPlan={data.dailyPlan}
              error={errors.dailyPlan}
              isLoading={isLoading}
              totalCount={sortedDailyTasks.length}
            />
            <DailyTaskList
              activeAction={activeAction}
              actionError={actionError}
              actionSuccess={successMessage}
              dailyPlan={data.dailyPlan}
              dailyTasks={sortedDailyTasks}
              error={errors.dailyPlan}
              isLoading={isLoading}
              onAction={handleDailyTaskAction}
              onReschedule={handleReschedule}
            />
          </div>

          <div className="grid gap-5 content-start">
            <RecommendationCard
              error={errors.recommendation}
              isLoading={isLoading}
              recommendation={data.recommendation}
            />
            <ScoreCard
              error={errors.disciplineScore}
              isLoading={isLoading}
              score={data.disciplineScore}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function TodayCard({
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
    <section
      className={`rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/15 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-parchment-200">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[#fff8e7]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TodaySummaryCard({
  dailyPlan,
  completedCount,
  totalCount,
  error,
  isLoading,
}: {
  dailyPlan: DailyPlan | null;
  completedCount: number;
  totalCount: number;
  error?: string;
  isLoading: boolean;
}) {
  return (
    <TodayCard eyebrow="Plan" title={dailyPlan?.date ?? "Today's plan"}>
      <SectionState error={error} isLoading={isLoading}>
        {dailyPlan ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Scheduled" value={totalCount.toString()} />
            <Metric label="Completed" value={completedCount.toString()} />
            <Metric label="Remaining" value={Math.max(totalCount - completedCount, 0).toString()} />
          </div>
        ) : (
          <EmptyState message="No daily plan loaded yet. Try the Tasks page to schedule something into today." />
        )}
      </SectionState>
    </TodayCard>
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
    <TodayCard
      className="border-parchment-200/40 bg-[#fff4cf] text-plum-950"
      eyebrow="Next"
      title={dailyTask?.task.title ?? "Recommendation"}
    >
      <SectionState darkText error={error} isLoading={isLoading}>
        {recommendation ? (
          <div>
            <p className="text-sm leading-6 text-[#4f3446]">{recommendation.message}</p>
            <p className="mt-4 rounded-md bg-plum-950/10 px-3 py-2 text-sm text-[#3a2635]">
              {recommendation.reason}
            </p>
            {dailyTask ? (
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                <span className="rounded-full bg-plum-950 px-3 py-1 text-parchment-100">
                  {dailyTask.task.priority}
                </span>
                <span className="rounded-full bg-plum-950/10 px-3 py-1 text-plum-950">
                  {formatTimeRange(
                    dailyTask.scheduled_start_time,
                    dailyTask.scheduled_end_time,
                  )}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            darkText
            message="No recommendation yet. Once today has pending work, this will pick a next move."
          />
        )}
      </SectionState>
    </TodayCard>
  );
}

function ScoreCard({
  score,
  error,
  isLoading,
}: {
  score: DisciplineScore | null;
  error?: string;
  isLoading: boolean;
}) {
  return (
    <TodayCard eyebrow="Discipline" title="Today's score">
      <SectionState error={error} isLoading={isLoading}>
        {score ? (
          <div>
            <p className="text-5xl font-semibold text-parchment-100">
              {score.discipline_score}
            </p>
            <p className="mt-2 text-sm text-[#c7b8c3]">For {score.date}</p>
          </div>
        ) : (
          <EmptyState message="No score yet. Update a daily task to start the signal." />
        )}
      </SectionState>
    </TodayCard>
  );
}

function DailyTaskList({
  dailyPlan,
  dailyTasks,
  error,
  isLoading,
  activeAction,
  actionError,
  actionSuccess,
  onAction,
  onReschedule,
}: {
  dailyPlan: DailyPlan | null;
  dailyTasks: DailyTask[];
  error?: string;
  isLoading: boolean;
  activeAction: string | null;
  actionError: string | null;
  actionSuccess: string | null;
  onAction: (dailyTaskId: number, action: DailyTaskAction) => void;
  onReschedule: (
    dailyTaskId: number,
    scheduledStartTime: string,
    scheduledEndTime: string,
  ) => void;
}) {
  return (
    <TodayCard eyebrow="Schedule" title="Daily tasks">
      <SectionState error={error} isLoading={isLoading}>
        {dailyPlan && dailyTasks.length ? (
          <div>
            <div className="space-y-4">
              {dailyTasks.map((dailyTask) => (
                <DailyTaskItem
                  activeAction={activeAction}
                  dailyTask={dailyTask}
                  key={dailyTask.id}
                  onAction={onAction}
                  onReschedule={onReschedule}
                />
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
          </div>
        ) : dailyPlan ? (
          <EmptyState message="Today's plan exists, but nothing is scheduled yet. Add a task from the Tasks page." />
        ) : (
          <EmptyState message="No plan loaded yet. Add something from the Tasks page to begin." />
        )}
      </SectionState>
    </TodayCard>
  );
}

function DailyTaskItem({
  dailyTask,
  activeAction,
  onAction,
  onReschedule,
}: {
  dailyTask: DailyTask;
  activeAction: string | null;
  onAction: (dailyTaskId: number, action: DailyTaskAction) => void;
  onReschedule: (
    dailyTaskId: number,
    scheduledStartTime: string,
    scheduledEndTime: string,
  ) => void;
}) {
  const [startTime, setStartTime] = useState(toTimeInputValue(dailyTask.scheduled_start_time));
  const [endTime, setEndTime] = useState(toTimeInputValue(dailyTask.scheduled_end_time));

  useEffect(() => {
    setStartTime(toTimeInputValue(dailyTask.scheduled_start_time));
    setEndTime(toTimeInputValue(dailyTask.scheduled_end_time));
  }, [dailyTask.scheduled_end_time, dailyTask.scheduled_start_time]);

  return (
    <article className="rounded-lg border border-white/10 bg-plum-950/50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[#fff8e7]">{dailyTask.task.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#d8cbd4]">
            <Badge>{dailyTask.task.category?.name ?? "No category"}</Badge>
            <Badge>{dailyTask.task.priority}</Badge>
            <Badge>{formatTimeRange(dailyTask.scheduled_start_time, dailyTask.scheduled_end_time)}</Badge>
            <Badge>{dailyTask.task.estimated_duration_minutes} min</Badge>
            <Badge>{dailyTask.status}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            action="complete"
            activeAction={activeAction}
            dailyTaskId={dailyTask.id}
            label="Complete"
            onAction={onAction}
          />
          <ActionButton
            action="missed"
            activeAction={activeAction}
            dailyTaskId={dailyTask.id}
            label="Missed"
            onAction={onAction}
          />
          <ActionButton
            action="skip"
            activeAction={activeAction}
            dailyTaskId={dailyTask.id}
            label="Skip"
            onAction={onAction}
          />
        </div>
      </div>

      <form
        className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          onReschedule(dailyTask.id, startTime, endTime);
        }}
      >
        <TimeInput label="Start" onChange={setStartTime} required value={startTime} />
        <TimeInput label="End" onChange={setEndTime} required value={endTime} />
        <button
          className="self-end rounded-md border border-parchment-200/40 px-4 py-3 text-sm font-semibold text-parchment-100 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={activeAction !== null}
          type="submit"
        >
          {activeAction === `${dailyTask.id}-reschedule` ? "Rescheduling..." : "Reschedule"}
        </button>
      </form>
    </article>
  );
}

function ActionButton({
  dailyTaskId,
  action,
  label,
  activeAction,
  onAction,
}: {
  dailyTaskId: number;
  action: DailyTaskAction;
  label: string;
  activeAction: string | null;
  onAction: (dailyTaskId: number, action: DailyTaskAction) => void;
}) {
  const actionKey = `${dailyTaskId}-${action}`;
  const isActive = activeAction === actionKey;

  return (
    <button
      className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-[#fff8e7] transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={activeAction !== null}
      onClick={() => onAction(dailyTaskId, action)}
      type="button"
    >
      {isActive ? "Updating..." : label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-plum-950/50 p-4">
      <p className="text-sm text-[#c7b8c3]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-parchment-100">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 px-3 py-1 capitalize">
      {children}
    </span>
  );
}

function TimeInput({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-[#fff8e7]">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type="time"
        value={value}
      />
    </label>
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
    <p
      className={
        darkText ? "text-sm leading-6 text-[#5d4655]" : "text-sm leading-6 text-[#c7b8c3]"
      }
    >
      {message}
    </p>
  );
}

function sortDailyTasks(dailyTasks: DailyTask[]) {
  return [...dailyTasks].sort((first, second) => {
    const firstTime = first.scheduled_start_time ?? "99:99:99";
    const secondTime = second.scheduled_start_time ?? "99:99:99";
    if (firstTime !== secondTime) {
      return firstTime.localeCompare(secondTime);
    }
    return first.id - second.id;
  });
}

function normalizeTimeInput(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function toTimeInputValue(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

function formatTimeRange(start: string | null, end: string | null) {
  if (start && end) {
    return `${start.slice(0, 5)}-${end.slice(0, 5)}`;
  }
  if (start) {
    return start.slice(0, 5);
  }
  return "Unscheduled";
}

function getErrorMessage(caught: unknown) {
  if (caught instanceof ApiError) {
    return caught.message;
  }
  if (caught instanceof Error) {
    return caught.message;
  }
  return "Something went wrong.";
}
