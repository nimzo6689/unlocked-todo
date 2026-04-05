import type { Todo, WorkSchedule } from '@/features/todo/model/types';
import {
  HOUR_MS,
  SLOT_MS,
  type AggregatedLoad,
  type DatedTimeSlot,
  type SlotContributor,
} from './types';
import { subtractIntervals } from './interval-utils';
import {
  buildTimeSlots,
  buildWorkingDateRange,
  calculateWorkingDurationMsInRange,
  getMeetingIntervalsForDay,
  parseTaskRange,
} from './schedule-calculator';

type TaskWithPriority = {
  todo: Todo;
  workingDurationMs: number;
};

const STARTED_WORK_THRESHOLD_SECONDS = 1;
const AVAILABILITY_LOAD_BUFFER_MINUTES = 5;

const toFiniteNumber = (value: number) => (Number.isFinite(value) ? value : 0);

const toRemainingEffortMinutes = (todo: Todo) => {
  const plannedMinutes = Math.max(0, toFiniteNumber(todo.effortMinutes));
  const bufferedPlannedMinutes = plannedMinutes + AVAILABILITY_LOAD_BUFFER_MINUTES;
  const actualSeconds = Math.max(0, toFiniteNumber(todo.actualWorkSeconds));

  if (actualSeconds < STARTED_WORK_THRESHOLD_SECONDS) {
    return bufferedPlannedMinutes;
  }

  const actualMinutes = actualSeconds / 60;
  return Math.max(0, bufferedPlannedMinutes - actualMinutes);
};

const buildGlobalSlots = (dateStrs: string[], schedule: WorkSchedule): DatedTimeSlot[] =>
  dateStrs.flatMap(dateStr =>
    buildTimeSlots(dateStr, schedule).map(slot => ({
      ...slot,
      dateStr,
    })),
  );

export const sortTasksByPriority = (
  todos: Todo[],
  schedule: WorkSchedule,
  meetings: Todo[],
): TaskWithPriority[] => {
  return todos
    .filter(todo => todo.status !== 'Completed')
    .map(todo => {
      const range = parseTaskRange(todo);
      if (!range) return null;

      const workingDurationMs = calculateWorkingDurationMsInRange(range, schedule, meetings);
      return { todo, workingDurationMs };
    })
    .filter((item): item is TaskWithPriority => item !== null)
    .sort((a, b) => {
      if (a.workingDurationMs !== b.workingDurationMs) {
        return a.workingDurationMs - b.workingDurationMs;
      }

      const aStart = new Date(a.todo.startableAt || a.todo.createdAt).getTime();
      const bStart = new Date(b.todo.startableAt || b.todo.createdAt).getTime();
      return aStart - bStart;
    });
};

export const allocateTaskEffortAcrossSlots = (
  overlaps: Array<{ index: number; overlapHours: number; slotHours: number }>,
  slotTotals: number[],
  effortHours: number,
) => {
  if (overlaps.length === 0 || effortHours <= 0) {
    return new Map<number, number>();
  }

  const capacities = overlaps.map(({ index, overlapHours, slotHours }) => {
    const residualLoad = Math.max(1 - (slotTotals[index] ?? 0), 0);
    const cappedCapacityHours = Math.min(residualLoad * slotHours, overlapHours);
    return cappedCapacityHours;
  });

  const totalAvailableHours = overlaps.reduce((total, item) => total + item.overlapHours, 0);
  const totalCappedCapacityHours = capacities.reduce((total, value) => total + value, 0);
  const allocatedHours = Array(overlaps.length).fill(0) as number[];

  if (effortHours <= totalCappedCapacityHours) {
    let low = 0;
    let high = 1;

    for (let iteration = 0; iteration < 40; iteration += 1) {
      const mid = (low + high) / 2;
      const allocated = overlaps.reduce((total, item, overlapIndex) => {
        const capped = capacities[overlapIndex] ?? 0;
        return total + Math.min(mid * item.overlapHours, capped);
      }, 0);

      if (allocated >= effortHours) {
        high = mid;
      } else {
        low = mid;
      }
    }

    overlaps.forEach((item, overlapIndex) => {
      allocatedHours[overlapIndex] = Math.min(
        high * item.overlapHours,
        capacities[overlapIndex] ?? 0,
      );
    });
  } else {
    overlaps.forEach((_, overlapIndex) => {
      allocatedHours[overlapIndex] = capacities[overlapIndex] ?? 0;
    });

    const remainingHours = effortHours - totalCappedCapacityHours;
    const extraRate = totalAvailableHours > 0 ? remainingHours / totalAvailableHours : 0;

    overlaps.forEach((item, overlapIndex) => {
      allocatedHours[overlapIndex] += extraRate * item.overlapHours;
    });
  }

  return overlaps.reduce((result, item, overlapIndex) => {
    result.set(item.index, allocatedHours[overlapIndex] ?? 0);
    return result;
  }, new Map<number, number>());
};

export const aggregateLoadForDates = (
  todos: Todo[],
  meetings: Todo[],
  displayDates: string[],
  schedule: WorkSchedule,
): Record<string, AggregatedLoad> => {
  const now = new Date();
  const currentSlotStartMs = Math.floor(now.getTime() / SLOT_MS) * SLOT_MS;

  const parsedTaskRanges = todos
    .filter(todo => todo.status !== 'Completed')
    .map(todo => {
      const range = parseTaskRange(todo);
      return range ? { todo, range } : null;
    })
    .filter((item): item is { todo: Todo; range: { start: Date; end: Date } } => Boolean(item));

  const parsedMeetingRanges = meetings
    .map(meeting => {
      const range = parseTaskRange(meeting, { allowZeroEffort: true });
      return range ? { meeting, range } : null;
    })
    .filter((item): item is { meeting: Todo; range: { start: Date; end: Date } } => Boolean(item));

  const rangeCandidates = [
    ...displayDates.map(dateStr => new Date(`${dateStr}T00:00:00`)),
    ...parsedTaskRanges.flatMap(({ range }) => [range.start, range.end]),
    ...parsedMeetingRanges.flatMap(({ range }) => [range.start, range.end]),
  ];

  const rangeStart = new Date(Math.min(...rangeCandidates.map(date => date.getTime())));
  const rangeEnd = new Date(Math.max(...rangeCandidates.map(date => date.getTime())));
  const allWorkingDates = buildWorkingDateRange(rangeStart, rangeEnd, schedule);
  const globalSlots = buildGlobalSlots(allWorkingDates, schedule).map(slot => ({
    ...slot,
    isElapsed: slot.end.getTime() <= currentSlotStartMs,
  }));
  const meetingIntervalsByDate = new Map(
    allWorkingDates.map(dateStr => [
      dateStr,
      getMeetingIntervalsForDay(new Date(`${dateStr}T00:00:00`), meetings),
    ]),
  );

  const globalSlotTotals = Array(globalSlots.length).fill(0) as number[];
  const globalMeetingSeries = globalSlots.map(slot => {
    if (!slot.isWorking || slot.isElapsed) {
      return 0;
    }

    const meetingIntervals = meetingIntervalsByDate.get(slot.dateStr) ?? [];
    const slotStartMs = slot.start.getTime();
    const slotEndMs = slot.end.getTime();
    const overlapMs = meetingIntervals.reduce((total, meetingInterval) => {
      const overlapStart = Math.max(slotStartMs, meetingInterval.startMs);
      const overlapEnd = Math.min(slotEndMs, meetingInterval.endMs);
      const duration = overlapEnd - overlapStart;
      return duration > 0 ? total + duration : total;
    }, 0);

    return overlapMs > 0 ? 1 : 0;
  });
  const globalSlotContribMap = Array.from(
    { length: globalSlots.length },
    () => new Map<string, SlotContributor>(),
  );
  const seriesMap = new Map<string, { id: string; title: string; data: number[] }>();

  const sortedTodos = sortTasksByPriority(todos, schedule, meetings);

  sortedTodos.forEach(({ todo }) => {
    const range = parseTaskRange(todo);
    if (!range) return;

    const effectiveWorkingDurationMs = calculateWorkingDurationMsInRange(range, schedule, meetings);
    if (effectiveWorkingDurationMs <= 0) return;

    const effortHours = toRemainingEffortMinutes(todo) / 60;
    if (effortHours <= 0) {
      return;
    }

    const perSlot = seriesMap.get(todo.id)?.data ?? Array(globalSlots.length).fill(0);
    const overlaps = globalSlots.flatMap((slot, index) => {
      if (!slot.isWorking || slot.isElapsed) {
        return [] as Array<{ index: number; overlapHours: number; slotHours: number }>;
      }

      const meetingIntervals = meetingIntervalsByDate.get(slot.dateStr) ?? [];
      const overlapStartMs = Math.max(slot.start.getTime(), range.start.getTime());
      const overlapEndMs = Math.min(slot.end.getTime(), range.end.getTime());
      const availableIntervals = subtractIntervals(
        { startMs: overlapStartMs, endMs: overlapEndMs },
        meetingIntervals,
      );
      const overlapMs = availableIntervals.reduce(
        (total, interval) => total + (interval.endMs - interval.startMs),
        0,
      );
      if (overlapMs <= 0) {
        return [] as Array<{ index: number; overlapHours: number; slotHours: number }>;
      }

      const overlapHours = overlapMs / HOUR_MS;
      const slotHours = (slot.end.getTime() - slot.start.getTime()) / HOUR_MS;
      return [{ index, overlapHours, slotHours }];
    });

    const allocatedEffortBySlot = allocateTaskEffortAcrossSlots(
      overlaps,
      globalSlotTotals,
      effortHours,
    );

    allocatedEffortBySlot.forEach((allocatedHours, index) => {
      const slot = globalSlots[index];
      if (!slot) {
        return;
      }

      const slotHours = (slot.end.getTime() - slot.start.getTime()) / HOUR_MS;
      const load = slotHours > 0 ? allocatedHours / slotHours : 0;
      if (load <= 0) {
        return;
      }

      const normalizedLoad = toFiniteNumber(load);
      perSlot[index] = toFiniteNumber(perSlot[index] + normalizedLoad);
      globalSlotTotals[index] = toFiniteNumber(globalSlotTotals[index] + normalizedLoad);

      const existing = globalSlotContribMap[index].get(todo.id);
      if (existing) {
        existing.load = toFiniteNumber(existing.load + normalizedLoad);
      } else {
        globalSlotContribMap[index].set(todo.id, {
          taskId: todo.id,
          title: todo.title,
          load: normalizedLoad,
        });
      }
    });

    seriesMap.set(todo.id, {
      id: todo.id,
      title: todo.title,
      data: perSlot,
    });
  });

  const dateToIndices = new Map<string, number[]>();
  globalSlots.forEach((slot, index) => {
    const indices = dateToIndices.get(slot.dateStr) ?? [];
    indices.push(index);
    dateToIndices.set(slot.dateStr, indices);
  });

  return Object.fromEntries(
    displayDates.map(dateStr => {
      const indices = dateToIndices.get(dateStr) ?? [];
      const slots = indices.map(index => ({
        label: globalSlots[index].label,
        start: globalSlots[index].start,
        end: globalSlots[index].end,
        isWorking: globalSlots[index].isWorking,
        isElapsed: globalSlots[index].isElapsed,
      }));
      const meetingSeries = indices.map(index => toFiniteNumber(globalMeetingSeries[index] ?? 0));
      const slotTotals = indices.map(index => toFiniteNumber(globalSlotTotals[index] ?? 0));
      const slotContributors = indices.map(index =>
        [...(globalSlotContribMap[index]?.values() ?? [])]
          .map(item => ({ ...item, load: toFiniteNumber(item.load) }))
          .sort((a, b) => b.load - a.load),
      );
      const taskSeries = [...seriesMap.values()]
        .map(task => ({
          ...task,
          data: indices.map(index => toFiniteNumber(task.data[index] ?? 0)),
        }))
        .filter(task => task.data.some(value => value > 0));

      return [
        dateStr,
        {
          slots,
          taskSeries,
          meetingSeries,
          slotTotals,
          slotContributors,
        },
      ];
    }),
  );
};
