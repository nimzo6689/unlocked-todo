import { describe, expect, it } from 'vitest';
import type { RecurringTaskDefinition } from '@/features/todo/model/types';
import {
  expandRecurringStartTimes,
  resolveRecurringDueDate,
} from '@/features/todo/model/recurring-utils';

const createDefinition = (
  overrides: Partial<RecurringTaskDefinition> = {},
): RecurringTaskDefinition => {
  const now = '2026-04-01T09:00:00.000Z';
  return {
    id: 'rec-1',
    title: 'Daily task',
    description: '',
    taskType: 'Normal',
    effortMinutes: 25,
    startAt: now,
    firstDueAt: '2026-04-01T10:00:00.000Z',
    interval: 1,
    unit: 'day',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

describe('recurring-utils', () => {
  it('expands daily recurrence within range', () => {
    const definition = createDefinition();

    const result = expandRecurringStartTimes(
      definition,
      new Date('2026-04-02T00:00:00.000Z'),
      new Date('2026-04-04T23:59:59.999Z'),
    );

    expect(result).toEqual([
      '2026-04-02T09:00:00.000Z',
      '2026-04-03T09:00:00.000Z',
      '2026-04-04T09:00:00.000Z',
    ]);
  });

  it('stops expansion at endAt', () => {
    const definition = createDefinition({
      interval: 1,
      unit: 'week',
      endAt: '2026-04-15T09:00:00.000Z',
    });

    const result = expandRecurringStartTimes(
      definition,
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-05-01T00:00:00.000Z'),
    );

    expect(result).toEqual([
      '2026-04-01T09:00:00.000Z',
      '2026-04-08T09:00:00.000Z',
      '2026-04-15T09:00:00.000Z',
    ]);
  });

  it('calculates due date from initial grace duration', () => {
    const due = resolveRecurringDueDate(
      '2026-04-08T09:00:00.000Z',
      '2026-04-01T09:00:00.000Z',
      '2026-04-01T11:30:00.000Z',
    );

    expect(due).toBe('2026-04-08T11:30:00.000Z');
  });

  it('clamps month recurrence to month end when day is missing', () => {
    const definition = createDefinition({
      startAt: '2026-01-31T09:00:00.000Z',
      firstDueAt: '2026-01-31T11:00:00.000Z',
      interval: 1,
      unit: 'month',
    });

    const result = expandRecurringStartTimes(
      definition,
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual(['2026-02-28T09:00:00.000Z', '2026-03-28T09:00:00.000Z']);
  });
});
