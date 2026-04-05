import type { TooltipComponentFormatterCallbackParams } from 'echarts';
import type { WorkSchedule } from '@/features/todo/model/types';
import type { AggregatedLoad } from '../types';
import { buildChartOption } from '../chart-builder';

const schedule: WorkSchedule = {
  workingDays: [1, 2, 3, 4, 5],
  workStartHour: 9,
  workEndHour: 17,
  breakPeriods: [{ startMinute: 12 * 60, endMinute: 13 * 60 }],
};

const baseLoad = (): AggregatedLoad => {
  const start = new Date('2026-04-06T09:00:00');
  const end = new Date('2026-04-06T09:30:00');

  return {
    slots: [
      {
        label: '09:00',
        start,
        end,
        isWorking: true,
        isElapsed: false,
      },
    ],
    taskSeries: [
      {
        id: 'task-1',
        title: '設計レビュー',
        data: [0.6],
      },
      {
        id: 'task-2',
        title: '実装',
        data: [0.4],
      },
    ],
    meetingSeries: [0],
    slotTotals: [1],
    slotContributors: [[
      { taskId: 'task-1', title: '設計レビュー', load: 0.6 },
      { taskId: 'task-2', title: '実装', load: 0.4 },
    ]],
  };
};

describe('buildChartOption tooltip', () => {
  it('shows hovered task load in tooltip for task series', () => {
    const option = buildChartOption(baseLoad(), schedule);
    const tooltip = option.tooltip;
    expect(tooltip).toBeDefined();
    expect(Array.isArray(tooltip)).toBe(false);
    const formatter = (tooltip as { formatter: (params: TooltipComponentFormatterCallbackParams) => string }).formatter;

    const tooltipText = formatter({
      dataIndex: 0,
      seriesName: '設計レビュー',
      value: 0.6,
    } as TooltipComponentFormatterCallbackParams);

    expect(tooltipText).toContain('ホバー中: <b>設計レビュー</b> 0.60 人時/h');
    expect(tooltipText).toContain('合計負荷: <b>1.00 人時/h</b>');
    expect(tooltipText).toContain('・設計レビュー: 0.60 人時/h');
  });

  it('does not show hovered task line for total-load series', () => {
    const option = buildChartOption(baseLoad(), schedule);
    const tooltip = option.tooltip;
    expect(tooltip).toBeDefined();
    expect(Array.isArray(tooltip)).toBe(false);
    const formatter = (tooltip as { formatter: (params: TooltipComponentFormatterCallbackParams) => string }).formatter;

    const tooltipText = formatter({
      dataIndex: 0,
      seriesName: '合計負荷',
      value: 1,
    } as TooltipComponentFormatterCallbackParams);

    expect(tooltipText).not.toContain('ホバー中:');
    expect(tooltipText).toContain('合計負荷: <b>1.00 人時/h</b>');
  });
});
