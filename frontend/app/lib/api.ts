/**
 * Client HTTP minimal pour l'API Todo.
 *
 * `NEXT_PUBLIC_API_URL` est injectée au build/au démarrage et doit pointer
 * vers l'URL de l'API **telle que vue depuis le navigateur** (ex:
 * http://localhost:8000), et non depuis le réseau interne Docker.
 */

export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  created_at: string;
}

export interface TodoCreateInput {
  title: string;
  description?: string;
}

export interface TodoUpdateInput {
  title?: string;
  description?: string;
  completed?: boolean;
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
};
