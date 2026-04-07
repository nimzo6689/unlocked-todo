import Dexie, { type Table } from 'dexie';
import type { Todo } from '@/features/todo/model/types';
import { CURRENT_SCHEMA_VERSION, TODO_STORE_SCHEMA } from '@/features/todo/model/schema';
import { applyMigrationChain } from '@/features/todo/model/migrations';
import { getDependencyIds } from '@/features/todo/model/todo-utils';

const DB_NAME = 'hakaruTodoDB';
const META_STORE_NAME = 'meta';
const SCHEMA_VERSION_KEY = 'todoSchemaVersion';

type MetaValue = {
  key: string;
  value: number;
};

class HakaruTodoDB extends Dexie {
  todos!: Table<Todo, string>;
  meta!: Table<MetaValue, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      [TODO_STORE_SCHEMA.name]: TODO_STORE_SCHEMA.keyPath,
    });
    this.version(2)
      .stores({
        [TODO_STORE_SCHEMA.name]: TODO_STORE_SCHEMA.keyPath,
        [META_STORE_NAME]: 'key',
      })
      .upgrade(async tx => {
        await tx.table<MetaValue>(META_STORE_NAME).put({ key: SCHEMA_VERSION_KEY, value: 1 });
      });
    this.version(3).stores({
      [TODO_STORE_SCHEMA.name]: 'id, dueDate, startableAt, completedAt',
      [META_STORE_NAME]: 'key',
    });
  }
}

const db = new HakaruTodoDB();

async function getSchemaVersion(): Promise<number> {
  const result = await db.meta.get(SCHEMA_VERSION_KEY);
  if (!result) return 1;
  const { value } = result;
  return Number.isInteger(value) && value > 0 ? value : 1;
}

async function ensureMigrated(): Promise<void> {
  const currentVersion = await getSchemaVersion();
  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  const todos = await db.todos.toArray();
  const migratedTodos = applyMigrationChain(todos, currentVersion, CURRENT_SCHEMA_VERSION);

  await db.transaction('rw', db.todos, db.meta, async () => {
    await db.todos.clear();
    await db.todos.bulkPut(migratedTodos);
    await db.meta.put({ key: SCHEMA_VERSION_KEY, value: CURRENT_SCHEMA_VERSION });
  });
}

const runWithMigration = async <T>(operation: () => Promise<T>): Promise<T> => {
  await ensureMigrated();
  return operation();
};

const toBoundary = (value: string, fallback: string) => {
  if (!value) {
    return fallback;
  }
  return value.includes('T') ? value : `${value}${fallback}`;
};

export const todoDB = {
  fetchPage: async (offset: number, limit: number): Promise<Todo[]> => {
    return runWithMigration(() =>
      db.todos.orderBy('dueDate').offset(offset).limit(limit).toArray(),
    );
  },
  fetchTotalCount: async (): Promise<number> => {
    return runWithMigration(() => db.todos.count());
  },
  bulkGetByIds: async (ids: string[]): Promise<Todo[]> => {
    if (ids.length === 0) {
      return [];
    }

    return runWithMigration(async () => {
      const uniqueIds = [...new Set(ids)];
      const rows = await db.todos.bulkGet(uniqueIds);
      return rows.filter((row): row is Todo => Boolean(row));
    });
  },
  fetchForAvailability: async (weekStart: string, weekEnd: string): Promise<Todo[]> => {
    const rangeStart = toBoundary(weekStart, 'T00:00:00.000Z');
    const rangeEndExclusive = toBoundary(weekEnd, 'T23:59:59.999Z');

    return runWithMigration(() =>
      db.todos
        .where('dueDate')
        .aboveOrEqual(rangeStart)
        .filter(todo => todo.status !== 'Completed' && todo.startableAt <= rangeEndExclusive)
        .toArray(),
    );
  },
  fetchCompletedByCompletedAt: async (from: string, to: string): Promise<Todo[]> => {
    return runWithMigration(() =>
      db.todos.where('completedAt').between(from, to, true, false).toArray(),
    );
  },
  fetchDependentsByDependencyIds: async (dependencyIds: string[]): Promise<Todo[]> => {
    if (dependencyIds.length === 0) {
      return [];
    }

    const targetIds = new Set(dependencyIds);
    return runWithMigration(() =>
      db.todos
        .toCollection()
        .filter(todo => getDependencyIds(todo).some(depId => targetIds.has(depId)))
        .toArray(),
    );
  },
  fetchAll: async (): Promise<Todo[]> => {
    return runWithMigration(() => db.todos.toArray());
  },
  put: async (todo: Todo): Promise<void> => {
    await runWithMigration(async () => {
      await db.todos.put(todo);
    });
  },
  bulkPut: async (todos: Todo[]): Promise<void> => {
    if (todos.length === 0) {
      return;
    }

    await runWithMigration(async () => {
      await db.todos.bulkPut(todos);
    });
  },
  delete: async (id: string): Promise<void> => {
    await runWithMigration(async () => {
      await db.todos.delete(id);
    });
  },
  fetch: async (): Promise<Todo[]> => {
    return runWithMigration(() => db.todos.toArray());
  },
  save: async (todos: Todo[]): Promise<void> => {
    await runWithMigration(async () => {
      await db.transaction('rw', db.todos, async () => {
        await db.todos.clear();
        await db.todos.bulkPut(todos);
      });
    });
  },
};
