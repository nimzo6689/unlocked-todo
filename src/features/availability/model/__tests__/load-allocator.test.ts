import type { Todo, WorkSchedule } from '@/features/todo/model/types';
import { allocateTaskEffortAcrossSlots, sortTasksByPriority } from '../load-allocator';

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
  assignee: '自分',
  dependency: undefined,
  completedAt: undefined,
  ...overrides,
});

describe('load-allocator', () => {
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

    expect(sorted.map((item) => item.todo.id)).toEqual(['short', 'long']);
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
    expect(allocateTaskEffortAcrossSlots([{ index: 0, overlapHours: 1, slotHours: 1 }], [0], 0).size).toBe(0);
  });
});
