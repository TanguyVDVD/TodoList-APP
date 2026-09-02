"use client";

import { useState } from "react";
import type { Todo } from "../lib/api";

interface TodoItemProps {
  todo: Todo;
  onToggle: (todo: Todo) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

/** Ligne d'une tâche : case à cocher, titre/description, bouton suppression. */
export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const [busy, setBusy] = useState(false);

  async function withBusy(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      // Erreur remontée au niveau page ; ici on évite juste un crash silencieux.
      console.error(err);
      alert(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  const createdAt = new Date(todo.created_at).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <li
      className={`flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition ${
        busy ? "opacity-60" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        disabled={busy}
        onChange={() => withBusy(() => onToggle(todo))}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-900"
        aria-label={todo.completed ? "Marquer en cours" : "Marquer terminée"}
      />

      <div className="min-w-0 flex-1">
        <p
          className={`break-words text-sm font-medium ${
            todo.completed ? "text-slate-400 line-through" : "text-slate-900"
          }`}
        >
          {todo.title}
        </p>
        {todo.description && (
          <p
            className={`mt-0.5 break-words text-sm ${
              todo.completed ? "text-slate-300 line-through" : "text-slate-500"
            }`}
          >
            {todo.description}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">Créée le {createdAt}</p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => withBusy(() => onDelete(todo.id))}
        className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        aria-label="Supprimer la tâche"
      >
        Supprimer
      </button>
    </li>
  );
}
