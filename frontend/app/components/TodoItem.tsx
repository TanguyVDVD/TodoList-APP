"use client";

import { useState } from "react";
import { todoStatus, type Todo, type TodoUpdateInput } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface TodoItemProps {
  todo: Todo;
  onUpdate: (todo: Todo, patch: TodoUpdateInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

/** Icône coche (✓). */
function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Icône croix (✗). */
function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5.5 5.5l9 9M14.5 5.5l-9 9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const BADGE_CLASS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-500",
  done: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

/**
 * Ligne d'une tâche.
 *
 * Deux cases mutuellement exclusives :
 *  - "Terminée"      -> coche verte
 *  - "Non réalisée"  -> croix rouge
 * Re-cliquer sur une case active la retire (retour à l'état "En cours").
 */
export default function TodoItem({ todo, onUpdate, onDelete }: TodoItemProps) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const status = todoStatus(todo); // "pending" | "done" | "failed"

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t("item.action_failed"));
    } finally {
      setBusy(false);
    }
  }

  // Bascule "terminée" et annule "non réalisée".
  const toggleDone = () =>
    run(() => onUpdate(todo, { completed: !todo.completed, not_done: false }));

  // Bascule "non réalisée" et annule "terminée".
  const toggleNotDone = () =>
    run(() => onUpdate(todo, { not_done: !todo.not_done, completed: false }));

  const createdAt = new Date(todo.created_at).toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });

  const titleClassName =
    status === "done"
      ? "text-slate-400 line-through"
      : status === "failed"
        ? "text-red-400 line-through"
        : "text-slate-900";

  return (
    <li
      className={`flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition ${
        busy ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {/* --- Les deux cases --- */}
      <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
        {/* Case 1 : terminée -> coche verte */}
        <button
          type="button"
          role="checkbox"
          aria-checked={todo.completed}
          aria-label={t("item.mark_done")}
          title={t("status.done")}
          disabled={busy}
          onClick={toggleDone}
          className={`flex h-6 w-6 items-center justify-center rounded-md border transition ${
            todo.completed
              ? "border-green-600 bg-green-50 text-green-600"
              : "border-slate-300 bg-white text-transparent hover:border-green-500 hover:text-green-300"
          }`}
        >
          <CheckIcon />
        </button>

        {/* Case 2 : non réalisée -> croix rouge */}
        <button
          type="button"
          role="checkbox"
          aria-checked={todo.not_done}
          aria-label={t("item.mark_not_done")}
          title={t("status.failed")}
          disabled={busy}
          onClick={toggleNotDone}
          className={`flex h-6 w-6 items-center justify-center rounded-md border transition ${
            todo.not_done
              ? "border-red-600 bg-red-50 text-red-600"
              : "border-slate-300 bg-white text-transparent hover:border-red-500 hover:text-red-300"
          }`}
        >
          <CrossIcon />
        </button>
      </div>

      {/* --- Contenu --- */}
      <div className="min-w-0 flex-1">
        <p className={`break-words text-sm font-medium ${titleClassName}`}>
          {todo.title}
        </p>
        {todo.description && (
          <p
            className={`mt-0.5 break-words text-sm ${
              status === "pending"
                ? "text-slate-500"
                : "text-slate-300 line-through"
            }`}
          >
            {todo.description}
          </p>
        )}
        <p className="mt-1 flex items-center gap-2 text-xs">
          <span
            className={`inline-block rounded px-1.5 py-0.5 font-medium ${BADGE_CLASS[status]}`}
          >
            {t(`status.${status}`)}
          </span>
          <span className="text-slate-400">
            {t("item.created_on", { date: createdAt })}
          </span>
        </p>
      </div>

      {/* --- Suppression --- */}
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => onDelete(todo.id))}
        className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        aria-label={t("item.delete")}
      >
        {t("item.delete")}
      </button>
    </li>
  );
}
