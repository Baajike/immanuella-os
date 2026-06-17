import type {
  AuthTokens,
  Category,
  CreateTaskPayload,
  DailyPlan,
  DisciplineScore,
  LoginPayload,
  PaginatedResponse,
  Recommendation,
  RegisterPayload,
  Streak,
  Task,
  User,
  WeeklyReview,
} from "@/types";

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

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
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
    throw new ApiError(getErrorMessage(data, response.status), response.status, data);
  }

  return data as T;
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
