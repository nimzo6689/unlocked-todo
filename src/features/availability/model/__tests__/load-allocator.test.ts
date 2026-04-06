import type { Todo, WorkSchedule } from '@/features/todo/model/types';
import {
  aggregateLoadForDates,
  allocateTaskEffortAcrossSlots,
  sortTasksByPriority,
} from '../load-allocator';
import { afterEach, vi } from 'vitest';

const schedule: WorkSchedule = {
  workingDays: [1, 2, 3, 4, 5],
  workStartHour: 9,
  workEndHour: 17,
  breakPeriods: [{ startMinute: 12 * 60, endMinute: 13 * 60 }],
};

const createTodo = (overrides: Partial<Todo>): Todo => ({
  id: 'todo-1',
  title: 'Task',
  description: '',
  taskType: 'Normal',
  createdAt: '2026-04-06T08:00:00',
  startedAt: undefined,
  startableAt: '2026-04-06T09:00:00',
  dueDate: '2026-04-06T17:00:00',
  status: 'Unlocked',
  effortMinutes: 120,
  actualWorkSeconds: 0,
  dependency: undefined,
  completedAt: undefined,
  ...overrides,
});

describe('load-allocator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sorts tasks by shorter available working duration first', () => {
    const shortTask = createTodo({
      id: 'short',
      startableAt: '2026-04-06T09:00:00',
      dueDate: '2026-04-06T11:00:00',
    });
    const longTask = createTodo({
      id: 'long',
      startableAt: '2026-04-06T09:00:00',
      dueDate: '2026-04-06T17:00:00',
    });

    const sorted = sortTasksByPriority([longTask, shortTask], schedule, []);

    expect(sorted.map(item => item.todo.id)).toEqual(['short', 'long']);
  });

  it('sorts by start time when working durations are equal', () => {
    const first = createTodo({
      id: 'first',
      startableAt: '',
      createdAt: '2026-04-06T08:00:00',
      dueDate: '2026-04-06T12:00:00',
    });
    const second = createTodo({
      id: 'second',
      startableAt: '2026-04-06T09:00:00',
      createdAt: '2026-04-06T08:30:00',
      dueDate: '2026-04-06T12:00:00',
    });

    const sorted = sortTasksByPriority([second, first], schedule, []);

    expect(sorted.map(item => item.todo.id)).toEqual(['first', 'second']);
  });

  it('distributes effort under capped capacity path', () => {
    const allocation = allocateTaskEffortAcrossSlots(
      [
        { index: 0, overlapHours: 1, slotHours: 1 },
        { index: 1, overlapHours: 1, slotHours: 1 },
      ],
      [0, 0],
      1,
    );

    expect(allocation.get(0)).toBeCloseTo(0.5, 6);
    expect(allocation.get(1)).toBeCloseTo(0.5, 6);
  });

  it('distributes overflow effort when capped capacity is insufficient', () => {
    const allocation = allocateTaskEffortAcrossSlots(
      [
        { index: 0, overlapHours: 1, slotHours: 1 },
        { index: 1, overlapHours: 1, slotHours: 1 },
      ],
      [0.75, 0],
      2,
    );

    expect(allocation.get(0)).toBeCloseTo(0.625, 6);
    expect(allocation.get(1)).toBeCloseTo(1.375, 6);
  });

  it('returns empty map for empty overlaps or non-positive effort', () => {
    expect(allocateTaskEffortAcrossSlots([], [0], 1).size).toBe(0);
    expect(
      allocateTaskEffortAcrossSlots([{ index: 0, overlapHours: 1, slotHours: 1 }], [0], 0).size,
    ).toBe(0);
  });

  it('aggregates slot load and meeting series for display dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T09:15:00.000Z'));

    const todos = [
      createTodo({
        id: 'task-a',
        startableAt: '2026-04-06T09:00:00.000Z',
        dueDate: '2026-04-06T11:00:00.000Z',
        effortMinutes: 90,
      }),
      createTodo({
        id: 'task-b',
        startableAt: '2026-04-06T09:30:00.000Z',
        dueDate: '2026-04-06T12:00:00.000Z',
        effortMinutes: 120,
      }),
    ];

    const meetings = [
      createTodo({
        id: 'meeting-1',
        taskType: 'Meeting',
        startableAt: '2026-04-06T10:00:00.000Z',
        dueDate: '2026-04-06T10:30:00.000Z',
        effortMinutes: 0,
      }),
    ];

    const aggregated = aggregateLoadForDates(todos, meetings, ['2026-04-06'], schedule);
    const day = aggregated['2026-04-06'];

    expect(day).toBeDefined();
    expect(day.slots.length).toBeGreaterThan(0);
    expect(day.slotTotals.some(value => value > 0)).toBe(true);
    expect(day.taskSeries.length).toBe(2);
    expect(day.meetingSeries.some(value => value > 0)).toBe(true);
    expect(day.slotContributors.length).toBe(day.slots.length);
  });

  it('skips allocation for elapsed slots and zero remaining effort', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T00:00:00.000Z'));

    const todos = [
      createTodo({
        id: 'done-like',
        startableAt: '2026-04-06T09:00:00.000Z',
        dueDate: '2026-04-06T10:00:00.000Z',
        effortMinutes: 60,
        actualWorkSeconds: 3600,
      }),
    ];

    const aggregated = aggregateLoadForDates(todos, [], ['2026-04-06'], schedule);
    const day = aggregated['2026-04-06'];

    expect(day.taskSeries).toHaveLength(0);
    expect(day.slotTotals.every(value => value === 0)).toBe(true);
    expect(day.meetingSeries.every(value => value === 0)).toBe(true);
  });

  it('treats 25-minute task as 30 minutes in chart load', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T00:00:00.000Z'));

    const todos = [
      createTodo({
        id: 'task-25',
        startableAt: '2026-04-06T09:00:00.000Z',
        dueDate: '2026-04-06T10:00:00.000Z',
        effortMinutes: 25,
      }),
    ];

    const aggregated = aggregateLoadForDates(todos, [], ['2026-04-06'], schedule);
    const day = aggregated['2026-04-06'];
    const totalLoadHours = day.slotTotals.reduce((sum, value) => sum + value * 0.5, 0);

    expect(totalLoadHours).toBeCloseTo(0.5, 6);
  });

  it('treats 55-minute task as 60 minutes in chart load', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T00:00:00.000Z'));

    const todos = [
      createTodo({
        id: 'task-55',
        startableAt: '2026-04-06T09:00:00.000Z',
        dueDate: '2026-04-06T11:00:00.000Z',
        effortMinutes: 55,
      }),
    ];

    const aggregated = aggregateLoadForDates(todos, [], ['2026-04-06'], schedule);
    const day = aggregated['2026-04-06'];
    const totalLoadHours = day.slotTotals.reduce((sum, value) => sum + value * 0.5, 0);

    expect(totalLoadHours).toBeCloseTo(1, 6);
  });
});
