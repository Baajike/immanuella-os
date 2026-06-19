"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppNavigation } from "@/components/app-navigation";
import { ProtectedRoute } from "@/components/protected-route";
import {
  ApiError,
  addTaskToDailyPlan,
  createTask,
  deleteTask,
  getTodaysDailyPlan,
  listCategories,
  listTasks,
  updateTask,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type {
  Category,
  CreateTaskPayload,
  DailyPlan,
  RepeatType,
  Task,
  TaskPriority,
  UpdateTaskPayload,
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

const initialScheduleFormState = {
  task_id: "",
  scheduled_start_time: "",
  scheduled_end_time: "",
};

type EditTaskFormState = typeof initialFormState & { is_active: boolean };

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
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [form, setForm] = useState(initialFormState);
  const [scheduleForm, setScheduleForm] = useState(initialScheduleFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditTaskFormState | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<number | null>(null);
  const [taskActionError, setTaskActionError] = useState<string | null>(null);
  const [taskActionSuccess, setTaskActionSuccess] = useState<string | null>(null);

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
      const [taskPage, categoryPage, todayPlan] = await Promise.all([
        listTasks(token),
        listCategories(token),
        getTodaysDailyPlan(token),
      ]);
      setTasks(taskPage.results);
      setCategories(categoryPage.results);
      setDailyPlan(todayPlan);
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

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setScheduleError("Your session is missing. Log in again to schedule tasks.");
      return;
    }

    const planDate = dailyPlan?.date ?? getTodayDate();

    try {
      setIsScheduling(true);
      setScheduleError(null);
      setScheduleSuccess(null);
      await addTaskToDailyPlan(token, planDate, {
        task_id: Number(scheduleForm.task_id),
        scheduled_start_time: normalizeTimeInput(scheduleForm.scheduled_start_time),
        scheduled_end_time: normalizeTimeInput(scheduleForm.scheduled_end_time),
      });
      setScheduleForm(initialScheduleFormState);
      setScheduleSuccess("Added to today's plan.");
      await loadPageData();
    } catch (caught) {
      setScheduleError(getErrorMessage(caught));
    } finally {
      setIsScheduling(false);
    }
  }

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditForm(buildEditForm(task));
    setDeleteConfirmationId(null);
    setTaskActionError(null);
    setTaskActionSuccess(null);
  }

  function cancelEditing() {
    setEditingTaskId(null);
    setEditForm(null);
    setTaskActionError(null);
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token || editingTaskId === null || !editForm) {
      setTaskActionError("Your session is missing. Log in again to update tasks.");
      return;
    }

    try {
      setIsUpdating(true);
      setTaskActionError(null);
      setTaskActionSuccess(null);
      await updateTask(token, editingTaskId, buildUpdatePayload(editForm));
      setEditingTaskId(null);
      setEditForm(null);
      setTaskActionSuccess("Task updated.");
      await loadPageData();
    } catch (caught) {
      setTaskActionError(getErrorMessage(caught));
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete(taskId: number) {
    const token = getAccessToken();
    if (!token) {
      setTaskActionError("Your session is missing. Log in again to delete tasks.");
      return;
    }

    try {
      setDeletingTaskId(taskId);
      setTaskActionError(null);
      setTaskActionSuccess(null);
      await deleteTask(token, taskId);
      setDeleteConfirmationId(null);
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
        setEditForm(null);
      }
      setTaskActionSuccess("Task deleted.");
      await loadPageData();
    } catch (caught) {
      setTaskActionError(getErrorMessage(caught));
    } finally {
      setDeletingTaskId(null);
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
          <AppNavigation current="tasks" />
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
          <div className="grid gap-5">
            <TaskForm
              categories={categories}
              form={form}
              formError={formError}
              isSubmitting={isSubmitting}
              onChange={setForm}
              onSubmit={handleSubmit}
            />

            <ScheduleTaskForm
              dailyPlan={dailyPlan}
              form={scheduleForm}
              isScheduling={isScheduling}
              onChange={setScheduleForm}
              onSubmit={handleScheduleSubmit}
              scheduleError={scheduleError}
              scheduleSuccess={scheduleSuccess}
              tasks={tasks}
            />
          </div>

          <TaskList
            activeTaskCount={activeTaskCount}
            categories={categories}
            deleteConfirmationId={deleteConfirmationId}
            deletingTaskId={deletingTaskId}
            editForm={editForm}
            editingTaskId={editingTaskId}
            error={loadError}
            isLoading={isLoading}
            isUpdating={isUpdating}
            onCancelEdit={cancelEditing}
            onChangeEditForm={setEditForm}
            onConfirmDelete={(taskId) => {
              setDeleteConfirmationId(taskId);
              setEditingTaskId(null);
              setEditForm(null);
              setTaskActionError(null);
              setTaskActionSuccess(null);
            }}
            onDelete={handleDelete}
            onDismissDelete={() => setDeleteConfirmationId(null)}
            onEdit={startEditing}
            onEditSubmit={handleEditSubmit}
            taskActionError={taskActionError}
            taskActionSuccess={taskActionSuccess}
            tasks={tasks}
          />
        </section>
      </div>
    </main>
  );
}

function ScheduleTaskForm({
  dailyPlan,
  form,
  isScheduling,
  onChange,
  onSubmit,
  scheduleError,
  scheduleSuccess,
  tasks,
}: {
  dailyPlan: DailyPlan | null;
  form: typeof initialScheduleFormState;
  isScheduling: boolean;
  onChange: (value: typeof initialScheduleFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  scheduleError: string | null;
  scheduleSuccess: string | null;
  tasks: Task[];
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/15">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-parchment-200">
        Today
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[#fff8e7]">Schedule into today</h2>
      <p className="mt-2 text-sm leading-6 text-[#c7b8c3]">
        Pick an existing task and give it a start and end time for today.
      </p>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-[#fff8e7]">
          Task
          <select
            className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
            onChange={(event) => onChange({ ...form, task_id: event.target.value })}
            required
            value={form.task_id}
          >
            <option value="">Choose a task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Start time"
            onChange={(scheduled_start_time) => onChange({ ...form, scheduled_start_time })}
            required
            type="time"
            value={form.scheduled_start_time}
          />
          <TextInput
            label="End time"
            onChange={(scheduled_end_time) => onChange({ ...form, scheduled_end_time })}
            required
            type="time"
            value={form.scheduled_end_time}
          />
        </div>

        {scheduleError ? (
          <p className="rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {scheduleError}
          </p>
        ) : null}
        {scheduleSuccess ? (
          <p className="rounded-md border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {scheduleSuccess}
          </p>
        ) : null}

        <button
          className="w-full rounded-md bg-[#f0c36a] px-4 py-3 text-sm font-semibold text-plum-950 transition hover:bg-[#f4d58a] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isScheduling || !tasks.length}
          type="submit"
        >
          {isScheduling ? "Scheduling..." : "Add to today's plan"}
        </button>
      </form>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-sm font-medium text-[#fff8e7]">
          Today{dailyPlan?.date ? `, ${dailyPlan.date}` : ""}
        </p>
        {dailyPlan?.daily_tasks.length ? (
          <div className="mt-3 space-y-2">
            {dailyPlan.daily_tasks.slice(0, 4).map((dailyTask) => (
              <div
                className="rounded-md border border-white/10 bg-plum-950/50 px-3 py-2 text-sm text-[#d8cbd4]"
                key={dailyTask.id}
              >
                <span className="font-medium text-[#fff8e7]">{dailyTask.task.title}</span>
                <span className="ml-2 text-xs text-[#c7b8c3]">
                  {formatTimeRange(
                    dailyTask.scheduled_start_time,
                    dailyTask.scheduled_end_time,
                  )}{" "}
                  - {dailyTask.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[#c7b8c3]">
            Nothing scheduled yet. Choose a task above and give it a time block.
          </p>
        )}
      </div>
    </section>
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
  categories,
  isLoading,
  error,
  activeTaskCount,
  editingTaskId,
  editForm,
  isUpdating,
  deletingTaskId,
  deleteConfirmationId,
  taskActionError,
  taskActionSuccess,
  onEdit,
  onCancelEdit,
  onChangeEditForm,
  onEditSubmit,
  onConfirmDelete,
  onDismissDelete,
  onDelete,
}: {
  tasks: Task[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  activeTaskCount: number;
  editingTaskId: number | null;
  editForm: EditTaskFormState | null;
  isUpdating: boolean;
  deletingTaskId: number | null;
  deleteConfirmationId: number | null;
  taskActionError: string | null;
  taskActionSuccess: string | null;
  onEdit: (task: Task) => void;
  onCancelEdit: () => void;
  onChangeEditForm: (value: EditTaskFormState) => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onConfirmDelete: (taskId: number) => void;
  onDismissDelete: () => void;
  onDelete: (taskId: number) => void;
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
        {taskActionError ? (
          <p className="mb-3 rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {taskActionError}
          </p>
        ) : null}
        {taskActionSuccess ? (
          <p className="mb-3 rounded-md border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {taskActionSuccess}
          </p>
        ) : null}
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
                {editingTaskId === task.id && editForm ? (
                  <EditTaskForm
                    categories={categories}
                    form={editForm}
                    isUpdating={isUpdating}
                    onCancel={onCancelEdit}
                    onChange={onChangeEditForm}
                    onSubmit={onEditSubmit}
                  />
                ) : (
                  <>
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
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        {task.is_active ? "active" : "inactive"}
                      </span>
                      {task.due_date ? (
                        <span className="rounded-full border border-white/10 px-3 py-1">
                          due {task.due_date}
                        </span>
                      ) : null}
                    </div>

                    {deleteConfirmationId === task.id ? (
                      <div className="mt-4 rounded-md border border-red-300/20 bg-red-500/10 p-3">
                        <p className="text-sm text-red-100">Delete this task permanently?</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="rounded-md bg-red-200 px-3 py-2 text-sm font-semibold text-red-950 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={deletingTaskId === task.id}
                            onClick={() => onDelete(task.id)}
                            type="button"
                          >
                            {deletingTaskId === task.id ? "Deleting..." : "Yes, delete"}
                          </button>
                          <button
                            className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-[#fff8e7] transition hover:bg-white/10 disabled:opacity-70"
                            disabled={deletingTaskId === task.id}
                            onClick={onDismissDelete}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                        <button
                          className="rounded-md bg-parchment-100 px-3 py-2 text-sm font-semibold text-plum-950 transition hover:bg-parchment-200"
                          onClick={() => onEdit(task)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md border border-red-300/30 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"
                          onClick={() => onConfirmDelete(task.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
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

function EditTaskForm({
  categories,
  form,
  isUpdating,
  onCancel,
  onChange,
  onSubmit,
}: {
  categories: Category[];
  form: EditTaskFormState;
  isUpdating: boolean;
  onCancel: () => void;
  onChange: (value: EditTaskFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[#fff8e7]">Edit task</h3>
        <label className="flex items-center gap-2 text-sm text-[#d8cbd4]">
          <input
            checked={form.is_active}
            className="h-4 w-4 accent-[#f0c36a]"
            onChange={(event) => onChange({ ...form, is_active: event.target.checked })}
            type="checkbox"
          />
          Active
        </label>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
        <TextInput
          label="Due date"
          onChange={(due_date) => onChange({ ...form, due_date })}
          type="date"
          value={form.due_date}
        />
      </div>

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

      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <button
          className="rounded-md bg-parchment-100 px-4 py-2 text-sm font-semibold text-plum-950 transition hover:bg-parchment-200 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isUpdating}
          type="submit"
        >
          {isUpdating ? "Saving..." : "Save changes"}
        </button>
        <button
          className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-[#fff8e7] transition hover:bg-white/10 disabled:opacity-70"
          disabled={isUpdating}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
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

function buildEditForm(task: Task): EditTaskFormState {
  return {
    title: task.title,
    description: task.description,
    category: task.category ? String(task.category.id) : "",
    priority: task.priority,
    estimated_duration_minutes: String(task.estimated_duration_minutes),
    due_date: task.due_date ?? "",
    repeat_type: task.repeat_type,
    is_active: task.is_active,
  };
}

function buildUpdatePayload(form: EditTaskFormState): UpdateTaskPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category ? Number(form.category) : null,
    priority: form.priority,
    estimated_duration_minutes: Number(form.estimated_duration_minutes),
    due_date: form.due_date || null,
    repeat_type: form.repeat_type,
    is_active: form.is_active,
  };
}

function normalizeTimeInput(value: string) {
  if (!value) {
    return null;
  }
  return value.length === 5 ? `${value}:00` : value;
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

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
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
