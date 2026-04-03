import { useEffect, useState } from 'react';
import type { Todo } from '@/features/todo/model/types';

export const useTodoSelection = (filteredTodos: Todo[]) => {
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  const selectedTodo = selectedTodoId
    ? filteredTodos.find(todo => todo.id === selectedTodoId) || null
    : filteredTodos[0] || null;

  useEffect(() => {
    if (filteredTodos.length === 0) {
      setSelectedTodoId(null);
      return;
    }

    if (!selectedTodoId || !filteredTodos.some(todo => todo.id === selectedTodoId)) {
      setSelectedTodoId(filteredTodos[0].id);
    }
  }, [filteredTodos, selectedTodoId]);

  useEffect(() => {
    if (!selectedTodo?.id) return;
    const element = document.getElementById(`todo-card-${selectedTodo.id}`);
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedTodo?.id]);

  const selectRelativeTodo = (delta: number) => {
    if (filteredTodos.length === 0) return;

    const currentIndex = selectedTodo
      ? filteredTodos.findIndex(todo => todo.id === selectedTodo.id)
      : 0;
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (safeIndex + delta + filteredTodos.length) % filteredTodos.length;
    setSelectedTodoId(filteredTodos[nextIndex].id);
  };

  return { selectedTodoId, setSelectedTodoId, selectedTodo, selectRelativeTodo };
};
