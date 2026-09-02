"use client";

import { useEffect, useState } from "react";
import { tagApi, type Tag } from "../lib/api";
import { useI18n } from "../lib/i18n";

export default function TagsPage() {
  const { t } = useI18n();
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tagApi
      .list()
      .then(setTags)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("home.error_load")),
      )
      .finally(() => setLoading(false));
  }, [t]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError(t("tags.name_required"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await tagApi.create({ name: clean });
      setTags((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.error_unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await tagApi.remove(id);
      setTags((prev) => prev.filter((tag) => tag.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("item.action_failed"));
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("tags.title")}</h1>
        <p className="text-sm text-slate-500">{t("tags.subtitle")}</p>
      </header>

      <form
        onSubmit={handleCreate}
        className="flex gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("tags.name_placeholder")}
          maxLength={50}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? t("tags.adding") : t("tags.add")}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-center text-sm text-slate-400">{t("home.loading")}</p>
      ) : tags.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 ring-1 ring-slate-200">
          {t("tags.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 truncate text-sm font-medium">
                {tag.name}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(tag.id)}
                aria-label={t("tags.delete")}
                className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-600 transition hover:bg-red-50"
              >
                {t("item.delete")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
