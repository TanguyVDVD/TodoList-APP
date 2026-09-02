"use client";

import { useCallback, useEffect, useState } from "react";
import {
  STATUS_COLOR,
  STATUS_ORDER,
  todoApi,
  todoStatus,
  type Todo,
  type TodoStatus,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import KanbanCard from "../components/KanbanCard";

/** Patch envoyé à l'API pour placer une tâche dans un état donné. */
const STATUS_PATCH: Record<
  TodoStatus,
  { completed: boolean; not_done: boolean }
> = {
  pending: { completed: false, not_done: false },
  done: { completed: true, not_done: false },
  failed: { not_done: true, completed: false },
};

export default function KanbanPage() {
  const { t } = useI18n();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TodoStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setTodos(await todoApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("home.error_load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function moveTo(todoId: number, status: TodoStatus) {
    const todo = todos.find((x) => x.id === todoId);
    if (!todo || todoStatus(todo) === status) return;

    const patch = STATUS_PATCH[status];
    // Mise à jour optimiste.
    setTodos((prev) =>
      prev.map((x) => (x.id === todoId ? { ...x, ...patch } : x)),
    );
    try {
      const updated = await todoApi.update(todoId, patch);
      setTodos((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("item.action_failed"));
      void refresh(); // resynchronise en cas d'échec
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("kanban.title")}</h1>
        <p className="text-sm text-slate-500">{t("kanban.subtitle")}</p>
      </header>

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
        <div className="grid gap-4 md:grid-cols-3">
          {STATUS_ORDER.map((status) => {
            const items = todos.filter((x) => todoStatus(x) === status);
            const isTarget = dragOverCol === status;
            return (
              <section
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverCol !== status) setDragOverCol(status);
                }}
                onDragLeave={(e) => {
                  // Ignore les passages sur les enfants de la colonne.
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverCol((s) => (s === status ? null : s));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const id = Number(e.dataTransfer.getData("text/plain"));
                  if (id) void moveTo(id, status);
                }}
                className={`flex min-h-[8rem] flex-col gap-2 rounded-xl border-2 p-3 transition ${
                  isTarget
                    ? "border-slate-400 bg-slate-50"
                    : "border-transparent bg-slate-200/50"
                }`}
              >
                <div className="flex items-center justify-between px-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[status] }}
                    />
                    {t(`status.${status}`)}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                    {items.length}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                    {t("kanban.empty_column")}
                  </p>
                ) : (
                  items.map((todo) => (
                    <KanbanCard
                      key={todo.id}
                      todo={todo}
                      dragging={draggingId === todo.id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", String(todo.id));
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingId(todo.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverCol(null);
                      }}
                    />
                  ))
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
