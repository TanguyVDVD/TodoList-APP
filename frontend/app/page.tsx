"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  tagApi,
  todoApi,
  todoStatus,
  type Tag,
  type Todo,
  type TodoCreateInput,
  type TodoUpdateInput,
} from "./lib/api";
import { useI18n } from "./lib/i18n";
import TodoForm from "./components/TodoForm";
import TodoList from "./components/TodoList";

export default function HomePage() {
  const { t } = useI18n();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [todoList, tagList] = await Promise.all([
        todoApi.list(),
        tagApi.list(),
      ]);
      setTodos(todoList);
      setTags(tagList);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("home.error_load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(input: TodoCreateInput) {
    const created = await todoApi.create(input);
    setTodos((prev) => [created, ...prev]);
  }

  async function handleUpdate(todo: Todo, patch: TodoUpdateInput) {
    const updated = await todoApi.update(todo.id, patch);
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDelete(id: number) {
    await todoApi.remove(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  const counts = useMemo(() => {
    const c = { pending: 0, done: 0, failed: 0 };
    for (const todo of todos) c[todoStatus(todo)] += 1;
    return c;
  }, [todos]);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("home.title")}</h1>
        <p className="text-sm text-slate-500">{t("home.counts", counts)}</p>
      </header>

      <TodoForm tags={tags} onCreate={handleCreate} />

      {loading && (
        <p className="text-center text-sm text-slate-400">{t("home.loading")}</p>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md px-2 py-1 font-medium underline"
          >
            {t("home.retry")}
          </button>
        </div>
      )}

      {!loading && !error && (
        <TodoList
          todos={todos}
          allTags={tags}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
