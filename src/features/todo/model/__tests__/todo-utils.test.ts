import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_TASK_TYPE,
  formatDate,
  formatDateForInput,
  formatDurationFromSeconds,
  getDependencyIds,
  getMeetingStatus,
  isMeetingTodo,
  isNormalTodo,
  normalizeTaskType,
  normalizeTodo,
  todosFromJSON,
  todosToJSON,
} from '@/features/todo/model/todo-utils';
import { createTodo } from '@/test/factories/todo';

describe('todo-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T09:00:00.000Z'));
  });

  it('detects task types', () => {
    expect(isMeetingTodo({ taskType: 'Meeting' })).toBe(true);
    expect(isNormalTodo({ taskType: 'Normal' })).toBe(true);
  });

  it('returns meeting status by due date and current status', () => {
    expect(getMeetingStatus('2026-04-04T08:59:00.000Z')).toBe('Completed');
    expect(getMeetingStatus('2026-04-04T12:00:00.000Z')).toBe('Unlocked');
    expect(getMeetingStatus('invalid-date')).toBe('Unlocked');
    expect(getMeetingStatus('2026-04-04T12:00:00.000Z', 'Completed')).toBe('Completed');
  });

  it('normalizes dependencies from string, array and empty value', () => {
    expect(getDependencyIds(createTodo({ dependency: 'id-1' }))).toEqual(['id-1']);
    expect(getDependencyIds(createTodo({ dependency: ['id-1', '', 'id-2'] }))).toEqual([
      'id-1',
      'id-2',
    ]);
    expect(getDependencyIds(createTodo({ dependency: undefined }))).toEqual([]);
  });

  it('formats date, datetime-local and duration safely', () => {
    expect(formatDate(undefined)).toBe('N/A');
    expect(formatDate('2026-04-04T09:00:00.000Z')).toContain('2026');

    expect(formatDateForInput(undefined)).toBe('');
    expect(formatDateForInput('2026-04-04T09:30:00.000Z')).toMatch(/^2026-04-04T/);

    expect(formatDurationFromSeconds()).toBe('00:00:00');
    expect(formatDurationFromSeconds(3661)).toBe('01:01:01');
    expect(formatDurationFromSeconds(-100)).toBe('00:00:00');
  });

  it('converts todos to JSON and back', () => {
    const todos = [createTodo({ id: '1' }), createTodo({ id: '2', dependency: ['1'] })];

    const json = todosToJSON(todos);
    const parsed = todosFromJSON(json);

    expect(parsed).toHaveLength(2);
    expect(parsed[1].dependency).toEqual(['1']);
  });

  it('throws for invalid JSON payloads', () => {
    expect(() => todosFromJSON('not-json')).toThrow('JSONの解析に失敗しました');
    expect(() => todosFromJSON('{"id":"1"}')).toThrow('JSONはTodo配列である必要があります');

    const invalidTodoArray = JSON.stringify([
      {
        id: '',
        title: 'x',
        createdAt: '2026-01-01T00:00:00.000Z',
        startableAt: '2026-01-01T00:00:00.000Z',
        dueDate: '2026-01-01T01:00:00.000Z',
        status: 'Unlocked',
        effortMinutes: 10,
        actualWorkSeconds: 0,
        assignee: '自分',
      },
    ]);

    expect(() => todosFromJSON(invalidTodoArray)).toThrow('行1のTodoが不正です');
  });

  it('validates required fields and value domains in import payload', () => {
    const base = {
      id: '1',
      title: 'task',
      createdAt: '2026-01-01T00:00:00.000Z',
      startableAt: '2026-01-01T00:00:00.000Z',
      dueDate: '2026-01-01T01:00:00.000Z',
      status: 'Unlocked',
      effortMinutes: 10,
      actualWorkSeconds: 0,
      assignee: '自分',
    };

    const invalidCases: Array<{ payload: Record<string, unknown>; message: string }> = [
      { payload: { ...base, title: 123 }, message: 'titleは文字列である必要があります' },
      {
        payload: { ...base, createdAt: 123 },
        message: 'createdAtはISO 8601文字列である必要があります',
      },
      {
        payload: { ...base, startableAt: 123 },
        message: 'startableAtはISO 8601文字列である必要があります',
      },
      {
        payload: { ...base, dueDate: 123 },
        message: 'dueDateはISO 8601文字列である必要があります',
      },
      {
        payload: { ...base, status: 'Unknown' },
        message: 'statusは "Unlocked", "Locked", "Completed" のいずれかである必要があります',
      },
      {
        payload: { ...base, assignee: 'unknown' },
        message: 'assigneeは "自分" または "他人" である必要があります',
      },
      {
        payload: { ...base, effortMinutes: -1 },
        message: 'effortMinutesは0以上の数値である必要があります',
      },
      {
        payload: { ...base, actualWorkSeconds: -1 },
        message: 'actualWorkSecondsは0以上の数値である必要があります',
      },
      {
        payload: { ...base, dependency: { id: 'x' } },
        message: 'dependencyは文字列または文字列配列である必要があります',
      },
      {
        payload: { ...base, taskType: 'InvalidType' },
        message: 'taskTypeは "Normal" または "Meeting" である必要があります',
      },
      {
        payload: {
          ...base,
          startableAt: '2026-01-01T01:00:00.000Z',
          dueDate: '2026-01-01T00:00:00.000Z',
        },
        message: '開始日時は終了日時より前に設定してください',
      },
      {
        payload: {
          ...base,
          startableAt: '2026-01-01T00:00:00.000Z',
          dueDate: '2026-01-01T00:00:00.000Z',
        },
        message: '開始日時は終了日時より前に設定してください',
      },
    ];

    invalidCases.forEach(({ payload, message }) => {
      const json = JSON.stringify([payload]);
      expect(() => todosFromJSON(json)).toThrow(message);
    });
  });

  it('normalizes optional fields in imported todos', () => {
    const json = JSON.stringify([
      {
        id: 'optional-1',
        title: 'optional',
        taskType: 'Normal',
        createdAt: '2026-01-01T00:00:00.000Z',
        startableAt: '2026-01-01T00:00:00.000Z',
        dueDate: '2026-01-01T02:00:00.000Z',
        status: 'Unlocked',
        effortMinutes: 20,
        actualWorkSeconds: 30,
        assignee: '他人',
        dependency: ['', 'dep-1', 100],
        description: 999,
        startedAt: 999,
        completedAt: 999,
      },
      {
        id: 'optional-2',
        title: 'optional2',
        taskType: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        startableAt: '2026-01-01T00:00:00.000Z',
        dueDate: '2026-01-01T02:00:00.000Z',
        status: 'Unlocked',
        effortMinutes: 20,
        actualWorkSeconds: 30,
        assignee: '自分',
        dependency: '',
      },
    ]);

    const parsed = todosFromJSON(json);

    expect(parsed[0].description).toBe('');
    expect(parsed[0].startedAt).toBeUndefined();
    expect(parsed[0].completedAt).toBeUndefined();
    expect(parsed[0].dependency).toEqual(['dep-1']);
    expect(parsed[1].taskType).toBe('Normal');
    expect(parsed[1].dependency).toBeUndefined();
  });

  it('normalizes taskType variants', () => {
    expect(normalizeTaskType(undefined)).toBe(DEFAULT_TASK_TYPE);
    expect(normalizeTaskType('')).toBe(DEFAULT_TASK_TYPE);
    expect(normalizeTaskType('Meeting')).toBe('Meeting');
    expect(() => normalizeTaskType('Unknown')).toThrow(
      'taskTypeは "Normal" または "Meeting" である必要があります',
    );
  });

  it('normalizes meeting todo fields and invalid numbers', () => {
    const meeting = normalizeTodo(
      createTodo({
        taskType: 'Meeting',
        dueDate: '2026-04-04T08:00:00.000Z',
        effortMinutes: 30,
        actualWorkSeconds: 120,
        dependency: ['x'],
      }),
    );

    expect(meeting.status).toBe('Completed');
    expect(meeting.effortMinutes).toBe(0);
    expect(meeting.actualWorkSeconds).toBe(0);
    expect(meeting.dependency).toBeUndefined();

    const normal = normalizeTodo(
      createTodo({
        taskType: 'Normal',
        effortMinutes: Number.NaN,
        actualWorkSeconds: Number.NaN,
      }),
    );

    expect(normal.effortMinutes).toBe(0);
    expect(normal.actualWorkSeconds).toBe(0);

    const finite = normalizeTodo(
      createTodo({
        taskType: 'Normal',
        effortMinutes: 15.5,
        actualWorkSeconds: 61,
      }),
    );

    expect(finite.effortMinutes).toBe(15.5);
    expect(finite.actualWorkSeconds).toBe(61);
  });
});
