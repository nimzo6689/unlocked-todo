import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTodoContext } from '../contexts/TodoContext';
import type { Todo } from '../common/types';

const DAY_MS = 24 * 60 * 60 * 1000;

const toNonNegativeNumber = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return numeric;
};

type PlanActualRow = {
  id: string;
  title: string;
  startedAt: Date;
  plannedMinutes: number;
  actualMinutes: number;
  diffMinutes: number;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) => {
  const weekdayJa = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}(${weekdayJa[date.getDay()]})`;
};

const formatDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

const parseStartedAt = (todo: Todo) => {
  const startedAt = new Date(todo.startedAt || todo.createdAt);
  if (Number.isNaN(startedAt.getTime())) {
    return null;
  }
  return startedAt;
};

const withinOneWeek = (target: Date, baseDateInput: string) => {
  const rangeStart = new Date(`${baseDateInput}T00:00:00`);
  if (Number.isNaN(rangeStart.getTime())) {
    return false;
  }

  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeStartMs + (7 * DAY_MS);
  const targetMs = target.getTime();

  return targetMs >= rangeStartMs && targetMs < rangeEndMs;
};

const buildRows = (todos: Todo[], baseDateInput: string): PlanActualRow[] => {
  return todos
    .filter((todo) => todo.status === 'Completed')
    .map((todo) => {
      const startedAt = parseStartedAt(todo);
      if (!startedAt) {
        return null;
      }

      if (!withinOneWeek(startedAt, baseDateInput)) {
        return null;
      }

      const plannedMinutes = toNonNegativeNumber(todo.effortMinutes);
      const actualMinutes = toNonNegativeNumber(todo.actualWorkSeconds) / 60;
      const diffMinutes = actualMinutes - plannedMinutes;

      return {
        id: todo.id,
        title: todo.title,
        startedAt,
        plannedMinutes,
        actualMinutes,
        diffMinutes,
      };
    })
    .filter((row): row is PlanActualRow => Boolean(row))
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
};

const buildChartOption = (
  rows: PlanActualRow[],
  baseDateInput: string,
  totalActualMinutes: number,
): EChartsOption => {
  const categories = rows.map((row) => row.title);
  const planned = rows.map((row) => Number(row.plannedMinutes.toFixed(1)));
  const actual = rows.map((row) => Number(row.actualMinutes.toFixed(1)));
  const diff = rows.map((row) => Number(row.diffMinutes.toFixed(1)));

  return {
    title: {
      text: '予実管理',
      subtext: `${formatDateLabel(new Date(`${baseDateInput}T00:00:00`))} 起点7日間 | 完了タスク ${rows.length} 件 | 実績合計 ${totalActualMinutes.toFixed(1)} 分`,
      left: 'center',
      top: 0,
      textStyle: {
        fontSize: 20,
        fontWeight: 700,
        color: '#0f172a',
      },
      subtextStyle: {
        fontSize: 12,
        color: '#475569',
      },
    },
    legend: {
      top: 54,
      data: ['予定工数', '実績時間', '乖離(実績-予定)'],
    },
    grid: {
      top: 100,
      left: 52,
      right: 28,
      bottom: 92,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const index = list[0]?.dataIndex ?? 0;
        const row = rows[index];
        if (!row) {
          return '';
        }

        const statusLabel = row.diffMinutes > 0 ? '超過' : '予定内';

        return [
          `<b>${row.title}</b>`,
          `実作業開始: ${formatDateTime(row.startedAt)}`,
          `予定工数: ${row.plannedMinutes.toFixed(1)} 分`,
          `実績時間: ${row.actualMinutes.toFixed(1)} 分`,
          `乖離: ${row.diffMinutes > 0 ? '+' : ''}${row.diffMinutes.toFixed(1)} 分`,
          `判定: ${statusLabel}`,
        ].join('<br/>');
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        interval: 0,
        rotate: 18,
        formatter: (value: string) => (value.length > 14 ? `${value.slice(0, 14)}...` : value),
      },
    },
    yAxis: {
      type: 'value',
      name: '時間 (分)',
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
      seriesIndex: 2,
      dimension: 1,
      pieces: [
        { gt: 0, color: '#dc2626' },
        { lte: 0, color: '#2563eb' },
      ],
    },
    series: [
      {
        name: '予定工数',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: {
          color: '#14b8a6',
          borderRadius: [4, 4, 0, 0],
        },
        data: planned,
      },
      {
        name: '実績時間',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: {
          color: '#f59e0b',
          borderRadius: [4, 4, 0, 0],
        },
        data: actual,
      },
      {
        name: '乖離(実績-予定)',
        type: 'line',
        data: diff,
        symbolSize: 9,
        lineStyle: {
          width: 2,
        },
        markLine: {
          symbol: 'none',
          lineStyle: {
            color: '#64748b',
            type: 'dashed',
            width: 1.5,
          },
          label: {
            formatter: '差異 0',
            color: '#475569',
          },
          data: [{ yAxis: 0 }],
        },
      },
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        bottom: 30,
        height: 18,
      },
    ],
  };
};

export const PlanActualPage = () => {
  const { todos } = useTodoContext();
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));

  const rows = useMemo(() => buildRows(todos, selectedDate), [todos, selectedDate]);

  const totalActualMinutes = useMemo(
    () => rows.reduce((sum, row) => sum + row.actualMinutes, 0),
    [rows],
  );

  const option = useMemo(
    () => buildChartOption(rows, selectedDate, totalActualMinutes),
    [rows, selectedDate, totalActualMinutes],
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">予実管理</h1>
          <p className="text-slate-600">完了タスクの予定工数と実績時間を、実作業開始日基準で比較します。</p>
        </div>

        <label className="text-sm text-slate-700 flex items-center gap-2">
          集計開始日
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow">
        {rows.length > 0 ? (
          <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height: 520 }} />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
            指定期間内に、表示対象の完了タスクがありません。
          </p>
        )}
      </section>
    </div>
  );
};
