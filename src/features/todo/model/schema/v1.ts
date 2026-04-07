export type TodoSchemaV1 = {
  version: 1;
  description: string;
  dependsOn: 'string | string[] | undefined';
};

export const TODO_SCHEMA_V1: TodoSchemaV1 = {
  version: 1,
  description: 'Legacy schema without explicit migration chain metadata store.',
  dependsOn: 'string | string[] | undefined',
};
