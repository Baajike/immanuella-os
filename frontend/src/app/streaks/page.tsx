"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppNavigation } from "@/components/app-navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { ApiError, getStreaks } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Streak } from "@/types";

export default function StreaksPage() {
  return (
    <ProtectedRoute>
      {() => <StreaksContent />}
    </ProtectedRoute>
  );
}

function StreaksContent() {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStreaks = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      setError("Your session is missing. Log in again to view streaks.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setStreaks(await getStreaks(token));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStreaks();
  }, [loadStreaks]);

  const summary = useMemo(() => {
    return {
      bestCurrent: Math.max(0, ...streaks.map((streak) => streak.current_streak)),
      bestLongest: Math.max(0, ...streaks.map((streak) => streak.longest_streak)),
    };
  }, [streaks]);

  const strongestStreakId = useMemo(() => {
    if (!streaks.length) {
      return null;
    }

    return streaks.reduce((strongest, streak) => {
      if (streak.current_streak !== strongest.current_streak) {
        return streak.current_streak > strongest.current_streak ? streak : strongest;
      }
      return streak.longest_streak > strongest.longest_streak ? streak : strongest;
    }).id;
  }, [streaks]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-parchment-200">
              Consistency
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#fff8e7] sm:text-5xl">
              Category streaks.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c7b8c3]">
              A clear view of where your consistency is holding and what has room to grow.
            </p>
          </div>
          <AppNavigation current="streaks" />
        </header>

        {isLoading ? (
          <StreaksLoading />
        ) : error ? (
          <ErrorState error={error} onRetry={loadStreaks} />
        ) : streaks.length ? (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Streak summary">
              <SummaryCard label="Categories with streaks" value={streaks.length} />
              <SummaryCard label="Best current streak" value={summary.bestCurrent} suffix="days" />
              <SummaryCard label="Best longest streak" value={summary.bestLongest} suffix="days" />
            </section>

            <section className="mt-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-parchment-200">
                    By category
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#fff8e7]">
                    Your active record
                  </h2>
                </div>
                <p className="text-sm text-[#c7b8c3]">Updated when tasks are completed</p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {streaks.map((streak) => (
                  <StreakCard
                    isStrongest={streak.id === strongestStreakId}
                    key={streak.id}
                    streak={streak}
                  />
                ))}
              </div>
            </section>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/15">
      <p className="text-sm text-[#c7b8c3]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-parchment-100">
        {value}
        {suffix ? <span className="ml-2 text-sm font-medium text-[#c7b8c3]">{suffix}</span> : null}
      </p>
    </article>
  );
}

function StreakCard({ streak, isStrongest }: { streak: Streak; isStrongest: boolean }) {
  return (
    <article
      className={`rounded-lg border p-5 shadow-xl shadow-black/15 ${
        isStrongest
          ? "border-parchment-200/50 bg-[#fff4cf] text-plum-950"
          : "border-white/10 bg-white/[0.045]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: streak.category.color }}
          />
          <h3
            className={`truncate text-lg font-semibold ${
              isStrongest ? "text-plum-950" : "text-[#fff8e7]"
            }`}
          >
            {streak.category.name}
          </h3>
        </div>
        {isStrongest ? (
          <span className="shrink-0 rounded-full bg-plum-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-parchment-100">
            Strongest
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StreakMetric darkText={isStrongest} label="Current" value={streak.current_streak} />
        <StreakMetric darkText={isStrongest} label="Longest" value={streak.longest_streak} />
      </div>

      <p className={`mt-5 text-sm ${isStrongest ? "text-[#5d4655]" : "text-[#c7b8c3]"}`}>
        Last completed: {formatDate(streak.last_completed_date)}
      </p>
    </article>
  );
}

function StreakMetric({
  label,
  value,
  darkText,
}: {
  label: string;
  value: number;
  darkText: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        darkText ? "border-plum-950/10 bg-plum-950/5" : "border-white/10 bg-plum-950/50"
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${darkText ? "text-[#6b4a5e]" : "text-[#a996a3]"}`}>
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${darkText ? "text-plum-950" : "text-parchment-100"}`}>
        {value} <span className="text-sm font-medium">days</span>
      </p>
    </div>
  );
}

function StreaksLoading() {
  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-28 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" key={item} />
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-52 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" key={item} />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => Promise<void> }) {
  return (
    <section className="mt-6 rounded-lg border border-red-300/20 bg-red-500/10 p-5">
      <p className="text-sm leading-6 text-red-100">{error}</p>
      <button
        className="mt-4 rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-[#fff8e7] transition hover:bg-white/[0.06]"
        onClick={() => void onRetry()}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-xl shadow-black/15">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-parchment-200">
        No streaks yet
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[#fff8e7]">Start with one completion.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c7b8c3]">
        Complete a scheduled task with a category and its streak will appear here. Small, repeated work counts.
      </p>
    </section>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not completed yet";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function getErrorMessage(caught: unknown) {
  if (caught instanceof ApiError) {
    return caught.message;
  }
  if (caught instanceof Error) {
    return caught.message;
  }
  return "Something went wrong while loading streaks.";
}
