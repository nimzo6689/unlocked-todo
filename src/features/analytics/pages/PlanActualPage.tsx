import { useCallback, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTodoContext } from '@/app/providers/TodoContext';
import type { Todo } from '@/features/todo/model/types';
import { isMeetingTodo } from '@/features/todo/model/todo-utils';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';

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
    .filter((todo) => todo.status === 'Completed' && !isMeetingTodo(todo))
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
  totalDiffMinutes: number,
): EChartsOption => {
  const categories = rows.map((row) => row.title);
  const planned = rows.map((row) => Number(row.plannedMinutes.toFixed(1)));
  const actual = rows.map((row) => Number(row.actualMinutes.toFixed(1)));
  const diff = rows.map((row) => Number(row.diffMinutes.toFixed(1)));

  return {
    axisPointer: {
      show: false,
    },
    title: {
      text: '予実管理',
      subtext: `${formatDateLabel(new Date(`${baseDateInput}T00:00:00`))} 起点7日間 | 完了タスク ${rows.length} 件 | 実績合計 ${totalActualMinutes.toFixed(1)} 分 | 合計差異 ${totalDiffMinutes > 0 ? '+' : ''}${totalDiffMinutes.toFixed(1)} 分`,
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
      right: 64,
      bottom: 68,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        show: false,
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
      axisPointer: {
        show: false,
      },
      axisLabel: {
        interval: 0,
        rotate: 18,
        formatter: (value: string) => (value.length > 14 ? `${value.slice(0, 14)}...` : value),
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '時間 (分)',
        splitLine: {
          lineStyle: {
            color: '#e2e8f0',
            type: 'dashed',
          },
        },
      },
      {
        type: 'value',
        name: '差異 (分)',
        nameTextStyle: { color: '#475569' },
        position: 'right',
        axisLine: { show: true, lineStyle: { color: '#475569' } },
        splitLine: { show: false },
      },
    ],
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
        yAxisIndex: 1,
        data: diff.map((value) => ({
          value,
          itemStyle: {
            color: value > 0 ? '#dc2626' : '#2563eb',
          },
        })),
        symbolSize: 9,
        lineStyle: {
          width: 2,
          color: '#334155',
        },
        markLine: {
          symbol: 'none',
          lineStyle: {
            color: '#64748b',
            type: 'dashed',
            width: 1.5,
          },
          label: {
            show: false,
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
    ],
  };
};

export const PlanActualPage = () => {
  const { todos } = useTodoContext();
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));

  const moveSelectedDate = useCallback((deltaDays: number) => {
    const base = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(base.getTime())) {
      return;
    }

    base.setDate(base.getDate() + deltaDays);
    setSelectedDate(toDateInputValue(base));
  }, [selectedDate]);

  const rows = useMemo(() => buildRows(todos, selectedDate), [todos, selectedDate]);

  const totalActualMinutes = useMemo(
    () => rows.reduce((sum, row) => sum + row.actualMinutes, 0),
    [rows],
  );

  const totalDiffMinutes = useMemo(
    () => rows.reduce((sum, row) => sum + row.diffMinutes, 0),
    [rows],
  );

  const option = useMemo(
    () => buildChartOption(rows, selectedDate, totalActualMinutes, totalDiffMinutes),
    [rows, selectedDate, totalActualMinutes, totalDiffMinutes],
  );

  const shortcutRegistration = useMemo(() => ({
    pageLabel: '予実管理',
    shortcuts: [
      {
        id: 'plan-actual-prev-day',
        description: '集計開始日を前日に移動する',
        category: 'ページ操作' as const,
        bindings: ['h'],
        action: () => moveSelectedDate(-1),
      },
      {
        id: 'plan-actual-next-day',
        description: '集計開始日を翌日に移動する',
        category: 'ページ操作' as const,
        bindings: ['l'],
        action: () => moveSelectedDate(1),
      },
      {
        id: 'plan-actual-today',
        description: '集計開始日を今日に戻す',
        category: 'ページ操作' as const,
        bindings: ['t'],
        action: () => setSelectedDate(toDateInputValue(new Date())),
      },
    ],
  }), [moveSelectedDate]);

  useRegisterShortcuts(shortcutRegistration);

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
          <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height: 400 }} />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
            指定期間内に、表示対象の完了タスクがありません。
          </p>
        )}
      </section>
    </div>
  );
};
