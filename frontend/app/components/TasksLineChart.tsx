"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STATUS_META, type DailyStat } from "../lib/api";

/** Formate "2026-09-02" -> "02/09". */
const formatDay = (value: string) => `${value.slice(8, 10)}/${value.slice(5, 7)}`;

interface Props {
  data: DailyStat[];
}

/**
 * Courbes du nombre de tâches par jour (axe X = jours, axe Y = nb de tâches),
 * une couleur par état.
 */
export default function TasksLineChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-slate-400">
        Aucune tâche à afficher.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            fontSize={12}
            stroke="#94a3b8"
          />
          <YAxis allowDecimals={false} fontSize={12} stroke="#94a3b8" />
          <Tooltip
            labelFormatter={(label) => `Jour : ${formatDay(String(label))}`}
          />
          <Legend />
          {(["pending", "done", "failed"] as const).map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={STATUS_META[key].label}
              stroke={STATUS_META[key].color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
