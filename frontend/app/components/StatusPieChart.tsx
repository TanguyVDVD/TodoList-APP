"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { STATUS_META, type TodoStatus } from "../lib/api";

interface Props {
  totals: Record<TodoStatus, number>;
}

/** Camembert de la répartition des tâches par état. */
export default function StatusPieChart({ totals }: Props) {
  const data = (Object.keys(STATUS_META) as TodoStatus[]).map((key) => ({
    key,
    name: STATUS_META[key].label,
    color: STATUS_META[key].color,
    value: totals[key] ?? 0,
  }));

  const isEmpty = data.every((slice) => slice.value === 0);
  if (isEmpty) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-slate-400">
        Aucune tâche à afficher.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={95}
            label={({ name, value }) => `${name} : ${value}`}
          >
            {data.map((slice) => (
              <Cell key={slice.key} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
