import { useMemo } from 'react';
import { Clock3, Plus, Save, Trash2 } from 'lucide-react';
import { useTodoContext } from '../contexts/TodoContext';
import {
  formatMinuteLabel,
  formatHourLabel,
  formatWorkScheduleSummary,
  normalizeBreakPeriods,
  WEEKDAY_OPTIONS,
} from '../common/settings';
import { useRegisterShortcuts } from '../contexts/ShortcutContext';
import { useWorkHoursDraft } from '../hooks/useWorkHoursDraft';

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, index) => index);

const formatTimeInputValue = (minuteOfDay: number) => formatMinuteLabel(minuteOfDay);

const parseTimeInputValue = (value: string) => {
  const [hourText = '0', minuteText = '0'] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 24 || minute < 0 || minute >= 60) {
    return null;
  }

  if (hour === 24 && minute !== 0) {
    return null;
  }

  return hour * 60 + minute;
};

export const WorkHoursPage = () => {
  const { workSchedule, setWorkSchedule } = useTodoContext();
  const {
    draft,
    error,
    hasNoBreak,
    updateDraft,
    toggleNoBreak,
    toggleWorkingDay,
    addBreakPeriod,
    removeBreakPeriod,
    updateBreakPeriod,
    handleSave,
  } = useWorkHoursDraft(workSchedule, setWorkSchedule);

  const shortcutRegistration = useMemo(() => ({
    pageLabel: '稼働設定',
    shortcuts: [
      {
        id: 'work-hours-save',
        description: '稼働設定を保存する',
        category: 'ページ操作' as const,
        bindings: ['mod+enter'],
        action: handleSave,
        allowInInput: true,
      },
      {
        id: 'work-hours-toggle-break',
        description: '休憩時間なしを切り替える',
        category: 'ページ操作' as const,
        bindings: ['b'],
        action: () => toggleNoBreak(!hasNoBreak),
      },
      ...WEEKDAY_OPTIONS.map((option, index) => ({
        id: `work-hours-day-${option.value}`,
        description: `${option.label} を稼働日に切り替える`,
        category: 'ページ操作' as const,
        bindings: [`${index + 1}`],
        action: () => toggleWorkingDay(option.value),
      })),
    ],
  }), [hasNoBreak, draft]);

  useRegisterShortcuts(shortcutRegistration);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Settings</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">稼働設定</h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          空き状況グラフで使用する稼働日の範囲と勤務時間を設定します。保存すると、空き状況ページの表示にすぐ反映されます。
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          <Clock3 size={16} />
          現在の設定: {formatWorkScheduleSummary(workSchedule)}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">稼働日</h2>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((option) => {
                  const selected = draft.workingDays.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleWorkingDay(option.value)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasNoBreak}
                    onChange={(event) => toggleNoBreak(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="font-medium">休憩時間なし</span>
                </label>
              </div>

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">開始時刻</span>
                <select
                  value={draft.workStartHour}
                  onChange={(event) =>
                    updateDraft((current) => {
                      const nextWorkStartHour = Number(event.target.value);
                      return {
                        ...current,
                        workStartHour: nextWorkStartHour,
                        breakPeriods: normalizeBreakPeriods(
                          current.breakPeriods,
                          nextWorkStartHour,
                          current.workEndHour,
                        ),
                      };
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  {HOUR_OPTIONS.slice(0, 24).map((hour) => (
                    <option key={hour} value={hour}>
                      {formatHourLabel(hour)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">終了時刻</span>
                <select
                  value={draft.workEndHour}
                  onChange={(event) =>
                    updateDraft((current) => {
                      const nextWorkEndHour = Number(event.target.value);
                      return {
                        ...current,
                        workEndHour: nextWorkEndHour,
                        breakPeriods: normalizeBreakPeriods(
                          current.breakPeriods,
                          current.workStartHour,
                          nextWorkEndHour,
                        ),
                      };
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  {HOUR_OPTIONS.slice(1).map((hour) => (
                    <option key={hour} value={hour}>
                      {formatHourLabel(hour)}
                    </option>
                  ))}
                </select>
              </label>

              {!hasNoBreak && (
                <div className="sm:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">休憩時間</p>
                    <button
                      type="button"
                      onClick={addBreakPeriod}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <Plus size={14} />
                      休憩を追加
                    </button>
                  </div>

                  {draft.breakPeriods.map((period, index) => (
                    <div
                      key={`${period.startMinute}-${period.endMinute}-${index}`}
                      className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <label className="space-y-1 text-sm text-slate-700">
                        <span className="font-medium">休憩開始</span>
                        <input
                          type="time"
                          step={60}
                          min={formatHourLabel(draft.workStartHour)}
                          max={formatHourLabel(draft.workEndHour)}
                          value={formatTimeInputValue(period.startMinute)}
                          onChange={(event) => {
                            const parsedMinute = parseTimeInputValue(event.target.value);
                            if (parsedMinute === null) {
                              return;
                            }
                            updateBreakPeriod(index, {
                              startMinute: parsedMinute,
                              endMinute: Math.max(period.endMinute, parsedMinute + 1),
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>

                      <label className="space-y-1 text-sm text-slate-700">
                        <span className="font-medium">休憩終了</span>
                        <input
                          type="time"
                          step={60}
                          min={formatHourLabel(draft.workStartHour)}
                          max={formatHourLabel(draft.workEndHour)}
                          value={formatTimeInputValue(period.endMinute)}
                          onChange={(event) => {
                            const parsedMinute = parseTimeInputValue(event.target.value);
                            if (parsedMinute === null) {
                              return;
                            }
                            updateBreakPeriod(index, {
                              startMinute: Math.min(period.startMinute, parsedMinute - 1),
                              endMinute: parsedMinute,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>

                      <div className="self-end">
                        <button
                          type="button"
                          onClick={() => removeBreakPeriod(index)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-900">プレビュー</h2>
            <p className="mt-3 text-sm text-slate-600">{formatWorkScheduleSummary(draft)}</p>
            <p className="mt-4 text-sm text-slate-600">
              空き状況ページでは、上記の勤務時間内だけを 30 分単位で集計します。
            </p>

            {error && (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              <Save size={16} />
              保存する
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
