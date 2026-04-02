import type { BreakPeriod, WorkSchedule } from './types';

export const WORK_SCHEDULE_STORAGE_KEY = 'workSchedule';

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  workingDays: [1, 2, 3, 4, 5],
  workStartHour: 9,
  workEndHour: 17,
  breakPeriods: [{ startMinute: 12 * 60, endMinute: 13 * 60 }],
};

export const WEEKDAY_OPTIONS = [
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
  { value: 0, label: '日' },
];

export const formatHourLabel = (hour: number) => `${`${hour}`.padStart(2, '0')}:00`;

export const formatMinuteLabel = (minuteOfDay: number) => {
  const clamped = Math.max(0, Math.min(24 * 60, Math.trunc(minuteOfDay)));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${`${hour}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}`;
};

export const normalizeBreakPeriods = (
  breakPeriods: BreakPeriod[],
  workStartHour: number,
  workEndHour: number,
): BreakPeriod[] => {
  const workStartMinute = workStartHour * 60;
  const workEndMinute = workEndHour * 60;

  const sanitized = breakPeriods
    .filter(
      (period) =>
        Number.isInteger(period.startMinute) &&
        Number.isInteger(period.endMinute) &&
        period.startMinute >= workStartMinute &&
        period.endMinute <= workEndMinute &&
        period.startMinute < period.endMinute,
    )
    .map((period) => ({
      startMinute: Number(period.startMinute),
      endMinute: Number(period.endMinute),
    }))
    .sort((left, right) =>
      left.startMinute === right.startMinute
        ? left.endMinute - right.endMinute
        : left.startMinute - right.startMinute,
    );

  return sanitized.reduce<BreakPeriod[]>((merged, period) => {
    const last = merged[merged.length - 1];
    if (!last || period.startMinute > last.endMinute) {
      merged.push({ ...period });
      return merged;
    }

    last.endMinute = Math.max(last.endMinute, period.endMinute);
    return merged;
  }, []);
};

export const hasBreakTime = (schedule: WorkSchedule) => schedule.breakPeriods.length > 0;

export const formatWorkScheduleSummary = (schedule: WorkSchedule) => {
  const dayLabels = WEEKDAY_OPTIONS.filter((option) => schedule.workingDays.includes(option.value)).map(
    (option) => option.label,
  );

  if (!hasBreakTime(schedule)) {
    return `${dayLabels.join('・')} ${formatHourLabel(schedule.workStartHour)}-${formatHourLabel(schedule.workEndHour)} (休憩なし)`;
  }

  const breakLabels = schedule.breakPeriods
    .map((period) => `${formatMinuteLabel(period.startMinute)}-${formatMinuteLabel(period.endMinute)}`)
    .join(', ');

  return `${dayLabels.join('・')} ${formatHourLabel(schedule.workStartHour)}-${formatHourLabel(schedule.workEndHour)} (休憩: ${breakLabels})`;
};

export const sanitizeWorkSchedule = (value: unknown): WorkSchedule => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_WORK_SCHEDULE;
  }

  const candidate = value as Partial<WorkSchedule>;
  const workingDays = Array.isArray(candidate.workingDays)
    ? [...new Set(candidate.workingDays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right)
    : DEFAULT_WORK_SCHEDULE.workingDays;

  const workStartHour = Number.isInteger(candidate.workStartHour)
    ? Number(candidate.workStartHour)
    : DEFAULT_WORK_SCHEDULE.workStartHour;
  const workEndHour = Number.isInteger(candidate.workEndHour)
    ? Number(candidate.workEndHour)
    : DEFAULT_WORK_SCHEDULE.workEndHour;
  const hasValidWorkHours =
    workStartHour >= 0 &&
    workStartHour < workEndHour &&
    workEndHour <= 24;

  if (workingDays.length === 0 || !hasValidWorkHours) {
    return DEFAULT_WORK_SCHEDULE;
  }

  const rawBreakPeriods = Array.isArray((candidate as { breakPeriods?: unknown }).breakPeriods)
    ? ((candidate as { breakPeriods: unknown[] }).breakPeriods ?? [])
    : [];

  const breakPeriodsFromArray = rawBreakPeriods
        .filter(
          (period): period is BreakPeriod =>
            Boolean(period) &&
            typeof period === 'object' &&
            Number.isInteger((period as BreakPeriod).startMinute) &&
            Number.isInteger((period as BreakPeriod).endMinute),
        )
        .map((period) => ({
          startMinute: Number(period.startMinute),
          endMinute: Number(period.endMinute),
        }));

  const legacyBreakPeriodsFromArray = rawBreakPeriods
        .filter(
          (period): period is {
            startHour: number;
            endHour: number;
          } =>
            Boolean(period) &&
            typeof period === 'object' &&
            Number.isInteger((period as { startHour?: unknown }).startHour) &&
            Number.isInteger((period as { endHour?: unknown }).endHour),
        )
        .map((period) => ({
          startMinute: Number(period.startHour) * 60,
          endMinute: Number(period.endHour) * 60,
        }));

  const legacyBreakPeriods =
    Number.isInteger((candidate as { breakStartHour?: unknown }).breakStartHour) &&
    Number.isInteger((candidate as { breakEndHour?: unknown }).breakEndHour)
      ? [
          {
            startMinute: Number((candidate as { breakStartHour: number }).breakStartHour) * 60,
            endMinute: Number((candidate as { breakEndHour: number }).breakEndHour) * 60,
          },
        ]
      : [];

  const breakPeriods = normalizeBreakPeriods(
    breakPeriodsFromArray.length > 0
      ? breakPeriodsFromArray
      : legacyBreakPeriodsFromArray.length > 0
        ? legacyBreakPeriodsFromArray
        : legacyBreakPeriods,
    workStartHour,
    workEndHour,
  );

  return {
    workingDays,
    workStartHour,
    workEndHour,
    breakPeriods,
  };
};
