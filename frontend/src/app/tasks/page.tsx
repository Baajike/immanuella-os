"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { ProtectedRoute } from "@/components/protected-route";
import { ApiError, createTask, listCategories, listTasks } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type {
  Category,
  CreateTaskPayload,
  RepeatType,
  Task,
  TaskPriority,
} from "@/types";

const priorityOptions: TaskPriority[] = ["low", "normal", "high", "critical"];
const repeatTypeOptions: RepeatType[] = ["none", "daily", "weekdays", "weekly", "custom"];

const initialFormState = {
  title: "",
  description: "",
  category: "",
  priority: "normal" as TaskPriority,
  estimated_duration_minutes: "30",
  due_date: "",
  repeat_type: "none" as RepeatType,
};

export default function TasksPage() {
  return (
    <ProtectedRoute>
      {() => <TasksContent />}
    </ProtectedRoute>
  );
}

function TasksContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadPageData() {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      setLoadError("Your session is missing. Log in again to manage tasks.");
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);
      const [taskPage, categoryPage] = await Promise.all([
        listTasks(token),
        listCategories(token),
      ]);
      setTasks(taskPage.results);
      setCategories(categoryPage.results);
    } catch (caught) {
      setLoadError(getErrorMessage(caught));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setFormError("Your session is missing. Log in again to create tasks.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await createTask(token, buildCreatePayload(form));
      setForm(initialFormState);
      await loadPageData();
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeTaskCount = useMemo(
    () => tasks.filter((task) => task.is_active).length,
    [tasks],
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-parchment-200">
              Task management
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#fff8e7] sm:text-5xl">
              Build the work list.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c7b8c3]">
              Create task templates with category, priority, duration, due date, and repeat style.
            </p>
          </div>
          <Link
            className="w-fit rounded-md border border-white/15 px-4 py-3 text-sm font-semibold text-[#fff8e7] transition hover:bg-white/[0.06]"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
          <TaskForm
            categories={categories}
            form={form}
            formError={formError}
            isSubmitting={isSubmitting}
            onChange={setForm}
            onSubmit={handleSubmit}
          />

          <TaskList
            activeTaskCount={activeTaskCount}
            error={loadError}
            isLoading={isLoading}
            tasks={tasks}
          />
        </section>
      </div>
    </main>
  );
}

function TaskForm({
  categories,
  form,
  formError,
  isSubmitting,
  onChange,
  onSubmit,
}: {
  categories: Category[];
  form: typeof initialFormState;
  formError: string | null;
  isSubmitting: boolean;
  onChange: (value: typeof initialFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/15">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-parchment-200">
        New task
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[#fff8e7]">Create a task</h2>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <TextInput
          label="Title"
          onChange={(title) => onChange({ ...form, title })}
          required
          value={form.title}
        />

        <label className="block text-sm font-medium text-[#fff8e7]">
          Description
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
            onChange={(event) => onChange({ ...form, description: event.target.value })}
            value={form.description}
          />
        </label>

        <label className="block text-sm font-medium text-[#fff8e7]">
          Category
          <select
            className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
            onChange={(event) => onChange({ ...form, category: event.target.value })}
            value={form.category}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#fff8e7]">
            Priority
            <select
              className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
              onChange={(event) =>
                onChange({ ...form, priority: event.target.value as TaskPriority })
              }
              value={form.priority}
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <TextInput
            label="Minutes"
            min="1"
            onChange={(estimated_duration_minutes) =>
              onChange({ ...form, estimated_duration_minutes })
            }
            required
            type="number"
            value={form.estimated_duration_minutes}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Due date"
            onChange={(due_date) => onChange({ ...form, due_date })}
            type="date"
            value={form.due_date}
          />

          <label className="block text-sm font-medium text-[#fff8e7]">
            Repeat
            <select
              className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
              onChange={(event) =>
                onChange({ ...form, repeat_type: event.target.value as RepeatType })
              }
              value={form.repeat_type}
            >
              {repeatTypeOptions.map((repeatType) => (
                <option key={repeatType} value={repeatType}>
                  {repeatType}
                </option>
              ))}
            </select>
          </label>
        </div>

        {formError ? (
          <p className="rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {formError}
          </p>
        ) : null}

        <button
          className="w-full rounded-md bg-parchment-100 px-4 py-3 text-sm font-semibold text-plum-950 transition hover:bg-parchment-200 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creating task..." : "Create task"}
        </button>
      </form>
    </section>
  );
}

function TaskList({
  tasks,
  isLoading,
  error,
  activeTaskCount,
}: {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  activeTaskCount: number;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/15">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-parchment-200">
            Your tasks
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#fff8e7]">Task list</h2>
        </div>
        <p className="text-sm text-[#c7b8c3]">{activeTaskCount} active</p>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-[#c7b8c3]">Loading tasks...</p>
        ) : error ? (
          <p className="rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : tasks.length ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <article
                className="rounded-lg border border-white/10 bg-plum-950/50 p-4"
                key={task.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-[#fff8e7]">{task.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#c7b8c3]">
                      {task.description || "No description yet."}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-parchment-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-plum-950">
                    {task.priority}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#d8cbd4]">
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {task.category?.name ?? "No category"}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {task.estimated_duration_minutes} min
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {task.repeat_type}
                  </span>
                  {task.due_date ? (
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      due {task.due_date}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-[#c7b8c3]">
            No tasks yet. Create one to give the dashboard something useful to reason about.
          </p>
        )}
      </div>
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
}) {
  return (
    <label className="block text-sm font-medium text-[#fff8e7]">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
        min={min}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function buildCreatePayload(form: typeof initialFormState): CreateTaskPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category ? Number(form.category) : null,
    priority: form.priority,
    estimated_duration_minutes: Number(form.estimated_duration_minutes),
    due_date: form.due_date || null,
    repeat_type: form.repeat_type,
    repeat_days: null,
  };
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
