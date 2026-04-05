import type { Todo, WorkSchedule } from '@/features/todo/model/types';
import { DISPLAY_WINDOW_DAYS, SLOT_MS, type Interval, type TimeSlot } from './types';
import { addDays, formatTimeLabel, toDateInputValue } from './datetime-utils';
import { mergeIntervals, subtractIntervals } from './interval-utils';

export const isWorkingDay = (date: Date, schedule: WorkSchedule) =>
  schedule.workingDays.includes(date.getDay());

export const getSortedBreakPeriods = (schedule: WorkSchedule) =>
  [...schedule.breakPeriods].sort((left, right) =>
    left.startMinute === right.startMinute
      ? left.endMinute - right.endMinute
      : left.startMinute - right.startMinute,
  );

export const buildDisplayDates = (startDateStr: string, schedule: WorkSchedule) => {
  const startDate = new Date(`${startDateStr}T00:00:00`);
  const dates: string[] = [];

  for (let offset = 0; offset < DISPLAY_WINDOW_DAYS; offset += 1) {
    const date = addDays(startDate, offset);
    if (!isWorkingDay(date, schedule)) {
      continue;
    }
    dates.push(toDateInputValue(date));
  }

  return dates;
};

export const buildTimeSlots = (dateStr: string, schedule: WorkSchedule) => {
  const base = new Date(`${dateStr}T00:00:00`);
  const slots: TimeSlot[] = [];
  const dayStart = new Date(base);
  const dayEnd = new Date(base);
  dayStart.setHours(schedule.workStartHour, 0, 0, 0);
  dayEnd.setHours(schedule.workEndHour, 0, 0, 0);

  const mergedBreakIntervals = mergeIntervals(
    schedule.breakPeriods.map(period => {
      const breakStart = new Date(base);
      const breakEnd = new Date(base);
      breakStart.setHours(0, period.startMinute, 0, 0);
      breakEnd.setHours(0, period.endMinute, 0, 0);
      return {
        startMs: breakStart.getTime(),
        endMs: breakEnd.getTime(),
      };
    }),
  );

  for (let cursor = dayStart.getTime(); cursor < dayEnd.getTime(); cursor += SLOT_MS) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + SLOT_MS);
    const slotAvailableIntervals = subtractIntervals(
      { startMs: slotStart.getTime(), endMs: slotEnd.getTime() },
      mergedBreakIntervals,
    );
    const isWorking = slotAvailableIntervals.some(interval => interval.endMs > interval.startMs);

    slots.push({
      label: formatTimeLabel(slotStart),
      start: slotStart,
      end: slotEnd,
      isWorking,
      isElapsed: false,
    });
  }

  return slots;
};

const getTaskRange = (todo: Todo, options?: { allowZeroEffort?: boolean }) => {
  const start = new Date(todo.startableAt || todo.createdAt);
  const end = new Date(todo.dueDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const shouldCheckEffort = !options?.allowZeroEffort;
  if (end.getTime() <= start.getTime() || (shouldCheckEffort && todo.effortMinutes <= 0)) {
    return null;
  }

  return { start, end };
};

export const parseTaskRange = getTaskRange;

export const getWorkingIntervalsForDay = (day: Date, schedule: WorkSchedule): Interval[] => {
  const workStart = new Date(day);
  const workEnd = new Date(day);

  workStart.setHours(schedule.workStartHour, 0, 0, 0);
  workEnd.setHours(schedule.workEndHour, 0, 0, 0);

  const mergedBreakIntervals = mergeIntervals(
    schedule.breakPeriods.map(period => {
      const breakStart = new Date(day);
      const breakEnd = new Date(day);
      breakStart.setHours(0, period.startMinute, 0, 0);
      breakEnd.setHours(0, period.endMinute, 0, 0);
      return {
        startMs: breakStart.getTime(),
        endMs: breakEnd.getTime(),
      };
    }),
  );

  return subtractIntervals(
    { startMs: workStart.getTime(), endMs: workEnd.getTime() },
    mergedBreakIntervals,
  );
};

export const getMeetingIntervalsForDay = (day: Date, meetings: Todo[]) => {
  const dayStart = new Date(day);
  const dayEnd = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  dayEnd.setHours(23, 59, 59, 999);

  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  return mergeIntervals(
    meetings
      .map(meeting => parseTaskRange(meeting, { allowZeroEffort: true }))
      .filter((range): range is { start: Date; end: Date } => Boolean(range))
      .map(range => ({
        startMs: Math.max(range.start.getTime(), dayStartMs),
        endMs: Math.min(range.end.getTime(), dayEndMs),
      }))
      .filter(interval => interval.endMs > interval.startMs),
  );
};

export const calculateWorkingDurationMsInRange = (
  range: { start: Date; end: Date },
  schedule: WorkSchedule,
  meetings: Todo[],
) => {
  const startDay = new Date(range.start);
  const endDay = new Date(range.end);
  startDay.setHours(0, 0, 0, 0);
  endDay.setHours(0, 0, 0, 0);

  let totalMs = 0;

  for (let day = startDay; day.getTime() <= endDay.getTime(); day = addDays(day, 1)) {
    if (!isWorkingDay(day, schedule)) {
      continue;
    }

    const meetingIntervals = getMeetingIntervalsForDay(day, meetings);
    const workingIntervals = getWorkingIntervalsForDay(day, schedule);

    workingIntervals.forEach(interval => {
      const availableIntervals = subtractIntervals(interval, meetingIntervals);

      availableIntervals.forEach(availableInterval => {
        const overlapStartMs = Math.max(availableInterval.startMs, range.start.getTime());
        const overlapEndMs = Math.min(availableInterval.endMs, range.end.getTime());
        const overlapMs = overlapEndMs - overlapStartMs;

        if (overlapMs > 0) {
          totalMs += overlapMs;
        }
      });
    });
  }

  return totalMs;
};

export const buildWorkingDateRange = (start: Date, end: Date, schedule: WorkSchedule) => {
  const startDay = new Date(start);
  const endDay = new Date(end);
  startDay.setHours(0, 0, 0, 0);
  endDay.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  for (let day = startDay; day.getTime() <= endDay.getTime(); day = addDays(day, 1)) {
    if (!isWorkingDay(day, schedule)) {
      continue;
    }
    dates.push(toDateInputValue(day));
  }

  return dates;
};
