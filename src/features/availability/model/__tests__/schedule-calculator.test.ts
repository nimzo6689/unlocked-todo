import type { Todo, WorkSchedule } from '@/features/todo/model/types';
import {
  buildDisplayDates,
  buildWorkingDateRange,
  calculateWorkingDurationMsInRange,
  getWorkingIntervalsForDay,
  parseTaskRange,
} from '../schedule-calculator';

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
  createdAt: '2026-04-06T09:00:00',
  startedAt: undefined,
  startableAt: '2026-04-06T09:00:00',
  dueDate: '2026-04-06T11:00:00',
  status: 'Unlocked',
  effortMinutes: 60,
  actualWorkSeconds: 0,
  dependsOn: undefined,
  completedAt: undefined,
  ...overrides,
});

describe('schedule-calculator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T09:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds display dates for only working days in a 7-day window', () => {
    const dates = buildDisplayDates('2026-04-04', schedule);

    expect(dates).toEqual(['2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10']);
  });

  it('parses valid task range and rejects zero effort by default', () => {
    const normal = createTodo({ effortMinutes: 30 });
    const meeting = createTodo({ effortMinutes: 0, taskType: 'Meeting' });

    expect(parseTaskRange(normal)).not.toBeNull();
    expect(parseTaskRange(meeting)).toBeNull();
    expect(parseTaskRange(meeting, { allowZeroEffort: true })).not.toBeNull();
  });

  it('returns working intervals with break period excluded', () => {
    const intervals = getWorkingIntervalsForDay(new Date('2026-04-06T00:00:00'), schedule);

    expect(intervals).toEqual([
      {
        startMs: new Date('2026-04-06T09:00:00').getTime(),
        endMs: new Date('2026-04-06T12:00:00').getTime(),
      },
      {
        startMs: new Date('2026-04-06T13:00:00').getTime(),
        endMs: new Date('2026-04-06T17:00:00').getTime(),
      },
    ]);
  });

  it('calculates working duration in range excluding break and meetings', () => {
    const meeting = createTodo({
      id: 'meeting-1',
      taskType: 'Meeting',
      effortMinutes: 0,
      startableAt: '2026-04-06T10:30:00',
      dueDate: '2026-04-06T11:30:00',
    });

    const durationMs = calculateWorkingDurationMsInRange(
      {
        start: new Date('2026-04-06T10:00:00'),
        end: new Date('2026-04-06T15:00:00'),
      },
      schedule,
      [meeting],
    );

    expect(durationMs).toBe(3 * 60 * 60 * 1000);
  });

  it('builds working date range skipping weekend', () => {
    const dates = buildWorkingDateRange(
      new Date('2026-04-10T09:00:00'),
      new Date('2026-04-14T09:00:00'),
      schedule,
    );

    expect(dates).toEqual(['2026-04-10', '2026-04-13', '2026-04-14']);
  });
});
