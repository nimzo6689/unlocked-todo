import { describe, expect, it } from 'vitest';
import type { Todo } from '@/features/todo/model/types';
import { __internal, applyMigrationChain } from '@/features/todo/model/migrations';
import { createTodo } from '@/test/factories/todo';

describe('todo migrations', () => {
  it('migrates v1 data to v2 defaults and dependency shape', () => {
    const v1Todos = [
      {
        ...createTodo({ id: 'a' }),
        dependsOn: 'dep-1',
        effortMinutes: Number.NaN,
        actualWorkSeconds: Number.NaN,
      } as unknown as Todo,
    ];

    const migrated = __internal.migrateV1toV2(v1Todos);

    expect(migrated).toHaveLength(1);
    expect(migrated[0].dependsOn).toEqual(['dep-1']);
    expect(migrated[0].effortMinutes).toBe(25);
    expect(migrated[0].actualWorkSeconds).toBe(0);
  });

  it('applies chain from v1 to current', () => {
    const v1Todos = [
      {
        ...createTodo({ id: 'b' }),
        dependsOn: '',
      } as unknown as Todo,
    ];

    const migrated = applyMigrationChain(v1Todos, 1, 3);

    expect(migrated[0].dependsOn).toBeUndefined();
  });

  it('keeps data unchanged for v2 to v3 no-op migration', () => {
    const v2Todos = [createTodo({ id: 'c', dependsOn: ['dep-a'] })];

    const migrated = applyMigrationChain(v2Todos, 2, 3);

    expect(migrated).toEqual(v2Todos);
  });
});
