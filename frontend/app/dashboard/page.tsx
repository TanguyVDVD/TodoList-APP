"use client";

import { useEffect, useState } from "react";
import {
  todoApi,
  STATUS_META,
  type DailyStat,
  type TodoStatsResponse,
  type TodoStatus,
} from "../lib/api";
import TasksLineChart from "../components/TasksLineChart";
import StatusPieChart from "../components/StatusPieChart";

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
  const [stats, setStats] = useState<TodoStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    todoApi
      .stats()
      .then(setStats)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Chargement impossible."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-slate-500">
          Suivi des tâches par jour de création et répartition par état.
        </p>
      </header>

      {loading && (
        <p className="text-center text-sm text-slate-400">Chargement…</p>
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
            {(["pending", "done", "failed"] as TodoStatus[]).map((key) => (
              <div
                key={key}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <p className="text-xs font-medium text-slate-500">
                  {STATUS_META[key].label}
                </p>
                <p
                  className="mt-1 text-2xl font-bold"
                  style={{ color: STATUS_META[key].color }}
                >
                  {stats.totals[key] ?? 0}
                </p>
              </div>
            ))}
          </div>

          {/* Courbes par jour */}
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              Tâches par jour
            </h2>
            <TasksLineChart data={fillMissingDays(stats.daily)} />
          </section>

          {/* Camembert de répartition */}
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              Répartition par état
            </h2>
            <StatusPieChart totals={stats.totals} />
          </section>
        </>
      )}
    </main>
  );
}
