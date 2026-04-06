import type { Todo } from '@/features/todo/model/types';

type TodoOverride = Partial<Todo>;

export const createTodo = (override: TodoOverride = {}): Todo => ({
  id: 'todo-1',
  title: 'テストタスク',
  description: '説明',
  taskType: 'Normal',
  createdAt: '2026-04-01T09:00:00.000Z',
  startedAt: '2026-04-01T09:00:00.000Z',
  startableAt: '2026-04-01T09:00:00.000Z',
  dueDate: '2026-04-03T09:00:00.000Z',
  status: 'Unlocked',
  effortMinutes: 60,
  actualWorkSeconds: 1800,
  ...override,
});
