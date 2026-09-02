/**
 * Client HTTP minimal pour l'API Todo.
 *
 * `NEXT_PUBLIC_API_URL` est injectée au build/au démarrage et doit pointer
 * vers l'URL de l'API **telle que vue depuis le navigateur** (ex:
 * http://localhost:8000), et non depuis le réseau interne Docker.
 */

export interface Tag {
  id: number;
  name: string;
  color: string; // "#rrggbb"
}

/** Niveau de priorité d'une tâche (concept distinct des tags). */
export type Priority = "low" | "medium" | "high" | "urgent";

export const PRIORITY_ORDER: Priority[] = ["low", "medium", "high", "urgent"];

/** Couleur par niveau (échelle vert -> rouge). Libellés via i18n `priority.<n>`. */
export const PRIORITY_COLOR: Record<Priority, string> = {
  low: "#16a34a", // green-600
  medium: "#ca8a04", // yellow-600
  high: "#ea580c", // orange-600
  urgent: "#dc2626", // red-600
};

export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  /** Marquée explicitement comme non réalisée (exclusif avec `completed`). */
  not_done: boolean;
  priority: Priority;
  created_at: string;
  tags: Tag[];
}

/** État dérivé, pratique pour l'affichage. */
export type TodoStatus = "pending" | "done" | "failed";

export function todoStatus(todo: Todo): TodoStatus {
  if (todo.completed) return "done";
  if (todo.not_done) return "failed";
  return "pending";
}

/** Ordre d'affichage canonique des états. */
export const STATUS_ORDER: TodoStatus[] = ["pending", "done", "failed"];

/**
 * Couleur associée à chaque état (source unique : badges + graphes).
 * Les libellés sont traduits via `useI18n()` -> clé `status.<état>`.
 */
export const STATUS_COLOR: Record<TodoStatus, string> = {
  pending: "#64748b", // slate-500
  done: "#16a34a", // green-600
  failed: "#dc2626", // red-600
};

/** Une entrée par jour renvoyée par GET /todos/stats. */
export interface DailyStat {
  date: string; // "YYYY-MM-DD"
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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

/** Vérifie le statut HTTP et parse le corps JSON (ou rien pour un 204). */
async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* corps non-JSON : on garde statusText */
    }
    throw new Error(`Erreur API ${res.status} : ${detail}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

const jsonHeaders = { "Content-Type": "application/json" };

export const todoApi = {
  list(): Promise<Todo[]> {
    return fetch(`${API_URL}/todos/`, { cache: "no-store" }).then((r) =>
      parse<Todo[]>(r),
    );
  },

  create(input: TodoCreateInput): Promise<Todo> {
    return fetch(`${API_URL}/todos/`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    }).then((r) => parse<Todo>(r));
  },

  update(id: number, input: TodoUpdateInput): Promise<Todo> {
    return fetch(`${API_URL}/todos/${id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    }).then((r) => parse<Todo>(r));
  },

  remove(id: number): Promise<void> {
    return fetch(`${API_URL}/todos/${id}`, { method: "DELETE" }).then((r) =>
      parse<void>(r),
    );
  },

  stats(): Promise<TodoStatsResponse> {
    return fetch(`${API_URL}/todos/stats`, { cache: "no-store" }).then((r) =>
      parse<TodoStatsResponse>(r),
    );
  },
};

export const tagApi = {
  list(): Promise<Tag[]> {
    return fetch(`${API_URL}/tags/`, { cache: "no-store" }).then((r) =>
      parse<Tag[]>(r),
    );
  },

  create(input: TagCreateInput): Promise<Tag> {
    return fetch(`${API_URL}/tags/`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    }).then((r) => parse<Tag>(r));
  },

  remove(id: number): Promise<void> {
    return fetch(`${API_URL}/tags/${id}`, { method: "DELETE" }).then((r) =>
      parse<void>(r),
    );
  },
};

export const recurringApi = {
  list(): Promise<RecurringTask[]> {
    return fetch(`${API_URL}/recurring-tasks/`, { cache: "no-store" }).then((r) =>
      parse<RecurringTask[]>(r),
    );
  },

  create(input: RecurringTaskCreateInput): Promise<RecurringTask> {
    return fetch(`${API_URL}/recurring-tasks/`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    }).then((r) => parse<RecurringTask>(r));
  },

  update(id: number, input: RecurringTaskUpdateInput): Promise<RecurringTask> {
    return fetch(`${API_URL}/recurring-tasks/${id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    }).then((r) => parse<RecurringTask>(r));
  },

  remove(id: number): Promise<void> {
    return fetch(`${API_URL}/recurring-tasks/${id}`, { method: "DELETE" }).then(
      (r) => parse<void>(r),
    );
  },
};
