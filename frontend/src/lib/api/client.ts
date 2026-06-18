import type {
  AddDailyTaskPayload,
  AuthTokens,
  Category,
  CreateTaskPayload,
  DailyPlan,
  DailyTask,
  DisciplineScore,
  LoginPayload,
  MissDailyTaskPayload,
  PaginatedResponse,
  Recommendation,
  RegisterPayload,
  RescheduleDailyTaskPayload,
  RescheduledDailyTask,
  Streak,
  Task,
  User,
  WeeklyReview,
} from "@/types";
import {
  clearTokens,
  getRefreshToken,
  saveAccessToken,
} from "@/lib/auth/tokens";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  accessToken?: string;
  body?: unknown;
  headers?: HeadersInit;
}

let refreshRequest: Promise<string | null> | null = null;

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
  allowTokenRefresh = true,
) {
  const { accessToken, body, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...requestOptions,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await readJson(response);

  if (!response.ok) {
    if (response.status === 401 && accessToken && allowTokenRefresh) {
      const refreshedAccessToken = await getRefreshedAccessToken();
      if (refreshedAccessToken) {
        return apiRequest<T>(
          path,
          { ...options, accessToken: refreshedAccessToken },
          false,
        );
      }
    }
    throw new ApiError(getErrorMessage(data, response.status), response.status, data);
  }

  return data as T;
}

async function getRefreshedAccessToken() {
  if (!refreshRequest) {
    refreshRequest = refreshStoredAccessToken().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

async function refreshStoredAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  try {
    const response = await fetch(buildApiUrl("/auth/token/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    const data = await readJson(response);

    if (!response.ok || !hasAccessToken(data)) {
      clearTokens();
      return null;
    }

    saveAccessToken(data.access);
    return data.access;
  } catch {
    return null;
  }
}

function hasAccessToken(data: unknown): data is { access: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "access" in data &&
    typeof data.access === "string"
  );
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, status: number) {
  if (typeof data === "object" && data !== null) {
    const body = data as {
      error?: { message?: string };
      detail?: string;
    };

    if (body.error?.message) {
      return body.error.message;
    }
    if (body.detail) {
      return body.detail;
    }

    for (const [field, messages] of Object.entries(body)) {
      if (Array.isArray(messages) && typeof messages[0] === "string") {
        const label = field.split("_").join(" ");
        return `${label}: ${messages[0]}`;
      }
    }
  }

  return `API request failed with status ${status}.`;
}

export function register(payload: RegisterPayload) {
  return apiRequest<User>("/auth/register/", {
    method: "POST",
    body: payload,
  });
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthTokens>("/auth/login/", {
    method: "POST",
    body: payload,
  });
}

export function getCurrentUser(accessToken: string) {
  return apiRequest<User>("/auth/me/", { accessToken });
}

export function listCategories(accessToken: string) {
  return apiRequest<PaginatedResponse<Category>>("/categories/", { accessToken });
}

export function listTasks(accessToken: string) {
  return apiRequest<PaginatedResponse<Task>>("/tasks/", { accessToken });
}

export function createTask(accessToken: string, payload: CreateTaskPayload) {
  return apiRequest<Task>("/tasks/", {
    accessToken,
    method: "POST",
    body: payload,
  });
}

export function getTodaysDailyPlan(accessToken: string) {
  return apiRequest<DailyPlan>("/daily-plans/today/", { accessToken });
}

export function addTaskToDailyPlan(
  accessToken: string,
  date: string,
  payload: AddDailyTaskPayload,
) {
  return apiRequest<DailyTask>(`/daily-plans/${date}/tasks/`, {
    accessToken,
    method: "POST",
    body: payload,
  });
}

export function completeDailyTask(accessToken: string, dailyTaskId: number) {
  return apiRequest<DailyTask>(`/daily-plans/tasks/${dailyTaskId}/complete/`, {
    accessToken,
    method: "PATCH",
  });
}

export function missDailyTask(
  accessToken: string,
  dailyTaskId: number,
  payload: MissDailyTaskPayload = {},
) {
  return apiRequest<DailyTask>(`/daily-plans/tasks/${dailyTaskId}/miss/`, {
    accessToken,
    method: "PATCH",
    body: payload,
  });
}

export function skipDailyTask(accessToken: string, dailyTaskId: number) {
  return apiRequest<DailyTask>(`/daily-plans/tasks/${dailyTaskId}/skip/`, {
    accessToken,
    method: "PATCH",
  });
}

export function rescheduleDailyTask(
  accessToken: string,
  dailyTaskId: number,
  payload: RescheduleDailyTaskPayload,
) {
  return apiRequest<DailyTask | RescheduledDailyTask>(
    `/daily-plans/tasks/${dailyTaskId}/reschedule/`,
    {
      accessToken,
      method: "PATCH",
      body: payload,
    },
  );
}

export function getNextRecommendation(accessToken: string) {
  return apiRequest<Recommendation>("/recommendations/next/", { accessToken });
}

export function getStreaks(accessToken: string) {
  return apiRequest<Streak[]>("/streaks/", { accessToken });
}

export function getTodaysDisciplineScore(accessToken: string) {
  return apiRequest<DisciplineScore>("/discipline-score/today/", { accessToken });
}

export function listWeeklyReviews(accessToken: string) {
  return apiRequest<PaginatedResponse<WeeklyReview>>("/weekly-reviews/", {
    accessToken,
  });
}

export function generateWeeklyReview(accessToken: string) {
  return apiRequest<WeeklyReview>("/weekly-reviews/generate/", {
    accessToken,
    method: "POST",
  });
}

export function generateWeeklyReviewForWeek(
  accessToken: string,
  weekStartDate: string,
) {
  return apiRequest<WeeklyReview>(`/weekly-reviews/generate/${weekStartDate}/`, {
    accessToken,
    method: "POST",
  });
}
