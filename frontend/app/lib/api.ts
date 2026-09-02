/**
 * Client HTTP de l'API Todo.
 *
 * - `NEXT_PUBLIC_API_URL` = URL de l'API vue depuis le NAVIGATEUR.
 * - Toutes les requêtes portent l'en-tête `Authorization: Bearer <token>`
 *   quand un token est enregistré via `setAuthToken()`.
 */

// --- Types ---------------------------------------------------------------

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface Tag {
  id: number;
  name: string;
  color: string; // "#rrggbb"
}

export type Priority = "low" | "medium" | "high" | "urgent";

export const PRIORITY_ORDER: Priority[] = ["low", "medium", "high", "urgent"];

export const PRIORITY_COLOR: Record<Priority, string> = {
  low: "#16a34a",
  medium: "#ca8a04",
  high: "#ea580c",
  urgent: "#dc2626",
};

export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  not_done: boolean;
  priority: Priority;
  created_at: string;
  tags: Tag[];
}

export type TodoStatus = "pending" | "done" | "failed";

export function todoStatus(todo: Todo): TodoStatus {
  if (todo.completed) return "done";
  if (todo.not_done) return "failed";
  return "pending";
}

export const STATUS_ORDER: TodoStatus[] = ["pending", "done", "failed"];

export const STATUS_COLOR: Record<TodoStatus, string> = {
  pending: "#64748b",
  done: "#16a34a",
  failed: "#dc2626",
};

export interface DailyStat {
  date: string;
  pending: number;
  done: number;
  failed: number;
}

export interface TagCount {
  id: number;
  name: string;
  color: string;
  count: number;
}

export interface TodoStatsResponse {
  totals: Record<TodoStatus, number>;
  daily: DailyStat[];
  tags: TagCount[];
}

export interface TodoCreateInput {
  title: string;
  description?: string;
  priority?: Priority;
  tag_ids?: number[];
}

export interface TodoUpdateInput {
  title?: string;
  description?: string;
  completed?: boolean;
  not_done?: boolean;
  priority?: Priority;
  tag_ids?: number[];
}

export interface TagCreateInput {
  name: string;
  color?: string;
}

export type RecurrenceUnit = "hour" | "day" | "week";

export const RECURRENCE_UNITS: RecurrenceUnit[] = ["hour", "day", "week"];

export interface RecurringTask {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  unit: RecurrenceUnit;
  value: number;
  active: boolean;
  created_at: string;
  last_run_at: string | null;
  next_run_at: string;
}

export interface RecurringTaskCreateInput {
  title: string;
  description?: string;
  priority?: Priority;
  unit: RecurrenceUnit;
  value: number;
}

export interface RecurringTaskUpdateInput {
  title?: string;
  description?: string;
  priority?: Priority;
  unit?: RecurrenceUnit;
  value?: number;
  active?: boolean;
}

// --- Cœur HTTP ---------------------------------------------------------

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Enregistre (ou efface) le token porté par toutes les requêtes. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Callback déclenché quand une requête authentifiée reçoit 401. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers,
  });

  // Session expirée / invalide sur une requête authentifiée -> déconnexion.
  if (res.status === 401 && authToken) {
    onUnauthorized?.();
  }

  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* corps non-JSON */
    }
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Endpoints -------------------------------------------------------

export const authApi = {
  register(email: string, password: string, name: string): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  },
  login(email: string, password: string): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  me(): Promise<AuthUser> {
    return request<AuthUser>("/auth/me");
  },
};

export const todoApi = {
  list: () => request<Todo[]>("/todos/"),
  create: (input: TodoCreateInput) =>
    request<Todo>("/todos/", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: TodoUpdateInput) =>
    request<Todo>(`/todos/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  remove: (id: number) =>
    request<void>(`/todos/${id}`, { method: "DELETE" }),
  stats: () => request<TodoStatsResponse>("/todos/stats"),
};

export const tagApi = {
  list: () => request<Tag[]>("/tags/"),
  create: (input: TagCreateInput) =>
    request<Tag>("/tags/", { method: "POST", body: JSON.stringify(input) }),
  remove: (id: number) => request<void>(`/tags/${id}`, { method: "DELETE" }),
};

export const recurringApi = {
  list: () => request<RecurringTask[]>("/recurring-tasks/"),
  create: (input: RecurringTaskCreateInput) =>
    request<RecurringTask>("/recurring-tasks/", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: number, input: RecurringTaskUpdateInput) =>
    request<RecurringTask>(`/recurring-tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  remove: (id: number) =>
    request<void>(`/recurring-tasks/${id}`, { method: "DELETE" }),
};
