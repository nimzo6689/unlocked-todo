export type TodoSchemaV2 = {
  version: 2;
  description: string;
  dependsOn: 'string[] | undefined';
};

export const TODO_SCHEMA_V2: TodoSchemaV2 = {
  version: 2,
  description: 'Introduces migration chain support and normalizes dependsOn as array.',
  dependsOn: 'string[] | undefined',
};
