import Dexie, { type Table } from 'dexie';
import type { Todo } from '@/features/todo/model/types';
import { CURRENT_SCHEMA_VERSION, TODO_STORE_SCHEMA } from '@/features/todo/model/schema';
import { applyMigrationChain } from '@/features/todo/model/migrations';

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
    this.version(CURRENT_SCHEMA_VERSION)
      .stores({
        [TODO_STORE_SCHEMA.name]: TODO_STORE_SCHEMA.keyPath,
        [META_STORE_NAME]: 'key',
      })
      .upgrade(async tx => {
        await tx.table<MetaValue>(META_STORE_NAME).put({ key: SCHEMA_VERSION_KEY, value: 1 });
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

export const todoDB = {
  fetch: async (): Promise<Todo[]> => {
    await ensureMigrated();
    return db.todos.toArray();
  },
  save: async (todos: Todo[]): Promise<void> => {
    await db.transaction('rw', db.todos, async () => {
      await db.todos.clear();
      await db.todos.bulkPut(todos);
    });
  },
};
