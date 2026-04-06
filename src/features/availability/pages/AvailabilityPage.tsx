import { useCallback, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTodoContext } from '@/app/providers/TodoContext';
import {
  formatHourLabel,
  formatMinuteLabel,
  hasBreakTime,
  WEEKDAY_OPTIONS,
} from '@/features/work-schedule/model/settings';
import { isMeetingTodo } from '@/features/todo/model/todo-utils';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { useAvailabilityCharts } from '@/features/availability/hooks/useAvailabilityCharts';
import { useStableAvailabilityTodos } from '@/features/availability/hooks/useStableAvailabilityTodos';
import { formatDateLabel, toDateInputValue } from '@/features/availability/model/datetime-utils';
import {
  buildDisplayDates,
  getSortedBreakPeriods,
} from '@/features/availability/model/schedule-calculator';

export const AvailabilityPage = () => {
  const { todos, workSchedule } = useTodoContext();
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
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
  const businessHourText = hasBreak
    ? `${formatHourLabel(workSchedule.workStartHour)}-${formatHourLabel(workSchedule.workEndHour)}（休憩: ${sortedBreakPeriods
        .map(
          period =>
            `${formatMinuteLabel(period.startMinute)}-${formatMinuteLabel(period.endMinute)}`,
        )
        .join(', ')}）`
    : `${formatHourLabel(workSchedule.workStartHour)}-${formatHourLabel(workSchedule.workEndHour)} (休憩なし)`;

  const filteredSelfNormalTodos = useMemo(
    () => todos.filter(todo => !isMeetingTodo(todo) && todo.status !== 'Completed'),
    [todos],
  );
  const selfNormalTodos = useStableAvailabilityTodos(filteredSelfNormalTodos);

  const filteredSelfMeetings = useMemo(
    () => todos.filter(todo => isMeetingTodo(todo) && todo.status !== 'Completed'),
    [todos],
  );
  const selfMeetings = useStableAvailabilityTodos(filteredSelfMeetings);

  const displayDates = useMemo(
    () => buildDisplayDates(selectedDate, workSchedule),
    [selectedDate, workSchedule],
  );

  const availabilityCharts = useAvailabilityCharts(
    displayDates,
    selfNormalTodos,
    selfMeetings,
    workSchedule,
  );

  const shortcutRegistration = useMemo(
    () => ({
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
    }),
    [moveSelectedDate],
  );

  useRegisterShortcuts(shortcutRegistration);

  const workingDayLabels = WEEKDAY_OPTIONS.filter(option =>
    workSchedule.workingDays.includes(option.value),
  )
    .map(option => option.label)
    .join('・');

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">空き状況</h1>
          <p className="text-slate-600">タスクを 30分単位で積み上げ表示しています。</p>
        </div>

        <label className="text-sm text-slate-700 flex items-center gap-2">
          対象日
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
          表示期間: {formatDateLabel(selectedDate)} から 7 日間（稼働日のみ表示）
        </p>

        {availabilityCharts.length > 0 ? (
          <div className="space-y-6">
            {availabilityCharts.map(chart => (
              <section
                key={chart.dateLabel}
                className="space-y-3 rounded-lg border border-slate-200 p-4"
              >
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
                    {chart.dateLabel} の業務時間帯 ({businessHourText}) に重なるタスクがありません。
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
            稼働時間帯は <span className="font-mono">{businessHourText.replace(',', ' /')}</span>{' '}
            です。
          </li>
          <li>負荷は 30 分単位のスロットに分割して集計しています。</li>
          <li>
            各タスクの負荷は、開始可能日時〜期限のうち稼働可能な時間帯に均等配分して計算しています。
          </li>
          <li>Meeting は休憩時間と同様に非稼働時間として除外しています。</li>
        </ul>
      </div>
    </div>
  );
};
