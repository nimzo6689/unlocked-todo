export type TodoStoreSchema = {
  name: 'todos';
  keyPath: 'id';
};

export const TODO_STORE_SCHEMA: TodoStoreSchema = {
  name: 'todos',
  keyPath: 'id',
};

export const CURRENT_SCHEMA_VERSION = 2;

export { TODO_SCHEMA_V1 } from './v1';
export { TODO_SCHEMA_V2 } from './v2';
