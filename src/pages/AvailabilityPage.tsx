import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption, SeriesOption } from 'echarts';
import { useTodoContext } from '../contexts/TodoContext';
import type { Todo, WorkSchedule } from '../common/types';
import { formatHourLabel, WEEKDAY_OPTIONS } from '../common/settings';

const SLOT_MINUTES = 30;
const DISPLAY_WINDOW_DAYS = 7;
const HOUR_MS = 60 * 60 * 1000;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;

type TimeSlot = {
  label: string;
  start: Date;
  end: Date;
  isWorking: boolean;
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

type AvailabilityChartData = AggregatedLoad & {
  option: EChartsOption;
  hasLoad: boolean;
  maxLoad: number;
  overloadedSlots: number;
  dateLabel: string;
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

  for (let cursor = dayStart.getTime(); cursor < dayEnd.getTime(); cursor += SLOT_MS) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + SLOT_MS);
    const isWorking =
      slotStart.getHours() < schedule.breakStartHour || slotStart.getHours() >= schedule.breakEndHour;

    slots.push({
      label: formatTimeLabel(slotStart),
      start: slotStart,
      end: slotEnd,
      isWorking,
    });
  }

  return slots;
};

const calculateWorkingDurationMsInRange = (
  range: { start: Date; end: Date },
  schedule: WorkSchedule,
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

    const workStart = new Date(day);
    const breakStart = new Date(day);
    const breakEnd = new Date(day);
    const workEnd = new Date(day);

    workStart.setHours(schedule.workStartHour, 0, 0, 0);
    breakStart.setHours(schedule.breakStartHour, 0, 0, 0);
    breakEnd.setHours(schedule.breakEndHour, 0, 0, 0);
    workEnd.setHours(schedule.workEndHour, 0, 0, 0);

    const workingIntervals = [
      { startMs: workStart.getTime(), endMs: breakStart.getTime() },
      { startMs: breakEnd.getTime(), endMs: workEnd.getTime() },
    ];

    workingIntervals.forEach((interval) => {
      if (interval.endMs <= interval.startMs) {
        return;
      }

      const overlapStartMs = Math.max(interval.startMs, range.start.getTime());
      const overlapEndMs = Math.min(interval.endMs, range.end.getTime());
      const overlapMs = overlapEndMs - overlapStartMs;

      if (overlapMs > 0) {
        totalMs += overlapMs;
      }
    });
  }

  return totalMs;
};

const aggregateLoadForDate = (
  todos: Todo[],
  dateStr: string,
  schedule: WorkSchedule,
): AggregatedLoad => {
  const slots = buildTimeSlots(dateStr, schedule);
  const slotTotals = Array(slots.length).fill(0) as number[];
  const slotContribMap = Array.from({ length: slots.length }, () => new Map<string, SlotContributor>());
  const seriesMap = new Map<string, { id: string; title: string; data: number[] }>();

  todos.forEach((todo) => {
    const range = parseTaskRange(todo);
    if (!range) return;

    const effectiveWorkingDurationMs = calculateWorkingDurationMsInRange(range, schedule);
    if (effectiveWorkingDurationMs <= 0) return;

    const hourlyLoad = todo.effortMinutes / (effectiveWorkingDurationMs / (60 * 1000));
    const perSlot = seriesMap.get(todo.id)?.data ?? Array(slots.length).fill(0);

    slots.forEach((slot, index) => {
      if (!slot.isWorking) return;

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

const buildChartOption = ({
  taskSeries,
  slotContributors,
  slotTotals,
  slots,
}: AggregatedLoad, schedule: WorkSchedule): EChartsOption => {
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
      data: xAxisLabels,
      axisLabel: {
        interval: 1,
        hideOverlap: true,
      },
    },
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
        markArea: {
          silent: true,
          itemStyle: {
            color: '#f1f5f9',
          },
          label: {
            show: true,
            color: '#475569',
            formatter: `${formatHourLabel(schedule.breakStartHour)}-${formatHourLabel(schedule.breakEndHour)} 非稼働`,
          },
          data: [[{ xAxis: formatHourLabel(schedule.breakStartHour) }, { xAxis: formatHourLabel(schedule.breakEndHour) }]],
        },
      },
    ],
  };
};

export const AvailabilityPage = () => {
  const { todos, workSchedule } = useTodoContext();
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));

  const selfTodos = useMemo(
    () => todos.filter((todo) => todo.assignee === '自分'),
    [todos],
  );

  const displayDates = useMemo(
    () => buildDisplayDates(selectedDate, workSchedule),
    [selectedDate, workSchedule],
  );

  const availabilityCharts = useMemo<AvailabilityChartData[]>(
    () =>
      displayDates.map((dateStr) => {
        const load = aggregateLoadForDate(selfTodos, dateStr, workSchedule);
        const hasLoad = load.slotTotals.some((value) => value > 0);
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
      }),
    [displayDates, selfTodos, workSchedule],
  );

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
                    style={{ width: '100%', height: 420 }}
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                    {chart.dateLabel} の業務時間帯 ({formatHourLabel(workSchedule.workStartHour)}-{formatHourLabel(workSchedule.breakStartHour)}, {formatHourLabel(workSchedule.breakEndHour)}-{formatHourLabel(workSchedule.workEndHour)}) に重なる自分のタスクがありません。
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
          <li>稼働時間帯は <span className="font-mono">{formatHourLabel(workSchedule.workStartHour)}〜{formatHourLabel(workSchedule.breakStartHour)}</span> と <span className="font-mono">{formatHourLabel(workSchedule.breakEndHour)}〜{formatHourLabel(workSchedule.workEndHour)}</span> です。</li>
          <li>負荷は 30 分単位のスロットに分割して集計しています。</li>
          <li>各タスクの負荷は、開始可能日時〜期限のうち稼働可能な時間帯に均等配分して計算しています。</li>
          <li>担当が「自分」に設定されているタスクのみが集計対象です。</li>
        </ul>
      </div>
    </div>
  );
};
