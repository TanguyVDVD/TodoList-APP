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
import { STATUS_COLOR, STATUS_ORDER, type DailyStat } from "../lib/api";
import { useI18n } from "../lib/i18n";

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
  const { t } = useI18n();

  if (data.length === 0) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-slate-400">
        {t("dash.no_data")}
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
            labelFormatter={(label) =>
              t("chart.day_label", { date: formatDay(String(label)) })
            }
          />
          <Legend />
          {STATUS_ORDER.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={t(`status.${key}`)}
              stroke={STATUS_COLOR[key]}
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
