import type { Todo } from '@/features/todo/model/types';
import { CURRENT_SCHEMA_VERSION, TODO_STORE_SCHEMA } from '@/features/todo/model/schema';
import { applyMigrationChain } from '@/features/todo/model/migrations';

const DB_NAME = 'hakaruTodoDB';
const DB_VERSION = CURRENT_SCHEMA_VERSION;
const OBJECT_STORE_NAME = TODO_STORE_SCHEMA.name;
const META_STORE_NAME = 'meta';
const SCHEMA_VERSION_KEY = 'todoSchemaVersion';

type MetaValue = {
  key: string;
  value: number;
};

const toIDBError = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error : new Error(fallbackMessage);

const requestToPromise = <T>(request: IDBRequest<T>, fallbackMessage: string): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toIDBError(request.error, fallbackMessage));
  });

function initializeSchema(db: IDBDatabase, oldVersion: number) {
  if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
    db.createObjectStore(OBJECT_STORE_NAME, { keyPath: TODO_STORE_SCHEMA.keyPath });
  }

  if (!db.objectStoreNames.contains(META_STORE_NAME)) {
    const metaStore = db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
    const initialSchemaVersion = oldVersion > 0 ? oldVersion : 1;
    metaStore.put({ key: SCHEMA_VERSION_KEY, value: initialSchemaVersion } as MetaValue);
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      reject(toIDBError(request.error, 'Failed to open IndexedDB.'));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onupgradeneeded = event => {
      initializeSchema(request.result, event.oldVersion);
    };
  });
}

async function getSchemaVersion(db: IDBDatabase): Promise<number> {
  const transaction = db.transaction([META_STORE_NAME], 'readonly');
  const objectStore = transaction.objectStore(META_STORE_NAME);
  const result = await requestToPromise(
    objectStore.get(SCHEMA_VERSION_KEY),
    'Failed to read schema version.',
  );

  if (!result || typeof result !== 'object') {
    return 1;
  }

  const value = (result as MetaValue).value;
  return Number.isInteger(value) && value > 0 ? value : 1;
}

async function setSchemaVersion(db: IDBDatabase, version: number): Promise<void> {
  const transaction = db.transaction([META_STORE_NAME], 'readwrite');
  const objectStore = transaction.objectStore(META_STORE_NAME);
  await requestToPromise(
    objectStore.put({ key: SCHEMA_VERSION_KEY, value: version } as MetaValue),
    'Failed to write schema version.',
  );
}

async function replaceAllTodos(db: IDBDatabase, todos: Todo[]): Promise<void> {
  const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
  const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
  await requestToPromise(objectStore.clear(), 'Failed to clear todos store.');

  await Promise.all(
    todos.map(todo => requestToPromise(objectStore.put(todo), 'Failed to write migrated todo.')),
  );
}

async function ensureMigrated(db: IDBDatabase): Promise<void> {
  const currentVersion = await getSchemaVersion(db);
  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  const transaction = db.transaction([OBJECT_STORE_NAME], 'readonly');
  const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
  const todos = (await requestToPromise(objectStore.getAll(), 'Failed to read todos.')) as Todo[];

  const migratedTodos = applyMigrationChain(todos, currentVersion, CURRENT_SCHEMA_VERSION);
  await replaceAllTodos(db, migratedTodos);
  await setSchemaVersion(db, CURRENT_SCHEMA_VERSION);
}

export const todoDB = {
  fetch: async (): Promise<Todo[]> => {
    const db = await openDB();
    await ensureMigrated(db);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OBJECT_STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
      const request = objectStore.getAll();
      request.onsuccess = () => {
        resolve(request.result as Todo[]);
      };
      request.onerror = () => reject(toIDBError(request.error, 'Failed to fetch todos.'));
    });
  },
  save: async (todos: Todo[]) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
      const clearRequest = objectStore.clear();
      clearRequest.onsuccess = () => {
        todos.forEach(todo => objectStore.put(todo));
        transaction.oncomplete = () => resolve(undefined);
      };
      clearRequest.onerror = () => reject(toIDBError(clearRequest.error, 'Failed to clear todos.'));
      transaction.onerror = () => reject(toIDBError(transaction.error, 'Failed to save todos.'));
    });
  },
};
