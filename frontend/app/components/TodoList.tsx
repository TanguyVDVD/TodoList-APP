"use client";

import type { Todo, TodoUpdateInput } from "../lib/api";
import { useI18n } from "../lib/i18n";
import TodoItem from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  onUpdate: (todo: Todo, patch: TodoUpdateInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

/** Affiche la liste des tâches ou un état vide. */
export default function TodoList({ todos, onUpdate, onDelete }: TodoListProps) {
  const { t } = useI18n();

  if (todos.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 ring-1 ring-slate-200">
        {t("list.empty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
