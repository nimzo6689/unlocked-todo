import type { Todo } from '@/features/todo/model/types';
import { DEFAULT_EFFORT_MINUTES, DEFAULT_TASK_TYPE } from '@/features/todo/model/todo-utils';

type PersistedTodo = Partial<Todo> & {
  id: string;
  title: string;
  createdAt: string;
  startableAt: string;
  dueDate: string;
  status: Todo['status'];
};

export type MigrationStep = {
  from: number;
  to: number;
  transform: (todos: Todo[]) => Todo[];
};

export class TodoMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TodoMigrationError';
  }
}

const normalizeDependsOn = (dependsOn: Todo['dependsOn']): string[] | undefined => {
  if (!dependsOn) {
    return undefined;
  }

  if (Array.isArray(dependsOn)) {
    const filtered = dependsOn.filter(dep => typeof dep === 'string' && dep);
    return filtered.length > 0 ? filtered : undefined;
  }

  return dependsOn ? [dependsOn] : undefined;
};

const toNonNegativeNumber = (value: unknown, fallback: number) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : fallback;
};

const migrateV1toV2 = (todos: Todo[]): Todo[] =>
  todos.map(todo => {
    const data = todo as PersistedTodo;
    return {
      ...todo,
      taskType:
        todo.taskType === 'Meeting' || todo.taskType === 'Normal'
          ? todo.taskType
          : DEFAULT_TASK_TYPE,
      effortMinutes: toNonNegativeNumber(data.effortMinutes, DEFAULT_EFFORT_MINUTES),
      actualWorkSeconds: toNonNegativeNumber(data.actualWorkSeconds, 0),
      dependsOn: normalizeDependsOn(todo.dependsOn),
    };
  });

const MIGRATION_CHAIN: MigrationStep[] = [
  {
    from: 1,
    to: 2,
    transform: migrateV1toV2,
  },
  {
    from: 2,
    to: 3,
    transform: todos => todos,
  },
];

export const applyMigrationChain = (todos: Todo[], from: number, to: number): Todo[] => {
  if (from >= to) {
    return todos;
  }

  let currentVersion = from;
  let currentTodos = todos;

  while (currentVersion < to) {
    const nextStep = MIGRATION_CHAIN.find(step => step.from === currentVersion);
    if (!nextStep) {
      throw new TodoMigrationError(
        `Missing migration step from version ${currentVersion} to ${currentVersion + 1}.`,
      );
    }

    currentTodos = nextStep.transform(currentTodos);
    currentVersion = nextStep.to;
  }

  return currentTodos;
};

export const __internal = {
  migrateV1toV2,
};
