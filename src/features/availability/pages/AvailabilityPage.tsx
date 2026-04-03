import { useCallback, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption, SeriesOption } from 'echarts';
import { useTodoContext } from '@/app/providers/TodoContext';
import type { Todo, WorkSchedule } from '@/features/todo/model/types';
import { formatHourLabel, formatMinuteLabel, hasBreakTime, WEEKDAY_OPTIONS } from '@/features/work-schedule/model/settings';
import { isMeetingTodo } from '@/features/todo/model/todo-utils';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';

const SLOT_MINUTES = 30;
const LOAD_BUFFER_MINUTES = 5;
const DISPLAY_WINDOW_DAYS = 7;
const HOUR_MS = 60 * 60 * 1000;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;

type TimeSlot = {
  label: string;
  start: Date;
  end: Date;
  isWorking: boolean;
};

type Interval = {
  startMs: number;
  endMs: number;
};

type SlotContributor = {
  taskId: string;
  title: string;
  load: number;
};

type DatedTimeSlot = TimeSlot & {
  dateStr: string;
};

type AggregatedLoad = {
  slots: TimeSlot[];
  taskSeries: Array<{ id: string; title: string; data: number[] }>;
  meetingSeries: number[];
  slotTotals: number[];
  slotContributors: SlotContributor[][];
};

type AvailabilityChartData = AggregatedLoad & {
  option: EChartsOption;
  hasLoad: boolean;
  maxLoad: number;
  overloadedSlots: number;
  dateLabel: string;
};

const areAvailabilityTodosEqual = (left: Todo[], right: Todo[]) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((todo, index) => {
    const other = right[index];
    return Boolean(other)
      && todo.id === other.id
      && todo.title === other.title
      && todo.taskType === other.taskType
      && todo.createdAt === other.createdAt
      && todo.startableAt === other.startableAt
      && todo.dueDate === other.dueDate
      && todo.status === other.status
      && todo.effortMinutes === other.effortMinutes
      && todo.assignee === other.assignee;
  });
};

const useStableAvailabilityTodos = (todos: Todo[]) => {
  const stableRef = useRef(todos);

  return useMemo(() => {
    if (!areAvailabilityTodosEqual(stableRef.current, todos)) {
      stableRef.current = todos;
    }

    return stableRef.current;
  }, [todos]);
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeLabel = (date: Date) => {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatDateLabel = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  const weekdayJa = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}(${weekdayJa[date.getDay()]})`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isWorkingDay = (date: Date, schedule: WorkSchedule) => schedule.workingDays.includes(date.getDay());

const getSortedBreakPeriods = (schedule: WorkSchedule) =>
  [...schedule.breakPeriods].sort((left, right) =>
    left.startMinute === right.startMinute
      ? left.endMinute - right.endMinute
      : left.startMinute - right.startMinute,
  );

const buildDisplayDates = (startDateStr: string, schedule: WorkSchedule) => {
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

const buildTimeSlots = (dateStr: string, schedule: WorkSchedule) => {
  const base = new Date(`${dateStr}T00:00:00`);
  const slots: TimeSlot[] = [];
  const dayStart = new Date(base);
  const dayEnd = new Date(base);
  dayStart.setHours(schedule.workStartHour, 0, 0, 0);
  dayEnd.setHours(schedule.workEndHour, 0, 0, 0);

  const mergedBreakIntervals = mergeIntervals(
    schedule.breakPeriods.map((period) => {
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
    const isWorking = slotAvailableIntervals.some((interval) => interval.endMs > interval.startMs);

    slots.push({
      label: formatTimeLabel(slotStart),
      start: slotStart,
      end: slotEnd,
      isWorking,
    });
  }

  return slots;
};

const getWorkingIntervalsForDay = (day: Date, schedule: WorkSchedule): Interval[] => {
  const workStart = new Date(day);
  const workEnd = new Date(day);

  workStart.setHours(schedule.workStartHour, 0, 0, 0);
  workEnd.setHours(schedule.workEndHour, 0, 0, 0);

  const mergedBreakIntervals = mergeIntervals(
    schedule.breakPeriods.map((period) => {
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

const mergeIntervals = (intervals: Interval[]) => {
  if (intervals.length === 0) {
    return [] as Interval[];
  }

  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  return sorted.reduce<Interval[]>((merged, interval) => {
    const last = merged[merged.length - 1];
    if (!last || interval.startMs > last.endMs) {
      merged.push({ ...interval });
      return merged;
    }

    last.endMs = Math.max(last.endMs, interval.endMs);
    return merged;
  }, []);
};

const subtractIntervals = (base: Interval, blocked: Interval[]) => {
  if (base.endMs <= base.startMs) {
    return [] as Interval[];
  }

  let segments: Interval[] = [base];

  blocked.forEach((block) => {
    segments = segments.flatMap((segment) => {
      if (block.endMs <= segment.startMs || block.startMs >= segment.endMs) {
        return [segment];
      }

      const nextSegments: Interval[] = [];
      if (block.startMs > segment.startMs) {
        nextSegments.push({ startMs: segment.startMs, endMs: block.startMs });
      }
      if (block.endMs < segment.endMs) {
        nextSegments.push({ startMs: block.endMs, endMs: segment.endMs });
      }
      return nextSegments;
    });
  });

  return segments.filter((segment) => segment.endMs > segment.startMs);
};

const getMeetingIntervalsForDay = (day: Date, meetings: Todo[]) => {
  const dayStart = new Date(day);
  const dayEnd = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  dayEnd.setHours(23, 59, 59, 999);

  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  return mergeIntervals(
    meetings
      .map((meeting) => parseTaskRange(meeting, { allowZeroEffort: true }))
      .filter((range): range is { start: Date; end: Date } => Boolean(range))
      .map((range) => ({
        startMs: Math.max(range.start.getTime(), dayStartMs),
        endMs: Math.min(range.end.getTime(), dayEndMs),
      }))
      .filter((interval) => interval.endMs > interval.startMs),
  );
};

const calculateWorkingDurationMsInRange = (
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

    workingIntervals.forEach((interval) => {
      const availableIntervals = subtractIntervals(interval, meetingIntervals);

      availableIntervals.forEach((availableInterval) => {
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

const buildWorkingDateRange = (
  start: Date,
  end: Date,
  schedule: WorkSchedule,
) => {
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

const buildGlobalSlots = (dateStrs: string[], schedule: WorkSchedule): DatedTimeSlot[] =>
  dateStrs.flatMap((dateStr) =>
    buildTimeSlots(dateStr, schedule).map((slot) => ({
      ...slot,
      dateStr,
    }))
  );

const allocateTaskEffortAcrossSlots = (
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
      allocatedHours[overlapIndex] = Math.min(high * item.overlapHours, capacities[overlapIndex] ?? 0);
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

const aggregateLoadForDates = (
  todos: Todo[],
  meetings: Todo[],
  displayDates: string[],
  schedule: WorkSchedule,
): Record<string, AggregatedLoad> => {
  const parsedTaskRanges = todos
    .map((todo) => {
      const range = parseTaskRange(todo);
      return range ? { todo, range } : null;
    })
    .filter((item): item is { todo: Todo; range: { start: Date; end: Date } } => Boolean(item));

  const parsedMeetingRanges = meetings
    .map((meeting) => {
      const range = parseTaskRange(meeting, { allowZeroEffort: true });
      return range ? { meeting, range } : null;
    })
    .filter((item): item is { meeting: Todo; range: { start: Date; end: Date } } => Boolean(item));

  const rangeCandidates = [
    ...displayDates.map((dateStr) => new Date(`${dateStr}T00:00:00`)),
    ...parsedTaskRanges.flatMap(({ range }) => [range.start, range.end]),
    ...parsedMeetingRanges.flatMap(({ range }) => [range.start, range.end]),
  ];

  const rangeStart = new Date(Math.min(...rangeCandidates.map((date) => date.getTime())));
  const rangeEnd = new Date(Math.max(...rangeCandidates.map((date) => date.getTime())));
  const allWorkingDates = buildWorkingDateRange(rangeStart, rangeEnd, schedule);
  const globalSlots = buildGlobalSlots(allWorkingDates, schedule);
  const meetingIntervalsByDate = new Map(
    allWorkingDates.map((dateStr) => [
      dateStr,
      getMeetingIntervalsForDay(new Date(`${dateStr}T00:00:00`), meetings),
    ])
  );

  const globalSlotTotals = Array(globalSlots.length).fill(0) as number[];
  const globalMeetingSeries = globalSlots.map((slot) => {
    if (!slot.isWorking) {
      return 0;
    }

    const meetingIntervals = meetingIntervalsByDate.get(slot.dateStr) ?? [];
    if (!slot.isWorking) {
      return 0;
    }

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
  const globalSlotContribMap = Array.from({ length: globalSlots.length }, () => new Map<string, SlotContributor>());
  const seriesMap = new Map<string, { id: string; title: string; data: number[] }>();

  const sortedTodos = sortTasksByPriority(todos, schedule, meetings);

  sortedTodos.forEach(({ todo }) => {
    const range = parseTaskRange(todo);
    if (!range) return;

    const effectiveWorkingDurationMs = calculateWorkingDurationMsInRange(range, schedule, meetings);
    if (effectiveWorkingDurationMs <= 0) return;

    const bufferedEffortMinutes = todo.effortMinutes + LOAD_BUFFER_MINUTES;
    const effortHours = bufferedEffortMinutes / 60;
    const perSlot = seriesMap.get(todo.id)?.data ?? Array(globalSlots.length).fill(0);
    const overlaps = globalSlots.flatMap((slot, index) => {
      if (!slot.isWorking) {
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

      perSlot[index] += load;
      globalSlotTotals[index] += load;

      const existing = globalSlotContribMap[index].get(todo.id);
      if (existing) {
        existing.load += load;
      } else {
        globalSlotContribMap[index].set(todo.id, {
          taskId: todo.id,
          title: todo.title,
          load,
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
    displayDates.map((dateStr) => {
      const indices = dateToIndices.get(dateStr) ?? [];
      const slots = indices.map((index) => ({
        label: globalSlots[index].label,
        start: globalSlots[index].start,
        end: globalSlots[index].end,
        isWorking: globalSlots[index].isWorking,
      }));
      const meetingSeries = indices.map((index) => globalMeetingSeries[index] ?? 0);
      const slotTotals = indices.map((index) => globalSlotTotals[index] ?? 0);
      const slotContributors = indices.map((index) =>
        [...(globalSlotContribMap[index]?.values() ?? [])].sort((a, b) => b.load - a.load)
      );
      const taskSeries = [...seriesMap.values()]
        .map((task) => ({
          ...task,
          data: indices.map((index) => task.data[index] ?? 0),
        }))
        .filter((task) => task.data.some((value) => value > 0));

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
    })
  );
};

const parseTaskRange = (todo: Todo, options?: { allowZeroEffort?: boolean }) => {
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

type TaskWithPriority = {
  todo: Todo;
  workingDurationMs: number;
};

const sortTasksByPriority = (
  todos: Todo[],
  schedule: WorkSchedule,
  meetings: Todo[],
): TaskWithPriority[] => {
  return todos
    .map((todo) => {
      const range = parseTaskRange(todo);
      if (!range) return null;

      const workingDurationMs = calculateWorkingDurationMsInRange(range, schedule, meetings);
      return { todo, workingDurationMs };
    })
    .filter((item): item is TaskWithPriority => item !== null)
    .sort((a, b) => {
      // Primary: shorter working duration first (ascending)
      if (a.workingDurationMs !== b.workingDurationMs) {
        return a.workingDurationMs - b.workingDurationMs;
      }
      // Secondary: earlier start time first (ascending)
      const aStart = new Date(a.todo.startableAt || a.todo.createdAt).getTime();
      const bStart = new Date(b.todo.startableAt || b.todo.createdAt).getTime();
      return aStart - bStart;
    });
};

const buildChartOption = ({
  taskSeries,
  meetingSeries,
  slotContributors,
  slotTotals,
  slots,
}: AggregatedLoad, schedule: WorkSchedule): EChartsOption => {
  const hasBreak = hasBreakTime(schedule);
  const sortedBreakPeriods = getSortedBreakPeriods(schedule);
  const xAxisLabels = slots.map((slot) => slot.label);
  if (slots.length > 0) {
    xAxisLabels.push(formatTimeLabel(slots[slots.length - 1].end));
  }

  const maxLoad = Math.max(...slotTotals, 0);
  const yAxisMax = Math.max(1.2, Math.ceil(maxLoad * 10) / 10);
  const overloadBase = slotTotals.map((value) => (value > 1 ? 1 : 0));
  const overloadOnly = slotTotals.map((value) => (value > 1 ? value - 1 : 0));
  const displayMask = slots.map((slot) => (slot.isWorking ? 1 : null));

  const palette = [
    '#0ea5e9',
    '#22c55e',
    '#f59e0b',
    '#6366f1',
    '#14b8a6',
    '#ef4444',
    '#84cc16',
    '#06b6d4',
  ];

  const stackedTaskSeries: SeriesOption[] = taskSeries.map((task, index) => ({
    name: task.title,
    type: 'line',
    smooth: false,
    step: 'end',
    stack: 'load',
    showSymbol: false,
    areaStyle: { opacity: 0.35 },
    lineStyle: { width: 1.5 },
    emphasis: { focus: 'series' },
    color: palette[index % palette.length],
    data: (() => {
      const values = task.data.map((value, slotIndex) => (slots[slotIndex]?.isWorking ? value : null));
      if (values.length === 0) {
        return values;
      }
      return [...values, values[values.length - 1]];
    })(),
  }));

  const totalSeriesIndex = stackedTaskSeries.length + 3;

  return {
    color: palette,
    animationDurationUpdate: 0,
    grid: {
      left: 48,
      right: 28,
      top: 52,
      bottom: 62,
    },
    legend: {
      type: 'scroll',
      bottom: 0,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const index = list[0]?.dataIndex ?? 0;
        const slot = slots[index];
        if (!slot) {
          if (index === slots.length && slots.length > 0) {
            return `${formatTimeLabel(slots[slots.length - 1].end)}<br/>終了時刻`;
          }
          return '';
        }

        if (!slot.isWorking) {
          return `${slot.label} - ${formatTimeLabel(slot.end)}<br/>この時間は非稼働（休憩時間）です`;
        }

        const details = slotContributors[index]
          .map((item) => `・${item.title}: ${item.load.toFixed(2)} 人時/h`)
          .join('<br/>');
        const total = slotTotals[index] ?? 0;
        const hasMeeting = (meetingSeries[index] ?? 0) > 0;

        return [
          `${slot.label} - ${formatTimeLabel(slot.end)}`,
          `合計負荷: <b>${total.toFixed(2)} 人時/h</b>`,
          hasMeeting ? 'Meeting: <b>1.00</b> (非稼働)' : 'Meeting: なし',
          details || '重なりタスクなし',
        ].join('<br/>');
      },
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: xAxisLabels,
        axisLabel: {
          interval: 1,
          hideOverlap: true,
        },
      },
      {
        type: 'category',
        boundaryGap: true,
        data: slots.map((slot) => slot.label),
        show: false,
      },
    ],
    yAxis: {
      type: 'value',
      min: 0,
      max: yAxisMax,
      name: '負荷量 (人時/h)',
      axisLabel: {
        formatter: '{value}',
      },
      splitLine: {
        lineStyle: {
          color: '#e2e8f0',
          type: 'dashed',
        },
      },
    },
    visualMap: {
      type: 'piecewise',
      show: false,
      dimension: 1,
      seriesIndex: totalSeriesIndex,
      pieces: [
        { lte: 1, color: '#0f766e' },
        { gt: 1, color: '#dc2626' },
      ],
    },
    series: [
      ...stackedTaskSeries,
      {
        name: 'Meeting',
        type: 'bar',
        xAxisIndex: 1,
        barWidth: '100%',
        itemStyle: {
          color: '#9ca3af',
          opacity: 0.75,
        },
        data: meetingSeries.map((value, index) => (displayMask[index] ? value : null)),
        z: 2,
      },
      {
        name: '超過ベース',
        type: 'line',
        step: 'end',
        stack: 'overload',
        silent: true,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        tooltip: { show: false },
        data: (() => {
          const values = overloadBase.map((value, index) => (displayMask[index] ? value : null));
          if (values.length === 0) {
            return values;
          }
          return [...values, values[values.length - 1]];
        })(),
      },
      {
        name: '超過負荷',
        type: 'line',
        step: 'end',
        stack: 'overload',
        silent: true,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { color: '#fecaca', opacity: 0.7 },
        tooltip: { show: false },
        data: (() => {
          const values = overloadOnly.map((value, index) => (displayMask[index] ? value : null));
          if (values.length === 0) {
            return values;
          }
          return [...values, values[values.length - 1]];
        })(),
      },
      {
        name: '合計負荷',
        type: 'line',
        showSymbol: false,
        smooth: false,
        step: 'end',
        lineStyle: {
          width: 2,
        },
        data: (() => {
          const values = slotTotals.map((value, index) => (displayMask[index] ? value : null));
          if (values.length === 0) {
            return values;
          }
          return [...values, values[values.length - 1]];
        })(),
        z: 4,
        markLine: {
          symbol: 'none',
          lineStyle: {
            color: '#dc2626',
            width: 2,
            type: 'dashed',
          },
          label: {
            formatter: '上限 1.0',
            color: '#b91c1c',
          },
          data: [{ yAxis: 1 }],
        },
        markArea: hasBreak
          ? {
              silent: true,
              itemStyle: {
                color: '#f1f5f9',
              },
              label: {
                show: true,
                color: '#475569',
                formatter: '休憩時間',
              },
              data: sortedBreakPeriods.map((period) => [
                { xAxis: formatMinuteLabel(period.startMinute) },
                { xAxis: formatMinuteLabel(period.endMinute) },
              ]),
            }
          : undefined,
      },
    ],
  };
};

export const AvailabilityPage = () => {
  const { todos, workSchedule } = useTodoContext();
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const moveSelectedDate = useCallback((deltaDays: number) => {
    const base = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(base.getTime())) {
      return;
    }

    base.setDate(base.getDate() + deltaDays);
    setSelectedDate(toDateInputValue(base));
  }, [selectedDate]);
  const hasBreak = hasBreakTime(workSchedule);
  const sortedBreakPeriods = getSortedBreakPeriods(workSchedule);
  const businessHourText = hasBreak
    ? `${formatHourLabel(workSchedule.workStartHour)}-${formatHourLabel(workSchedule.workEndHour)}（休憩: ${sortedBreakPeriods
      .map((period) => `${formatMinuteLabel(period.startMinute)}-${formatMinuteLabel(period.endMinute)}`)
      .join(', ')}）`
    : `${formatHourLabel(workSchedule.workStartHour)}-${formatHourLabel(workSchedule.workEndHour)} (休憩なし)`;

  const filteredSelfNormalTodos = useMemo(
    () => todos.filter((todo) => todo.assignee === '自分' && !isMeetingTodo(todo)),
    [todos],
  );
  const selfNormalTodos = useStableAvailabilityTodos(filteredSelfNormalTodos);

  const filteredSelfMeetings = useMemo(
    () => todos.filter((todo) => todo.assignee === '自分' && isMeetingTodo(todo) && todo.status !== 'Completed'),
    [todos],
  );
  const selfMeetings = useStableAvailabilityTodos(filteredSelfMeetings);

  const displayDates = useMemo(
    () => buildDisplayDates(selectedDate, workSchedule),
    [selectedDate, workSchedule],
  );

  const availabilityCharts = useMemo<AvailabilityChartData[]>(
    () => {
      const loadsByDate = aggregateLoadForDates(selfNormalTodos, selfMeetings, displayDates, workSchedule);

      return displayDates.map((dateStr) => {
        const load = loadsByDate[dateStr] ?? {
          slots: buildTimeSlots(dateStr, workSchedule),
          taskSeries: [],
          meetingSeries: buildTimeSlots(dateStr, workSchedule).map(() => 0),
          slotTotals: buildTimeSlots(dateStr, workSchedule).map(() => 0),
          slotContributors: buildTimeSlots(dateStr, workSchedule).map(() => []),
        };
        const hasLoad =
          load.slotTotals.some((value) => value > 0) ||
          load.meetingSeries.some((value) => value > 0);
        const maxLoad = Math.max(...load.slotTotals, 0);
        const overloadedSlots = load.slotTotals.filter((value) => value > 1).length;

        return {
          ...load,
          hasLoad,
          maxLoad,
          overloadedSlots,
          dateLabel: formatDateLabel(dateStr),
          option: buildChartOption(load, workSchedule),
        };
      });
    },
    [displayDates, selfMeetings, selfNormalTodos, workSchedule],
  );

  const shortcutRegistration = useMemo(() => ({
    pageLabel: '空き状況',
    shortcuts: [
      {
        id: 'availability-prev-day',
        description: '表示開始日を前日に移動する',
        category: 'ページ操作' as const,
        bindings: ['h'],
        action: () => moveSelectedDate(-1),
      },
      {
        id: 'availability-next-day',
        description: '表示開始日を翌日に移動する',
        category: 'ページ操作' as const,
        bindings: ['l'],
        action: () => moveSelectedDate(1),
      },
      {
        id: 'availability-today',
        description: '表示開始日を今日に戻す',
        category: 'ページ操作' as const,
        bindings: ['t'],
        action: () => setSelectedDate(toDateInputValue(new Date())),
      },
    ],
  }), [moveSelectedDate]);

  useRegisterShortcuts(shortcutRegistration);

  const workingDayLabels = WEEKDAY_OPTIONS.filter((option) => workSchedule.workingDays.includes(option.value))
    .map((option) => option.label)
    .join('・');

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">空き状況</h1>
          <p className="text-slate-600">
            担当「自分」のタスクを 30分単位で積み上げ表示しています。
          </p>
        </div>

        <label className="text-sm text-slate-700 flex items-center gap-2">
          対象日
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
      </header>

      <div className="bg-white rounded-lg shadow p-4 border border-slate-200 space-y-4">
        <p className="text-sm text-slate-600">
          表示期間: {formatDateLabel(selectedDate)} から 7 日間（稼働日のみ表示）
        </p>

        {availabilityCharts.length > 0 ? (
          <div className="space-y-6">
            {availabilityCharts.map((chart) => (
              <section key={chart.dateLabel} className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900">{chart.dateLabel}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    最大負荷: {chart.maxLoad.toFixed(2)} 人時/h
                  </span>
                  <span className="rounded-full bg-rose-100 text-rose-700 px-3 py-1">
                    上限超過スロット: {chart.overloadedSlots} 件
                  </span>
                  <span className="text-xs text-slate-500">赤の点線は 1人体制の上限です。</span>
                </div>

                {chart.hasLoad ? (
                  <ReactECharts
                    option={chart.option}
                    notMerge
                    lazyUpdate
                    style={{ width: '100%', height: 400 }}
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                    {chart.dateLabel} の業務時間帯 ({businessHourText}) に重なる自分のタスクがありません。
                  </p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
            指定期間内に描画対象の稼働日がありません。
          </p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 space-y-1">
        <p className="font-semibold text-slate-700">稼働時間について</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>稼働日は {workingDayLabels} を対象としています。</li>
          <li>
            稼働時間帯は
            {' '}
            <span className="font-mono">{businessHourText.replace(',', ' /')}</span>
            {' '}
            です。
          </li>
          <li>負荷は 30 分単位のスロットに分割して集計しています。</li>
          <li>各タスクの負荷は、開始可能日時〜期限のうち稼働可能な時間帯に均等配分して計算しています。</li>
          <li>Meeting は休憩時間と同様に非稼働時間として除外しています。</li>
          <li>担当が「自分」に設定されている通常タスクのみが負荷集計対象です。</li>
        </ul>
      </div>
    </div>
  );
};
