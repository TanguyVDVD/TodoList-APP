"use client";

import { PRIORITY_COLOR, type Todo } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface Props {
  todo: Todo;
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: (event: React.DragEvent<HTMLElement>) => void;
  dragging: boolean;
}

/** Carte compacte (lecture seule) affichée dans une colonne du Kanban. */
export default function KanbanCard({
  todo,
  onDragStart,
  onDragEnd,
  dragging,
}: Props) {
  const { t } = useI18n();
  const priorityColor = PRIORITY_COLOR[todo.priority];

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 transition active:cursor-grabbing ${
        dragging ? "opacity-40" : "hover:ring-slate-300"
      }`}
    >
      <p className="break-words text-sm font-medium text-slate-900">
        {todo.title}
      </p>
      {todo.description && (
        <p className="mt-0.5 line-clamp-2 break-words text-xs text-slate-500">
          {todo.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span
          className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${priorityColor}1a`,
            color: priorityColor,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: priorityColor }}
          />
          {t(`priority.${todo.priority}`)}
        </span>

        {todo.tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${tag.color}1a`,
              color: tag.color,
              borderColor: `${tag.color}80`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
          </span>
        ))}
      </div>
    </article>
  );
}
