import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption, SeriesOption } from 'echarts';
import { useTodoContext } from '../contexts/TodoContext';
import type { Todo } from '../common/types';

const WORK_START_HOUR = 9;
const WORK_END_HOUR = 21;
const SLOT_MINUTES = 30;
const HOUR_MS = 60 * 60 * 1000;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;

type TimeSlot = {
  label: string;
  start: Date;
  end: Date;
};

type SlotContributor = {
  taskId: string;
  title: string;
  load: number;
};

type AggregatedLoad = {
  slots: TimeSlot[];
  taskSeries: Array<{ id: string; title: string; data: number[] }>;
  slotTotals: number[];
  slotContributors: SlotContributor[][];
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

const getDayWindow = (dateStr: string) => {
  const base = new Date(`${dateStr}T00:00:00`);
  const start = new Date(base);
  const end = new Date(base);
  start.setHours(WORK_START_HOUR, 0, 0, 0);
  end.setHours(WORK_END_HOUR, 0, 0, 0);
  return { start, end };
};

const buildTimeSlots = (start: Date, end: Date) => {
  const slots: TimeSlot[] = [];
  for (let cursor = start.getTime(); cursor < end.getTime(); cursor += SLOT_MS) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + SLOT_MS);
    slots.push({
      label: formatTimeLabel(slotStart),
      start: slotStart,
      end: slotEnd,
    });
  }
  return slots;
};

const parseTaskRange = (todo: Todo) => {
  const start = new Date(todo.startableAt || todo.createdAt);
  const end = new Date(todo.dueDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  if (end.getTime() <= start.getTime() || todo.effortMinutes <= 0) {
    return null;
  }
  return { start, end };
};

const aggregateLoadForDate = (todos: Todo[], dateStr: string): AggregatedLoad => {
  const { start: dayStart, end: dayEnd } = getDayWindow(dateStr);
  const slots = buildTimeSlots(dayStart, dayEnd);
  const slotTotals = Array(slots.length).fill(0) as number[];
  const slotContribMap = Array.from({ length: slots.length }, () => new Map<string, SlotContributor>());
  const seriesMap = new Map<string, { id: string; title: string; data: number[] }>();

  todos.forEach((todo) => {
    const range = parseTaskRange(todo);
    if (!range) return;

    const taskDurationHours = (range.end.getTime() - range.start.getTime()) / HOUR_MS;
    const hourlyLoad = todo.effortMinutes / 60 / taskDurationHours;
    const perSlot = seriesMap.get(todo.id)?.data ?? Array(slots.length).fill(0);

    slots.forEach((slot, index) => {
      const overlapStartMs = Math.max(slot.start.getTime(), range.start.getTime());
      const overlapEndMs = Math.min(slot.end.getTime(), range.end.getTime());
      const overlapMs = overlapEndMs - overlapStartMs;
      if (overlapMs <= 0) return;

      const overlapHours = overlapMs / HOUR_MS;
      const slotHours = (slot.end.getTime() - slot.start.getTime()) / HOUR_MS;
      const load = hourlyLoad * (overlapHours / slotHours);
      if (load <= 0) return;

      perSlot[index] += load;
      slotTotals[index] += load;

      const existing = slotContribMap[index].get(todo.id);
      if (existing) {
        existing.load += load;
      } else {
        slotContribMap[index].set(todo.id, {
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

  const slotContributors = slotContribMap.map((item) =>
    [...item.values()].sort((a, b) => b.load - a.load)
  );

  return {
    slots,
    taskSeries: [...seriesMap.values()],
    slotTotals,
    slotContributors,
  };
};

export const AvailabilityPage = () => {
  const { todos } = useTodoContext();
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));

  const selfTodos = useMemo(
    () => todos.filter((todo) => todo.assignee === '自分'),
    [todos],
  );

  const { slots, taskSeries, slotTotals, slotContributors } = useMemo(
    () => aggregateLoadForDate(selfTodos, selectedDate),
    [selfTodos, selectedDate],
  );

  const hasLoad = useMemo(() => slotTotals.some((value) => value > 0), [slotTotals]);
  const maxLoad = useMemo(() => Math.max(...slotTotals, 0), [slotTotals]);
  const overloadedSlots = useMemo(
    () => slotTotals.filter((value) => value > 1).length,
    [slotTotals],
  );
  const overloadBase = useMemo(
    () => slotTotals.map((value) => (value > 1 ? 1 : 0)),
    [slotTotals],
  );
  const overloadOnly = useMemo(
    () => slotTotals.map((value) => (value > 1 ? value - 1 : 0)),
    [slotTotals],
  );

  const option = useMemo<EChartsOption>(() => {
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
      smooth: 0.2,
      stack: 'load',
      showSymbol: false,
      areaStyle: { opacity: 0.35 },
      lineStyle: { width: 1.5 },
      emphasis: { focus: 'series' },
      color: palette[index % palette.length],
      data: task.data,
    }));

    const totalSeriesIndex = stackedTaskSeries.length;

    return {
      color: palette,
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
            return '';
          }

          const details = slotContributors[index]
            .map((item) => `・${item.title}: ${item.load.toFixed(2)} 人時/h`)
            .join('<br/>');
          const total = slotTotals[index] ?? 0;

          return [
            `${slot.label} - ${formatTimeLabel(slot.end)}`,
            `合計負荷: <b>${total.toFixed(2)} 人時/h</b>`,
            details || '重なりタスクなし',
          ].join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: slots.map((slot) => slot.label),
        axisLabel: {
          interval: 1,
          hideOverlap: true,
        },
      },
      yAxis: {
        type: 'value',
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
          name: '超過ベース',
          type: 'line',
          stack: 'overload',
          silent: true,
          showSymbol: false,
          lineStyle: { opacity: 0 },
          areaStyle: { opacity: 0 },
          tooltip: { show: false },
          data: overloadBase,
        },
        {
          name: '超過負荷',
          type: 'line',
          stack: 'overload',
          silent: true,
          showSymbol: false,
          lineStyle: { opacity: 0 },
          areaStyle: { color: '#fecaca', opacity: 0.7 },
          tooltip: { show: false },
          data: overloadOnly,
        },
        {
          name: '合計負荷',
          type: 'line',
          showSymbol: false,
          smooth: 0.1,
          lineStyle: {
            width: 2,
          },
          data: slotTotals,
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
        },
      ],
    };
  }, [taskSeries, slotContributors, slotTotals, slots, overloadBase, overloadOnly]);

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
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            最大負荷: {maxLoad.toFixed(2)} 人時/h
          </span>
          <span className="rounded-full bg-rose-100 text-rose-700 px-3 py-1">
            上限超過スロット: {overloadedSlots} 件
          </span>
          <span className="text-xs text-slate-500">赤の点線は 1人体制の上限です。</span>
        </div>

        {hasLoad ? (
          <ReactECharts
            option={option}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: 420 }}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
            指定日の業務時間帯 (09:00-21:00) に重なる自分のタスクがありません。
          </p>
        )}
      </div>
    </div>
  );
};
