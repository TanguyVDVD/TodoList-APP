"use client";

import { useState } from "react";
import type { Tag, TodoCreateInput } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface TodoFormProps {
  /** Tags disponibles pour l'association. */
  tags: Tag[];
  /** Callback appelé avec le payload validé ; peut lever une erreur. */
  onCreate: (input: TodoCreateInput) => Promise<void>;
}

/** Formulaire d'ajout d'une tâche (titre, description, tags optionnels). */
export default function TodoForm({ tags, onCreate }: TodoFormProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(id: number) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError(t("form.title_required"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        title: cleanTitle,
        description: description.trim(),
        tag_ids: tagIds,
      });
      setTitle("");
      setDescription("");
      setTagIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.error_unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("form.title_placeholder")}
        maxLength={255}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("form.desc_placeholder")}
        rows={2}
        maxLength={2000}
        className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />

      {tags.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            {t("form.tags_label")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const on = tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  aria-pressed={on}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition"
                  style={
                    on
                      ? {
                          backgroundColor: `${tag.color}1a`,
                          color: tag.color,
                          borderColor: `${tag.color}80`,
                        }
                      : { borderColor: "#cbd5e1", color: "#64748b" }
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? t("form.submitting") : t("form.submit")}
      </button>
    </form>
  );
}
