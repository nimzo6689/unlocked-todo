import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTranslation } from 'react-i18next';
import { useTodoContext } from '@/app/providers/TodoContext';
import {
  formatHourLabel,
  formatMinuteLabel,
  getWeekdayOptions,
  hasBreakTime,
} from '@/features/work-schedule/model/settings';
import { isMeetingTodo, normalizeTodo } from '@/features/todo/model/todo-utils';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { useAvailabilityCharts } from '@/features/availability/hooks/useAvailabilityCharts';
import { useStableAvailabilityTodos } from '@/features/availability/hooks/useStableAvailabilityTodos';
import { formatDateLabel, toDateInputValue } from '@/features/availability/model/datetime-utils';
import {
  buildDisplayDates,
  getSortedBreakPeriods,
} from '@/features/availability/model/schedule-calculator';
import { todoDB } from '@/features/todo/model/db';
import type { Todo } from '@/features/todo/model/types';
import { useAppLocale } from '@/shared/i18n/useAppLocale';

export const AvailabilityPage = () => {
  const { workSchedule } = useTodoContext();
  const { t } = useTranslation();
  const { locale } = useAppLocale();
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [availabilityTodos, setAvailabilityTodos] = useState<Todo[]>([]);
  const chartSectionRefs = useRef<Array<HTMLElement | null>>([]);
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
  const hasBreak = hasBreakTime(workSchedule);
  const sortedBreakPeriods = getSortedBreakPeriods(workSchedule);
  const businessHourRange = `${formatHourLabel(workSchedule.workStartHour, locale)}-${formatHourLabel(workSchedule.workEndHour, locale)}`;
  const breakLabels = sortedBreakPeriods
    .map(
      period =>
        `${formatMinuteLabel(period.startMinute, locale)}-${formatMinuteLabel(period.endMinute, locale)}`,
    )
    .join(', ');
  const businessHourText = hasBreak
    ? `${businessHourRange} (${t('availability.breakLabel')}: ${breakLabels})`
    : `${businessHourRange} (${t('availability.noBreakLabel')})`;

  const displayDates = useMemo(
    () => buildDisplayDates(selectedDate, workSchedule),
    [selectedDate, workSchedule],
  );

  useEffect(() => {
    let alive = true;

    const loadWeeklyTodos = async () => {
      if (displayDates.length === 0) {
        if (alive) {
          setAvailabilityTodos([]);
        }
        return;
      }

      const weekStart = `${displayDates[0]}T00:00:00.000Z`;
      const weekEnd = `${displayDates[displayDates.length - 1]}T23:59:59.999Z`;
      const rows = await todoDB.fetchForAvailability(weekStart, weekEnd);

      if (!alive) {
        return;
      }

      setAvailabilityTodos(rows.map(normalizeTodo));
    };

    void loadWeeklyTodos();

    return () => {
      alive = false;
    };
  }, [displayDates]);

  const filteredSelfNormalTodos = useMemo(
    () => availabilityTodos.filter(todo => !isMeetingTodo(todo) && todo.status !== 'Completed'),
    [availabilityTodos],
  );
  const selfNormalTodos = useStableAvailabilityTodos(filteredSelfNormalTodos);

  const filteredSelfMeetings = useMemo(
    () => availabilityTodos.filter(todo => isMeetingTodo(todo) && todo.status !== 'Completed'),
    [availabilityTodos],
  );
  const selfMeetings = useStableAvailabilityTodos(filteredSelfMeetings);

  const availabilityCharts = useAvailabilityCharts(
    displayDates,
    selfNormalTodos,
    selfMeetings,
    workSchedule,
  );

  const focusChartSection = useCallback((index: number) => {
    const target = chartSectionRefs.current[index];
    if (!target) {
      return;
    }

    target.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    target.focus();
  }, []);

  const focusChartShortcuts = useMemo(
    () =>
      availabilityCharts.map((chart, index) => ({
        id: `availability-focus-chart-${index + 1}`,
        description: t('availability.shortcuts.focusChart', { dateLabel: chart.dateLabel }),
        category: 'ページ操作' as const,
        bindings: [`${index + 1}`],
        keys: [`${index + 1}`],
        action: () => focusChartSection(index),
      })),
    [availabilityCharts, focusChartSection, t],
  );

  const shortcutRegistration = useMemo(
    () => ({
      pageLabel: t('availability.pageLabel'),
      shortcuts: [
        {
          id: 'availability-prev-day',
          description: t('availability.shortcuts.prevDay'),
          category: 'ページ操作' as const,
          bindings: ['h'],
          action: () => moveSelectedDate(-1),
        },
        {
          id: 'availability-next-day',
          description: t('availability.shortcuts.nextDay'),
          category: 'ページ操作' as const,
          bindings: ['l'],
          action: () => moveSelectedDate(1),
        },
        {
          id: 'availability-today',
          description: t('availability.shortcuts.today'),
          category: 'ページ操作' as const,
          bindings: ['t'],
          action: () => setSelectedDate(toDateInputValue(new Date())),
        },
        ...focusChartShortcuts,
      ],
    }),
    [focusChartShortcuts, moveSelectedDate, t],
  );

  useRegisterShortcuts(shortcutRegistration);

  const workingDayLabels = getWeekdayOptions(locale)
    .filter(option => workSchedule.workingDays.includes(option.value))
    .map(option => option.label)
    .join(locale === 'ja' ? '・' : ', ');

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {t('availability.title')}
          </h1>
          <p className="text-slate-600">{t('availability.description')}</p>
        </div>

        <label className="text-sm text-slate-700 flex items-center gap-2">
          {t('availability.targetDate')}
          <input
            type="date"
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
      </header>

      <div className="bg-white rounded-lg shadow p-4 border border-slate-200 space-y-4">
        <p className="text-sm text-slate-600">
          {t('availability.rangeLabel', { start: formatDateLabel(selectedDate) })}
        </p>

        {availabilityCharts.length > 0 ? (
          <div className="space-y-6">
            {availabilityCharts.map((chart, index) => (
              <section
                key={chart.dateLabel}
                ref={node => {
                  chartSectionRefs.current[index] = node;
                }}
                data-testid={`availability-chart-section-${index + 1}`}
                tabIndex={-1}
                className="space-y-3 rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900">{chart.dateLabel}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {t('availability.maxLoad', { value: chart.maxLoad.toFixed(2) })}
                  </span>
                  <span className="rounded-full bg-rose-100 text-rose-700 px-3 py-1">
                    {t('availability.overloadedSlots', { count: chart.overloadedSlots })}
                  </span>
                  <span className="text-xs text-slate-500">{t('availability.limitHint')}</span>
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
                    {t('availability.noLoadInBusinessHours', {
                      date: chart.dateLabel,
                      businessHourText,
                    })}
                  </p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
            {t('availability.noRenderableWorkingDays')}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 space-y-1">
        <p className="font-semibold text-slate-700">{t('availability.workHoursTitle')}</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>{t('availability.workDays', { days: workingDayLabels })}</li>
          <li>
            {t('availability.workRange', {
              businessHours: businessHourText.replace(',', ' /'),
            })}
          </li>
          <li>{t('availability.slotSummary')}</li>
          <li>{t('availability.distributionSummary')}</li>
          <li>{t('availability.meetingExcluded')}</li>
        </ul>
      </div>
    </div>
  );
};
