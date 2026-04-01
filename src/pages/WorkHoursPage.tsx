import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock3, Save } from 'lucide-react';
import { useTodoContext } from '../contexts/TodoContext';
import {
  formatHourLabel,
  formatWorkScheduleSummary,
  WEEKDAY_OPTIONS,
} from '../common/settings';
import type { WorkSchedule } from '../common/types';
import { useRegisterShortcuts } from '../contexts/ShortcutContext';

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, index) => index);

export const WorkHoursPage = () => {
  const { workSchedule, setWorkSchedule } = useTodoContext();
  const [draft, setDraft] = useState<WorkSchedule>(workSchedule);
  const [error, setError] = useState('');
  const hasNoBreak = draft.breakStartHour === draft.breakEndHour;

  const toggleNoBreak = (enabled: boolean) => {
    updateDraft((current) => {
      if (enabled) {
        return {
          ...current,
          breakStartHour: current.workStartHour,
          breakEndHour: current.workStartHour,
        };
      }

      const nextBreakStartHour = Math.max(current.workStartHour, Math.min(current.breakStartHour, current.workEndHour - 1));
      return {
        ...current,
        breakStartHour: nextBreakStartHour,
        breakEndHour: nextBreakStartHour + 1,
      };
    });
  };

  useEffect(() => {
    setDraft(workSchedule);
  }, [workSchedule]);

  const updateDraft = (updater: (current: WorkSchedule) => WorkSchedule) => {
    setDraft((current) => updater(current));
    setError('');
  };

  const toggleWorkingDay = (day: number) => {
    updateDraft((current) => {
      const nextDays = current.workingDays.includes(day)
        ? current.workingDays.filter((currentDay) => currentDay !== day)
        : [...current.workingDays, day].sort((left, right) => left - right);

      return {
        ...current,
        workingDays: nextDays,
      };
    });
  };

  const handleSave = () => {
    if (draft.workingDays.length === 0) {
      setError('少なくとも 1 つの稼働日を選択してください。');
      return;
    }

    if (draft.workStartHour >= draft.workEndHour) {
      setError('開始時刻は終了時刻より前に設定してください。');
      return;
    }

    const noBreak = draft.breakStartHour === draft.breakEndHour;

    if (
      draft.breakStartHour < draft.workStartHour ||
      draft.breakEndHour > draft.workEndHour ||
      (!noBreak && draft.breakStartHour >= draft.breakEndHour)
    ) {
      setError('休憩時間は稼働時間内に収まるように設定してください。');
      return;
    }

    setWorkSchedule(draft);
    toast.success('稼働設定を保存しました');
  };

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
                      if (current.breakStartHour !== current.breakEndHour) {
                        return {
                          ...current,
                          workStartHour: nextWorkStartHour,
                        };
                      }

                      return {
                        ...current,
                        workStartHour: nextWorkStartHour,
                        breakStartHour: nextWorkStartHour,
                        breakEndHour: nextWorkStartHour,
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
                      if (current.breakStartHour !== current.breakEndHour) {
                        return {
                          ...current,
                          workEndHour: nextWorkEndHour,
                        };
                      }

                      const nextBreakHour = Math.min(nextWorkEndHour, current.breakStartHour);
                      return {
                        ...current,
                        workEndHour: nextWorkEndHour,
                        breakStartHour: nextBreakHour,
                        breakEndHour: nextBreakHour,
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
                <>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">休憩開始</span>
                    <select
                      value={draft.breakStartHour}
                      onChange={(event) =>
                        updateDraft((current) => {
                          const nextBreakStartHour = Number(event.target.value);
                          const nextBreakEndHour = Math.max(current.breakEndHour, nextBreakStartHour + 1);
                          return {
                            ...current,
                            breakStartHour: nextBreakStartHour,
                            breakEndHour: Math.min(nextBreakEndHour, current.workEndHour),
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
                    <span className="font-medium">休憩終了</span>
                    <select
                      value={draft.breakEndHour}
                      onChange={(event) =>
                        updateDraft((current) => {
                          const nextBreakEndHour = Number(event.target.value);
                          const nextBreakStartHour = Math.min(current.breakStartHour, nextBreakEndHour - 1);
                          return {
                            ...current,
                            breakStartHour: Math.max(nextBreakStartHour, current.workStartHour),
                            breakEndHour: nextBreakEndHour,
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
                </>
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
