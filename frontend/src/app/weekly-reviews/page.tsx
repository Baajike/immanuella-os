"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { ProtectedRoute } from "@/components/protected-route";
import {
  ApiError,
  generateWeeklyReview,
  generateWeeklyReviewForWeek,
  listWeeklyReviews,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { WeeklyReview } from "@/types";

export default function WeeklyReviewsPage() {
  return <ProtectedRoute>{() => <WeeklyReviewsContent />}</ProtectedRoute>;
}

function WeeklyReviewsContent() {
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<"current" | "specific" | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadReviews = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        setLoadError("Your session is missing. Log in again to view weekly reviews.");
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const reviewPage = await listWeeklyReviews(token);
        setReviews(reviewPage.results);
      } catch (caught) {
        setLoadError(getErrorMessage(caught));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function handleGenerateCurrentWeek() {
    const token = getAccessToken();
    if (!token) {
      setActionError("Your session is missing. Log in again to generate a review.");
      return;
    }

    try {
      setIsGenerating("current");
      setActionError(null);
      setSuccessMessage(null);
      const review = await generateWeeklyReview(token);
      setSuccessMessage(
        `Review ready for ${review.week_start_date} to ${review.week_end_date}.`,
      );
      await loadReviews({ showLoading: false });
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setIsGenerating(null);
    }
  }

  async function handleGenerateSpecificWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setActionError("Your session is missing. Log in again to generate a review.");
      return;
    }

    try {
      setIsGenerating("specific");
      setActionError(null);
      setSuccessMessage(null);
      const review = await generateWeeklyReviewForWeek(token, weekStartDate);
      setSuccessMessage(
        `Review ready for ${review.week_start_date} to ${review.week_end_date}.`,
      );
      setWeekStartDate("");
      await loadReviews({ showLoading: false });
    } catch (caught) {
      setActionError(getErrorMessage(caught));
    } finally {
      setIsGenerating(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-parchment-200">
              Weekly reviews
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#fff8e7] sm:text-5xl">
              Read the week honestly.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c7b8c3]">
              Generate a review, see what held, and decide where the next week needs more care.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-md border border-white/15 px-4 py-3 text-sm font-semibold text-[#fff8e7] transition hover:bg-white/[0.06]"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="rounded-md bg-parchment-100 px-4 py-3 text-sm font-semibold text-plum-950 transition hover:bg-parchment-200"
              href="/today"
            >
              Today
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(300px,0.7fr)_minmax(0,1.3fr)]">
          <ReviewControls
            actionError={actionError}
            isGenerating={isGenerating}
            onGenerateCurrentWeek={handleGenerateCurrentWeek}
            onGenerateSpecificWeek={handleGenerateSpecificWeek}
            onWeekStartDateChange={setWeekStartDate}
            successMessage={successMessage}
            weekStartDate={weekStartDate}
          />

          <ReviewList error={loadError} isLoading={isLoading} reviews={reviews} />
        </section>
      </div>
    </main>
  );
}

function ReviewControls({
  weekStartDate,
  isGenerating,
  actionError,
  successMessage,
  onWeekStartDateChange,
  onGenerateCurrentWeek,
  onGenerateSpecificWeek,
}: {
  weekStartDate: string;
  isGenerating: "current" | "specific" | null;
  actionError: string | null;
  successMessage: string | null;
  onWeekStartDateChange: (value: string) => void;
  onGenerateCurrentWeek: () => void;
  onGenerateSpecificWeek: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="h-fit rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/15">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-parchment-200">
        Generate
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[#fff8e7]">Choose a week</h2>
      <p className="mt-3 text-sm leading-6 text-[#c7b8c3]">
        Generate the current Monday-to-Sunday review, or choose the Monday that starts a specific week.
      </p>

      <button
        className="mt-5 w-full rounded-md bg-parchment-100 px-4 py-3 text-sm font-semibold text-plum-950 transition hover:bg-parchment-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isGenerating !== null}
        onClick={onGenerateCurrentWeek}
        type="button"
      >
        {isGenerating === "current" ? "Generating..." : "Generate current week"}
      </button>

      <form className="mt-5 border-t border-white/10 pt-5" onSubmit={onGenerateSpecificWeek}>
        <label className="block text-sm font-medium text-[#fff8e7]">
          Week start date
          <input
            className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
            onChange={(event) => onWeekStartDateChange(event.target.value)}
            required
            type="date"
            value={weekStartDate}
          />
        </label>
        <p className="mt-2 text-xs text-[#a996a3]">Choose a Monday.</p>
        <button
          className="mt-4 w-full rounded-md border border-parchment-200/40 px-4 py-3 text-sm font-semibold text-parchment-100 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isGenerating !== null || !weekStartDate}
          type="submit"
        >
          {isGenerating === "specific" ? "Generating..." : "Generate selected week"}
        </button>
      </form>

      {actionError ? (
        <p className="mt-5 rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {actionError}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mt-5 rounded-md border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {successMessage}
        </p>
      ) : null}
    </section>
  );
}

function ReviewList({
  reviews,
  isLoading,
  error,
}: {
  reviews: WeeklyReview[];
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-parchment-200">
            History
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#fff8e7]">Your weekly reviews</h2>
        </div>
        {!isLoading && !error ? (
          <p className="text-sm text-[#c7b8c3]">{reviews.length} review(s)</p>
        ) : null}
      </div>

      <div className="mt-5">
        {isLoading ? (
          <ReviewListLoading />
        ) : error ? (
          <p className="rounded-md border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : reviews.length ? (
          <div className="space-y-5">
            {reviews.map((review) => (
              <WeeklyReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6">
            <p className="text-sm leading-6 text-[#c7b8c3]">
              No weekly reviews yet. Generate the current week when you are ready for an honest look back.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function WeeklyReviewCard({ review }: { review: WeeklyReview }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/15">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-parchment-200">
            {review.week_start_date} to {review.week_end_date}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#fff8e7]">Weekly score</h3>
        </div>
        <div className="w-fit rounded-lg border border-parchment-200/30 bg-parchment-100 px-4 py-3 text-center text-plum-950">
          <p className="text-3xl font-semibold">{review.weekly_score}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]">score</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReviewMetric label="Total" value={review.total_tasks} />
        <ReviewMetric label="Completed" value={review.completed_tasks} />
        <ReviewMetric label="Missed" value={review.missed_tasks} />
        <ReviewMetric label="Completion" value={`${formatPercentage(review.completion_rate)}%`} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <CategoryResult
          category={review.strongest_category?.name ?? "Not enough data"}
          label="Strongest category"
        />
        <CategoryResult
          category={review.weakest_category?.name ?? "Not enough data"}
          label="Weakest category"
        />
      </div>

      <div className="mt-5 rounded-md border border-[#f3dca0]/30 bg-[#fff4cf] p-4 text-plum-950">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b4a5e]">
          Week in plain words
        </p>
        <p className="mt-2 text-sm leading-6 text-[#4f3446]">{review.summary}</p>
      </div>
    </article>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-plum-950/50 p-4">
      <p className="text-sm text-[#c7b8c3]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#fff8e7]">{value}</p>
    </div>
  );
}

function CategoryResult({ label, category }: { label: string; category: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-plum-950/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a996a3]">
        {label}
      </p>
      <p className="mt-2 font-semibold text-parchment-100">{category}</p>
    </div>
  );
}

function ReviewListLoading() {
  return (
    <div className="space-y-3">
      {[0, 1].map((item) => (
        <div
          className="h-44 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]"
          key={item}
        />
      ))}
    </div>
  );
}

function formatPercentage(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
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
