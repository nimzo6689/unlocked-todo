import type {
  RecurringTaskDefinition,
  RecurringTaskUnit,
  Todo,
  TodoTaskType,
} from '@/features/todo/model/types';
import { DEFAULT_EFFORT_MINUTES, getMeetingStatus } from '@/features/todo/model/todo-utils';

const HORIZON_DAYS = 14;

const addMonthsClamped = (base: Date, months: number) => {
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();

  const monthStart = new Date(Date.UTC(year, month + months, 1));
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const clampedDay = Math.min(day, monthEnd.getUTCDate());

  return new Date(
    Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      clampedDay,
      base.getUTCHours(),
      base.getUTCMinutes(),
      base.getUTCSeconds(),
      base.getUTCMilliseconds(),
    ),
  );
};

const addByUnit = (base: Date, value: number, unit: RecurringTaskUnit) => {
  const next = new Date(base);

  if (unit === 'day') {
    next.setUTCDate(next.getUTCDate() + value);
    return next;
  }

  if (unit === 'week') {
    next.setUTCDate(next.getUTCDate() + value * 7);
    return next;
  }

  return addMonthsClamped(next, value);
};

export const resolveRecurringDueDate = (
  startableAtIso: string,
  firstStartAtIso: string,
  firstDueAtIso: string,
): string => {
  const firstStart = new Date(firstStartAtIso);
  const firstDue = new Date(firstDueAtIso);
  const startableAt = new Date(startableAtIso);

  if (
    Number.isNaN(firstStart.getTime()) ||
    Number.isNaN(firstDue.getTime()) ||
    Number.isNaN(startableAt.getTime())
  ) {
    return startableAtIso;
  }

  const graceMs = Math.max(0, firstDue.getTime() - firstStart.getTime());
  return new Date(startableAt.getTime() + graceMs).toISOString();
};

export const expandRecurringStartTimes = (
  definition: RecurringTaskDefinition,
  fromInclusive: Date,
  toInclusive: Date,
): string[] => {
  const start = new Date(definition.startAt);
  const end = definition.endAt ? new Date(definition.endAt) : null;

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(fromInclusive.getTime()) ||
    Number.isNaN(toInclusive.getTime())
  ) {
    return [];
  }

  if (end && Number.isNaN(end.getTime())) {
    return [];
  }

  if (definition.interval <= 0) {
    return [];
  }

  const result: string[] = [];
  let cursor = new Date(start);

  while (cursor.getTime() <= toInclusive.getTime()) {
    if (end && cursor.getTime() > end.getTime()) {
      break;
    }

    if (cursor.getTime() >= fromInclusive.getTime()) {
      result.push(cursor.toISOString());
    }

    cursor = addByUnit(cursor, definition.interval, definition.unit);
  }

  return result;
};

const resolveEffortMinutes = (taskType: TodoTaskType, effortMinutes: number) => {
  if (taskType === 'Meeting') {
    return 0;
  }

  return Number.isFinite(effortMinutes) && effortMinutes > 0
    ? Math.floor(effortMinutes)
    : DEFAULT_EFFORT_MINUTES;
};

export const buildTodoFromRecurring = (
  definition: RecurringTaskDefinition,
  startableAtIso: string,
): Todo => {
  const dueDate = resolveRecurringDueDate(
    startableAtIso,
    definition.startAt,
    definition.firstDueAt,
  );
  const taskType = definition.taskType;

  return {
    id: crypto.randomUUID(),
    title: definition.title,
    description: definition.description,
    taskType,
    createdAt: new Date().toISOString(),
    startableAt: startableAtIso,
    dueDate,
    status: taskType === 'Meeting' ? getMeetingStatus(dueDate) : 'Unlocked',
    effortMinutes: resolveEffortMinutes(taskType, definition.effortMinutes),
    actualWorkSeconds: 0,
  };
};

export const getRecurringHorizonRange = (baseDate = new Date()) => {
  const from = new Date(baseDate);
  from.setUTCHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + HORIZON_DAYS);
  to.setUTCHours(23, 59, 59, 999);

  return { from, to };
};
