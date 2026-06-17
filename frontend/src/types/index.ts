export type ApiId = number;

export type ISODate = string;
export type ISODateTime = string;
export type ISOTime = string;

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  detail?: string;
  [key: string]: unknown;
}

export interface User {
  id: ApiId;
  email: string;
  name: string;
  created_at: ISODateTime;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface Category {
  id: ApiId;
  name: string;
  color: string;
  icon: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CategorySummary {
  id: ApiId;
  name: string;
  color: string;
}

export type TaskPriority = "low" | "normal" | "high" | "critical";
export type RepeatType = "none" | "daily" | "weekdays" | "weekly" | "custom";
export type DailyTaskStatus =
  | "pending"
  | "completed"
  | "missed"
  | "skipped"
  | "rescheduled";

export interface Task {
  id: ApiId;
  title: string;
  description: string;
  category: CategorySummary | null;
  priority: TaskPriority;
  estimated_duration_minutes: number;
  due_date: ISODate | null;
  repeat_type: RepeatType;
  repeat_days: number[] | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface DailyTaskSummary {
  id: ApiId;
  title: string;
  category: CategorySummary | null;
  priority: TaskPriority;
  estimated_duration_minutes: number;
}

export interface DailyTask {
  id: ApiId;
  task: DailyTaskSummary;
  scheduled_start_time: ISOTime | null;
  scheduled_end_time: ISOTime | null;
  status: DailyTaskStatus;
  completed_at: ISODateTime | null;
  missed_reason: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface DailyPlan {
  id: ApiId;
  date: ISODate;
  discipline_score: number;
  notes: string;
  daily_tasks: DailyTask[];
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Streak {
  id: ApiId;
  category: CategorySummary;
  current_streak: number;
  longest_streak: number;
  last_completed_date: ISODate | null;
}

export interface DisciplineScore {
  date: ISODate;
  discipline_score: number;
}

export interface RecommendationTask {
  id: ApiId;
  title: string;
  category: CategorySummary | null;
  priority: TaskPriority;
  estimated_duration_minutes: number;
  due_date: ISODate | null;
}

export interface RecommendationDailyTask {
  id: ApiId;
  task: RecommendationTask;
  scheduled_start_time: ISOTime | null;
  scheduled_end_time: ISOTime | null;
  status: DailyTaskStatus;
  created_at: ISODateTime;
}

export interface Recommendation {
  recommended_task: RecommendationDailyTask | null;
  reason: string;
  message: string;
  current_time: ISOTime;
  date: ISODate;
}

export interface WeeklyReview {
  id: ApiId;
  week_start_date: ISODate;
  week_end_date: ISODate;
  total_tasks: number;
  completed_tasks: number;
  missed_tasks: number;
  skipped_tasks: number;
  completion_rate: number;
  strongest_category: CategorySummary | null;
  weakest_category: CategorySummary | null;
  weekly_score: number;
  summary: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
