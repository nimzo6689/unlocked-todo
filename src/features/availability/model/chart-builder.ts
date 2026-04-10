import type { EChartsOption, SeriesOption } from 'echarts';
import { formatMinuteLabel, hasBreakTime } from '@/features/work-schedule/model/settings';
import type { WorkSchedule } from '@/features/todo/model/types';
import { formatTimeLabel } from './datetime-utils';
import { getSortedBreakPeriods } from './schedule-calculator';
import type { AggregatedLoad } from './types';

type ChartTranslator = (key: string, options?: Record<string, unknown>) => string;

export const buildChartOption = (
  { taskSeries, meetingSeries, slotContributors, slotTotals, slots }: AggregatedLoad,
  schedule: WorkSchedule,
  t: ChartTranslator,
): EChartsOption => {
  const hasBreak = hasBreakTime(schedule);
  const sortedBreakPeriods = getSortedBreakPeriods(schedule);
  const xAxisLabels = slots.map(slot => slot.label);
  if (slots.length > 0) {
    xAxisLabels.push(formatTimeLabel(slots[slots.length - 1].end));
  }

  const maxLoad = Math.max(...slotTotals, 0);
  const yAxisMax = Math.max(1.2, Math.ceil(maxLoad * 10) / 10);
  const overloadBase = slotTotals.map(value => (value > 1 ? 1 : 0));
  const overloadOnly = slotTotals.map(value => (value > 1 ? value - 1 : 0));
  const displayMask = slots.map(slot => (slot.isWorking && !slot.isElapsed ? 1 : null));

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
      const values = task.data.map((value, slotIndex) =>
        slots[slotIndex]?.isWorking && !slots[slotIndex]?.isElapsed ? value : null,
      );
      if (values.length === 0) {
        return values;
      }
      return [...values, values[values.length - 1]];
    })(),
  }));

  const taskNames = new Set(taskSeries.map(task => task.title));

  const toTooltipValue = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      const last = value[value.length - 1];
      return typeof last === 'number' && Number.isFinite(last) ? last : 0;
    }

    return 0;
  };

  const totalSeriesIndex = stackedTaskSeries.length + 3;

  return {
    color: palette,
    animationDurationUpdate: 0,
    grid: {
      left: 48,
      right: 56,
      top: 52,
      bottom: 62,
    },
    legend: {
      type: 'scroll',
      bottom: 0,
    },
    tooltip: {
      trigger: 'item',
      axisPointer: { type: 'cross' },
      formatter: params => {
        const list = Array.isArray(params) ? params : [params];
        const index = list[0]?.dataIndex ?? 0;
        const slot = slots[index];
        if (!slot) {
          if (index === slots.length && slots.length > 0) {
            return `${formatTimeLabel(slots[slots.length - 1].end)}<br/>${t('availability.chart.tooltip.endTime')}`;
          }
          return '';
        }

        if (slot.isElapsed) {
          return `${slot.label} - ${formatTimeLabel(slot.end)}<br/>${t('availability.chart.tooltip.elapsedSlot')}`;
        }

        if (!slot.isWorking) {
          return `${slot.label} - ${formatTimeLabel(slot.end)}<br/>${t('availability.chart.tooltip.nonWorkingBreak')}`;
        }

        const details = slotContributors[index]
          .map(item =>
            t('availability.chart.tooltip.taskLoadLine', {
              title: item.title,
              value: item.load.toFixed(2),
            }),
          )
          .join('<br/>');
        const total = slotTotals[index] ?? 0;
        const hasMeeting = (meetingSeries[index] ?? 0) > 0;
        const hovered = Array.isArray(params) ? undefined : params;
        const hoveredSeriesName = typeof hovered?.seriesName === 'string' ? hovered.seriesName : '';
        const isTaskSeries = taskNames.has(hoveredSeriesName);
        const hoveredTaskLoad = toTooltipValue(hovered?.value);

        return [
          `${slot.label} - ${formatTimeLabel(slot.end)}`,
          isTaskSeries
            ? t('availability.chart.tooltip.hoveredTask', {
                title: hoveredSeriesName,
                value: hoveredTaskLoad.toFixed(2),
              })
            : null,
          t('availability.chart.tooltip.totalLoad', { value: total.toFixed(2) }),
          hasMeeting
            ? t('availability.chart.tooltip.meetingPresent', {
                value: (meetingSeries[index] ?? 0).toFixed(2),
              })
            : t('availability.chart.tooltip.meetingNone'),
          details || t('availability.chart.tooltip.noOverlappingTask'),
        ]
          .filter(Boolean)
          .join('<br/>');
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
        data: slots.map(slot => slot.label),
        show: false,
      },
    ],
    yAxis: {
      type: 'value',
      min: 0,
      max: yAxisMax,
      name: t('availability.chart.yAxis.load'),
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
        name: t('availability.chart.series.meeting'),
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
        name: t('availability.chart.series.overloadBase'),
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
        name: t('availability.chart.series.overloadLoad'),
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
        name: t('availability.chart.series.totalLoad'),
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
            position: 'insideEndTop',
            distance: 8,
            formatter: t('availability.chart.limitLine.label'),
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
                formatter: t('availability.chart.breakArea.label'),
              },
              data: sortedBreakPeriods.map(period => [
                { xAxis: formatMinuteLabel(period.startMinute) },
                { xAxis: formatMinuteLabel(period.endMinute) },
              ]),
            }
          : undefined,
      },
    ],
  };
};
