"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { todoApi, type Todo } from "./lib/api";
import TodoForm from "./components/TodoForm";
import TodoList from "./components/TodoList";

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Chargement initial ---------------------------------------------------
  const refresh = useCallback(async () => {
    try {
      setError(null);
      setTodos(await todoApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // --- Actions (mise à jour optimiste de l'état local) ---------------------
  async function handleCreate(title: string, description: string) {
    const created = await todoApi.create({ title, description });
    setTodos((prev) => [created, ...prev]);
  }

  async function handleToggle(todo: Todo) {
    const updated = await todoApi.update(todo.id, { completed: !todo.completed });
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDelete(id: number) {
    await todoApi.remove(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  const { remaining, done } = useMemo(
    () => ({
      remaining: todos.filter((t) => !t.completed).length,
      done: todos.filter((t) => t.completed).length,
    }),
    [todos],
  );

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Ma Todo List</h1>
        <p className="text-sm text-slate-500">
          {remaining} en cours · {done} terminée{done > 1 ? "s" : ""}
        </p>
      </header>

      <TodoForm onCreate={handleCreate} />

      {loading && (
        <p className="text-center text-sm text-slate-400">Chargement…</p>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md px-2 py-1 font-medium underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && (
        <TodoList
          todos={todos}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
