"use client";

import { useEffect, useState } from "react";
import {
  PRIORITY_COLOR,
  PRIORITY_ORDER,
  RECURRENCE_UNITS,
  recurringApi,
  type Priority,
  type RecurrenceUnit,
  type RecurringTask,
} from "../lib/api";
import { useI18n } from "../lib/i18n";

export default function RecurringPage() {
  const { t, locale } = useI18n();

  const [items, setItems] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [unit, setUnit] = useState<RecurrenceUnit>("day");
  const [value, setValue] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    recurringApi
      .list()
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("home.error_load")),
      )
      .finally(() => setLoading(false));
  }, [t]);

  function formatDate(iso: string | null) {
    if (!iso) return t("recurring.never");
    return new Date(iso).toLocaleString(locale, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function summary(item: RecurringTask) {
    return t(`recurring.summary.${item.unit}`, { value: item.value });
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError(t("form.title_required"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await recurringApi.create({
        title: cleanTitle,
        description: description.trim(),
        priority,
        unit,
        value,
      });
      setItems((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setUnit("day");
      setValue(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.error_unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: RecurringTask) {
    try {
      const updated = await recurringApi.update(item.id, {
        active: !item.active,
      });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("item.action_failed"));
    }
  }

  async function handleDelete(id: number) {
    try {
      await recurringApi.remove(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("item.action_failed"));
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("recurring.title")}
        </h1>
        <p className="text-sm text-slate-500">{t("recurring.subtitle")}</p>
      </header>

      {/* --- Formulaire --- */}
      <form
        onSubmit={handleCreate}
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

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            {t("priority.label")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_ORDER.map((level) => {
              const on = priority === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPriority(level)}
                  aria-pressed={on}
                  className="rounded-full border px-2.5 py-0.5 text-xs font-medium transition"
                  style={
                    on
                      ? {
                          backgroundColor: `${PRIORITY_COLOR[level]}1a`,
                          color: PRIORITY_COLOR[level],
                          borderColor: `${PRIORITY_COLOR[level]}80`,
                        }
                      : { borderColor: "#cbd5e1", color: "#64748b" }
                  }
                >
                  {t(`priority.${level}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            {t("recurring.value_label")}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">{t("recurring.every")}</span>
            <input
              type="number"
              min={1}
              max={365}
              value={value}
              onChange={(e) =>
                setValue(Math.max(1, Math.min(365, Number(e.target.value) || 1)))
              }
              className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as RecurrenceUnit)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            >
              {RECURRENCE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`recurring.opt.${u}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? t("recurring.adding") : t("recurring.add")}
        </button>
      </form>

      {/* --- Liste --- */}
      {loading ? (
        <p className="text-center text-sm text-slate-400">{t("home.loading")}</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 ring-1 ring-slate-200">
          {t("recurring.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${
                item.active ? "" : "opacity-60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-slate-900">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-0.5 break-words text-sm text-slate-500">
                    {item.description}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium"
                    style={{
                      backgroundColor: `${PRIORITY_COLOR[item.priority]}1a`,
                      color: PRIORITY_COLOR[item.priority],
                    }}
                  >
                    {t(`priority.${item.priority}`)}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                    {summary(item)}
                  </span>
                  {!item.active && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                      {t("recurring.paused")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {t("recurring.next_run", { date: formatDate(item.next_run_at) })}
                  {" · "}
                  {t("recurring.last_run", { date: formatDate(item.last_run_at) })}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => toggleActive(item)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  {item.active ? t("recurring.pause") : t("recurring.resume")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg px-2 py-1 text-xs text-red-600 transition hover:bg-red-50"
                >
                  {t("item.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
