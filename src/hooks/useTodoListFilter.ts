import { useMemo } from 'react';
import type { Todo } from '../common/types';
import { getDependencyIds, isMeetingTodo } from '../common/utils';

export const useTodoListFilter = (
  todos: Todo[],
  filter: string,
  getTodo: (id: string) => Todo | undefined,
) => {
  return useMemo(() => {
    return todos
      .filter(todo => {
        const now = new Date();
        const isMeeting = isMeetingTodo(todo);
        const startableAt = new Date(todo.startableAt || todo.createdAt);
        const dependentTodos = getDependencyIds(todo)
          .map(getTodo)
          .filter((t): t is Todo => Boolean(t));
        const isDependencyIncomplete = dependentTodos.some(t => t.status !== 'Completed');

        if (filter === 'all') return true;
        if (filter === 'completed') return todo.status === 'Completed';
        if (filter === 'meeting') return isMeeting && todo.status !== 'Completed';

        if (isMeeting) {
          if (filter === 'unlocked') {
            const dueDate = new Date(todo.dueDate);
            return todo.status !== 'Completed' && startableAt <= now && dueDate > now;
          }
          return false;
        }

        if (filter === 'unlocked') {
          return todo.status === 'Unlocked' && startableAt <= now && !isDependencyIncomplete;
        }
        if (filter === 'locked') {
          return (
            todo.status === 'Locked' ||
            (todo.status === 'Unlocked' && (startableAt > now || isDependencyIncomplete))
          );
        }
        return false;
      })
      .sort((a, b) => {
        const dueDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (dueDiff !== 0) return dueDiff;
        if (isMeetingTodo(a) || isMeetingTodo(b)) {
          return a.title.localeCompare(b.title, 'ja');
        }
        return (a.effortMinutes ?? 0) - (b.effortMinutes ?? 0);
      });
  }, [todos, filter, getTodo]);
};
