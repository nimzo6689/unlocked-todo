import { useMemo, useRef } from 'react';
import type { Todo } from '@/features/todo/model/types';

const areAvailabilityTodosEqual = (left: Todo[], right: Todo[]) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((todo, index) => {
    const other = right[index];
    return (
      Boolean(other) &&
      todo.id === other.id &&
      todo.title === other.title &&
      todo.taskType === other.taskType &&
      todo.createdAt === other.createdAt &&
      todo.startableAt === other.startableAt &&
      todo.dueDate === other.dueDate &&
      todo.status === other.status &&
      todo.effortMinutes === other.effortMinutes &&
      todo.actualWorkSeconds === other.actualWorkSeconds &&
      todo.assignee === other.assignee
    );
  });
};

export const useStableAvailabilityTodos = (todos: Todo[]) => {
  const stableRef = useRef(todos);

  return useMemo(() => {
    if (!areAvailabilityTodosEqual(stableRef.current, todos)) {
      stableRef.current = todos;
    }

    return stableRef.current;
  }, [todos]);
};
