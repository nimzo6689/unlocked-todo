import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTranslation } from 'react-i18next';
import { todoDB } from '@/features/todo/model/db';
import type { Todo } from '@/features/todo/model/types';
import { isMeetingTodo, normalizeTodo } from '@/features/todo/model/todo-utils';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { useAppLocale } from '@/shared/i18n/useAppLocale';

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

const getIntlLocale = (locale: 'ja' | 'en') => (locale === 'ja' ? 'ja-JP' : 'en-US');

const formatDateLabel = (date: Date, locale: 'ja' | 'en') => {
  if (locale === 'ja') {
    const weekdayJa = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}(${weekdayJa[date.getDay()]})`;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
};

const formatDateTime = (date: Date, locale: 'ja' | 'en') =>
  new Intl.DateTimeFormat(getIntlLocale(locale), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

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
  const rangeEndMs = rangeStartMs + 7 * DAY_MS;
  const targetMs = target.getTime();

  return targetMs >= rangeStartMs && targetMs < rangeEndMs;
};

const buildRows = (todos: Todo[], baseDateInput: string): PlanActualRow[] => {
  return todos
    .filter(todo => todo.status === 'Completed' && !isMeetingTodo(todo))
    .map(todo => {
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
  locale: 'ja' | 'en',
  t: (key: string, options?: Record<string, unknown>) => string,
): EChartsOption => {
  const isDarkTheme =
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
  const titleColor = isDarkTheme ? '#f8fafc' : '#0f172a';
  const subTitleColor = isDarkTheme ? '#cbd5e1' : '#475569';
  const categories = rows.map(row => row.title);
  const planned = rows.map(row => Number(row.plannedMinutes.toFixed(1)));
  const actual = rows.map(row => Number(row.actualMinutes.toFixed(1)));
  const diff = rows.map(row => Number(row.diffMinutes.toFixed(1)));

  return {
    axisPointer: {
      show: false,
    },
    title: {
      text: t('analytics.chartTitle'),
      subtext: t('analytics.chartSubtext', {
        baseDate: formatDateLabel(new Date(`${baseDateInput}T00:00:00`), locale),
        count: rows.length,
        totalActual: totalActualMinutes.toFixed(1),
        diffPrefix: totalDiffMinutes > 0 ? '+' : '',
        totalDiff: totalDiffMinutes.toFixed(1),
      }),
      left: 'center',
      top: 0,
      textStyle: {
        fontSize: 20,
        fontWeight: 700,
        color: titleColor,
      },
      subtextStyle: {
        fontSize: 12,
        color: subTitleColor,
      },
    },
    legend: {
      top: 54,
      data: [
        t('analytics.legend.planned'),
        t('analytics.legend.actual'),
        t('analytics.legend.diff'),
      ],
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
      formatter: params => {
        const list = Array.isArray(params) ? params : [params];
        const index = list[0]?.dataIndex ?? 0;
        const row = rows[index];
        if (!row) {
          return '';
        }

        const statusLabel =
          row.diffMinutes > 0 ? t('analytics.tooltip.over') : t('analytics.tooltip.within');

        return [
          `<b>${row.title}</b>`,
          `${t('analytics.tooltip.startedAt')}: ${formatDateTime(row.startedAt, locale)}`,
          `${t('analytics.tooltip.planned')}: ${row.plannedMinutes.toFixed(1)} min`,
          `${t('analytics.tooltip.actual')}: ${row.actualMinutes.toFixed(1)} min`,
          `${t('analytics.tooltip.diff')}: ${row.diffMinutes > 0 ? '+' : ''}${row.diffMinutes.toFixed(1)} min`,
          `${t('analytics.tooltip.judgement')}: ${statusLabel}`,
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
        name: t('analytics.yAxis.timeMinutes'),
        splitLine: {
          lineStyle: {
            color: '#e2e8f0',
            type: 'dashed',
          },
        },
      },
      {
        type: 'value',
        name: t('analytics.yAxis.diffMinutes'),
        nameTextStyle: { color: '#475569' },
        position: 'right',
        axisLine: { show: true, lineStyle: { color: '#475569' } },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: t('analytics.legend.planned'),
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: {
          color: '#14b8a6',
          borderRadius: [4, 4, 0, 0],
        },
        data: planned,
      },
      {
        name: t('analytics.legend.actual'),
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: {
          color: '#f59e0b',
          borderRadius: [4, 4, 0, 0],
        },
        data: actual,
      },
      {
        name: t('analytics.legend.diff'),
        type: 'line',
        yAxisIndex: 1,
        data: diff.map(value => ({
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
  const { t } = useTranslation();
  const { locale } = useAppLocale();
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [analyticsTodos, setAnalyticsTodos] = useState<Todo[]>([]);

  const moveSelectedDate = useCallback(
    (deltaDays: number) => {
      const base = new Date(`${selectedDate}T00:00:00`);
      if (Number.isNaN(base.getTime())) {
        return;
      }

      base.setDate(base.getDate() + deltaDays);
      setSelectedDate(toDateInputValue(base));
    },
    [selectedDate],
  );

  useEffect(() => {
    let alive = true;

    const loadAnalyticsTodos = async () => {
      const rangeStart = new Date(`${selectedDate}T00:00:00.000Z`);
      if (Number.isNaN(rangeStart.getTime())) {
        if (alive) {
          setAnalyticsTodos([]);
        }
        return;
      }

      const rangeEnd = new Date(rangeStart.getTime() + 7 * DAY_MS);
      const rows = await todoDB.fetchCompletedByCompletedAt(
        rangeStart.toISOString(),
        rangeEnd.toISOString(),
      );

      if (!alive) {
        return;
      }

      setAnalyticsTodos(rows.map(normalizeTodo));
    };

    void loadAnalyticsTodos();

    return () => {
      alive = false;
    };
  }, [selectedDate]);

  const rows = useMemo(
    () => buildRows(analyticsTodos, selectedDate),
    [analyticsTodos, selectedDate],
  );

  const totalActualMinutes = useMemo(
    () => rows.reduce((sum, row) => sum + row.actualMinutes, 0),
    [rows],
  );

  const totalDiffMinutes = useMemo(
    () => rows.reduce((sum, row) => sum + row.diffMinutes, 0),
    [rows],
  );

  const option = useMemo(
    () => buildChartOption(rows, selectedDate, totalActualMinutes, totalDiffMinutes, locale, t),
    [locale, rows, selectedDate, t, totalActualMinutes, totalDiffMinutes],
  );

  const shortcutRegistration = useMemo(
    () => ({
      pageLabel: t('analytics.pageLabel'),
      shortcuts: [
        {
          id: 'plan-actual-prev-day',
          description: t('analytics.shortcuts.prevDay'),
          category: 'ページ操作' as const,
          bindings: ['h'],
          action: () => moveSelectedDate(-1),
        },
        {
          id: 'plan-actual-next-day',
          description: t('analytics.shortcuts.nextDay'),
          category: 'ページ操作' as const,
          bindings: ['l'],
          action: () => moveSelectedDate(1),
        },
        {
          id: 'plan-actual-today',
          description: t('analytics.shortcuts.today'),
          category: 'ページ操作' as const,
          bindings: ['t'],
          action: () => setSelectedDate(toDateInputValue(new Date())),
        },
      ],
    }),
    [moveSelectedDate, t],
  );

  useRegisterShortcuts(shortcutRegistration);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('analytics.title')}</h1>
          <p className="text-slate-600">{t('analytics.description')}</p>
        </div>

        <label className="text-sm text-slate-700 flex items-center gap-2">
          {t('analytics.startDate')}
          <input
            type="date"
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow">
        {rows.length > 0 ? (
          <ReactECharts
            option={option}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: 400 }}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
            {t('analytics.empty')}
          </p>
        )}
      </section>
    </div>
  );
};
