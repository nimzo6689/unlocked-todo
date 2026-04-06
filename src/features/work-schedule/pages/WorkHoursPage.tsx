import { useMemo } from 'react';
import { Clock3, Plus, Save, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTodoContext } from '@/app/providers/TodoContext';
import {
  formatHourLabel,
  formatWorkScheduleSummary,
  getWeekdayOptions,
  normalizeBreakPeriods,
} from '@/features/work-schedule/model/settings';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { useWorkHoursDraft } from '@/features/work-schedule/hooks/useWorkHoursDraft';
import { useAppLocale } from '@/shared/i18n/useAppLocale';

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, index) => index);

const formatTimeInputValue = (minuteOfDay: number) => {
  const clamped = Math.max(0, Math.min(24 * 60, Math.trunc(minuteOfDay)));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${`${hour}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}`;
};

const parseTimeInputValue = (value: string) => {
  const [hourText = '0', minuteText = '0'] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 24 ||
    minute < 0 ||
    minute >= 60
  ) {
    return null;
  }

  if (hour === 24 && minute !== 0) {
    return null;
  }

  return hour * 60 + minute;
};

export const WorkHoursPage = () => {
  const { workSchedule, setWorkSchedule } = useTodoContext();
  const { t } = useTranslation();
  const { locale } = useAppLocale();
  const weekdayOptions = useMemo(() => getWeekdayOptions(locale), [locale]);
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

  const shortcutRegistration = useMemo(
    () => ({
      pageLabel: t('workHours.pageLabel'),
      shortcuts: [
        {
          id: 'work-hours-save',
          description: t('workHours.saveShortcut'),
          category: 'ページ操作' as const,
          bindings: ['mod+enter'],
          action: handleSave,
          allowInInput: true,
        },
        {
          id: 'work-hours-toggle-break',
          description: t('workHours.toggleBreakShortcut'),
          category: 'ページ操作' as const,
          bindings: ['b'],
          action: () => toggleNoBreak(!hasNoBreak),
        },
        ...weekdayOptions.map((option, index) => ({
          id: `work-hours-day-${option.value}`,
          description: t('workHours.toggleWorkingDayShortcut', { day: option.label }),
          category: 'ページ操作' as const,
          bindings: [`${index + 1}`],
          action: () => toggleWorkingDay(option.value),
        })),
      ],
    }),
    [handleSave, hasNoBreak, t, toggleNoBreak, toggleWorkingDay, weekdayOptions],
  );

  useRegisterShortcuts(shortcutRegistration);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Settings</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('workHours.title')}</h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          {t('workHours.description')}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          <Clock3 size={16} />
          {t('workHours.currentSettings', {
            summary: formatWorkScheduleSummary(workSchedule, locale),
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">{t('workHours.workingDays')}</h2>
              <div className="flex flex-wrap gap-2">
                {weekdayOptions.map(option => {
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
                    onChange={event => toggleNoBreak(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="font-medium">{t('workHours.noBreak')}</span>
                </label>
              </div>

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">{t('workHours.startTime')}</span>
                <select
                  value={draft.workStartHour}
                  onChange={event =>
                    updateDraft(current => {
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
                  {HOUR_OPTIONS.slice(0, 24).map(hour => (
                    <option key={hour} value={hour}>
                      {formatHourLabel(hour, locale)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">{t('workHours.endTime')}</span>
                <select
                  value={draft.workEndHour}
                  onChange={event =>
                    updateDraft(current => {
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
                  {HOUR_OPTIONS.slice(1).map(hour => (
                    <option key={hour} value={hour}>
                      {formatHourLabel(hour, locale)}
                    </option>
                  ))}
                </select>
              </label>

              {!hasNoBreak && (
                <div className="sm:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{t('workHours.breakTime')}</p>
                    <button
                      type="button"
                      onClick={addBreakPeriod}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <Plus size={14} />
                      {t('workHours.addBreak')}
                    </button>
                  </div>

                  {draft.breakPeriods.map((period, index) => (
                    <div
                      key={`${period.startMinute}-${period.endMinute}-${index}`}
                      className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <label className="space-y-1 text-sm text-slate-700">
                        <span className="font-medium">{t('workHours.breakStart')}</span>
                        <input
                          type="time"
                          step={60}
                          min={formatTimeInputValue(draft.workStartHour * 60)}
                          max={formatTimeInputValue(draft.workEndHour * 60)}
                          value={formatTimeInputValue(period.startMinute)}
                          onChange={event => {
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
                        <span className="font-medium">{t('workHours.breakEnd')}</span>
                        <input
                          type="time"
                          step={60}
                          min={formatTimeInputValue(draft.workStartHour * 60)}
                          max={formatTimeInputValue(draft.workEndHour * 60)}
                          value={formatTimeInputValue(period.endMinute)}
                          onChange={event => {
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
                          {t('workHours.deleteBreak')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-900">{t('workHours.preview')}</h2>
            <p className="mt-3 text-sm text-slate-600">
              {formatWorkScheduleSummary(draft, locale)}
            </p>
            <p className="mt-4 text-sm text-slate-600">{t('workHours.previewDescription')}</p>

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
              {t('workHours.save')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
