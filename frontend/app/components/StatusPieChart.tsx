"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { STATUS_COLOR, STATUS_ORDER, type TodoStatus } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface Props {
  totals: Record<TodoStatus, number>;
}

/** Camembert de la répartition des tâches par état. */
export default function StatusPieChart({ totals }: Props) {
  const { t } = useI18n();

  const data = STATUS_ORDER.map((key) => ({
    key,
    name: t(`status.${key}`),
    color: STATUS_COLOR[key],
    value: totals[key] ?? 0,
  }));

  const isEmpty = data.every((slice) => slice.value === 0);
  if (isEmpty) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-slate-400">
        {t("dash.no_data")}
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
