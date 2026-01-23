// IndexedDB 操作と型定義
export type Todo = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  startableAt: string;
  dueDate: string;
  status: 'Unlocked' | 'Locked' | 'Completed';
  effortMinutes: number;
  assignee: '自分' | '他人';
  dependency?: string;
};

const DB_NAME = 'unlockedTodoDB';
const DB_VERSION = 1;
const OBJECT_STORE_NAME = 'todos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = event => {
      reject((event.target as IDBRequest).error);
    };
    request.onsuccess = event => {
      resolve((event.target as IDBRequest).result as IDBDatabase);
    };
    request.onupgradeneeded = event => {
      const db = (event.target as IDBRequest).result as IDBDatabase;
      if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export const todoDB = {
  fetch: async (): Promise<Todo[]> => {
    const db = await openDB();
    return new Promise(resolve => {
      const transaction = db.transaction([OBJECT_STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
      const request = objectStore.getAll();
      request.onsuccess = event => {
        resolve((event.target as IDBRequest).result as Todo[]);
      };
      request.onerror = () => resolve([]);
    });
  },
  save: async (todos: Todo[]) => {
    const db = await openDB();
    return new Promise(resolve => {
      const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
      const clearRequest = objectStore.clear();
      clearRequest.onsuccess = () => {
        todos.forEach(todo => objectStore.put(todo));
        transaction.oncomplete = () => resolve(undefined);
      };
      clearRequest.onerror = () => resolve(undefined);
    });
  },
};
