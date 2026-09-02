"use client";

import { useEffect, useState } from "react";
import {
  todoApi,
  STATUS_COLOR,
  STATUS_ORDER,
  type DailyStat,
  type TodoStatsResponse,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import TasksLineChart from "../components/TasksLineChart";
import StatusPieChart from "../components/StatusPieChart";
import TagPieChart from "../components/TagPieChart";

/**
 * Complète les jours manquants entre la première et la dernière date
 * pour que la courbe soit continue (pas de "trous").
 */
function fillMissingDays(daily: DailyStat[]): DailyStat[] {
  if (daily.length === 0) return [];

  const byDate = new Map(daily.map((d) => [d.date, d]));
  const cursor = new Date(`${daily[0].date}T00:00:00Z`);
  const end = new Date(`${daily[daily.length - 1].date}T00:00:00Z`);
  const result: DailyStat[] = [];

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    result.push(byDate.get(key) ?? { date: key, pending: 0, done: 0, failed: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<TodoStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    todoApi
      .stats()
      .then(setStats)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("dash.error_load")),
      )
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("dash.title")}</h1>
        <p className="text-sm text-slate-500">{t("dash.subtitle")}</p>
      </header>

      {loading && (
        <p className="text-center text-sm text-slate-400">{t("dash.loading")}</p>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Cartes de synthèse */}
          <div className="grid grid-cols-3 gap-3">
            {STATUS_ORDER.map((key) => (
              <div
                key={key}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <p className="text-xs font-medium text-slate-500">
                  {t(`status.${key}`)}
                </p>
                <p
                  className="mt-1 text-2xl font-bold"
                  style={{ color: STATUS_COLOR[key] }}
                >
                  {stats.totals[key] ?? 0}
                </p>
              </div>
            ))}
          </div>

          {/* Courbes par jour */}
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              {t("dash.tasks_per_day")}
            </h2>
            <TasksLineChart data={fillMissingDays(stats.daily)} />
          </section>

          {/* Camemberts de répartition */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">
                {t("dash.distribution")}
              </h2>
              <StatusPieChart totals={stats.totals} />
            </section>

            <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">
                {t("dash.tag_distribution")}
              </h2>
              <TagPieChart tags={stats.tags} />
            </section>
          </div>
        </>
      )}
    </main>
  );
}
