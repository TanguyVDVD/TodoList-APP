"use client";

import { useEffect, useRef, useState } from "react";
import { todoStatus, type Tag, type Todo, type TodoUpdateInput } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface TodoItemProps {
  todo: Todo;
  /** Tous les tags existants (pour l'éditeur de tags). */
  allTags: Tag[];
  onUpdate: (todo: Todo, patch: TodoUpdateInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

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

/** Petite puce colorée affichant un tag. */
function TagPill({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${tag.color}1a`,
        color: tag.color,
        borderColor: `${tag.color}80`,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
      {tag.name}
    </span>
  );
}

/**
 * Ligne d'une tâche : 2 cases d'état (terminée / non réalisée), tags, suppression.
 */
export default function TodoItem({
  todo,
  allTags,
  onUpdate,
  onDelete,
}: TodoItemProps) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const status = todoStatus(todo);

  useEffect(() => {
    if (!tagMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setTagMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [tagMenuOpen]);

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

  const toggleDone = () =>
    run(() => onUpdate(todo, { completed: !todo.completed, not_done: false }));

  const toggleNotDone = () =>
    run(() => onUpdate(todo, { not_done: !todo.not_done, completed: false }));

  const toggleTag = (tagId: number) => {
    const current = todo.tags.map((tag) => tag.id);
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    return run(() => onUpdate(todo, { tag_ids: next }));
  };

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
      {/* --- Les deux cases d'état --- */}
      <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
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

        {/* Tags de la tâche + bouton d'édition */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {todo.tags.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}

          <div ref={tagMenuRef} className="relative">
            <button
              type="button"
              disabled={busy}
              onClick={() => setTagMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={tagMenuOpen}
              className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
              {t("item.edit_tags")}
            </button>

            {tagMenuOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {allTags.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-slate-400">
                    {t("tags.none_yet")}
                  </p>
                ) : (
                  allTags.map((tag) => {
                    const on = todo.tags.some((x) => x.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                          on
                            ? "bg-slate-100 font-medium"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 text-left text-slate-700">
                          {tag.name}
                        </span>
                        {on && <span className="text-slate-500">✓</span>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-1.5 flex items-center gap-2 text-xs">
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
