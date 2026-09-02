"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TagCount } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface Props {
  tags: TagCount[];
}

/** Camembert de la répartition des tâches par tag. */
export default function TagPieChart({ tags }: Props) {
  const { t } = useI18n();

  const data = tags
    .filter((tag) => tag.count > 0)
    .map((tag) => ({
      key: tag.id,
      name: tag.name,
      color: tag.color,
      value: tag.count,
    }));

  if (data.length === 0) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-slate-400">
        {t("dash.no_tags")}
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
