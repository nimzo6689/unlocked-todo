import type { BreakPeriod, WorkSchedule } from './types';

export const WORK_SCHEDULE_STORAGE_KEY = 'workSchedule';

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  workingDays: [1, 2, 3, 4, 5],
  workStartHour: 9,
  workEndHour: 17,
  breakPeriods: [{ startHour: 12, endHour: 13 }],
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

export const normalizeBreakPeriods = (
  breakPeriods: BreakPeriod[],
  workStartHour: number,
  workEndHour: number,
): BreakPeriod[] => {
  const sanitized = breakPeriods
    .filter(
      (period) =>
        Number.isInteger(period.startHour) &&
        Number.isInteger(period.endHour) &&
        period.startHour >= workStartHour &&
        period.endHour <= workEndHour &&
        period.startHour < period.endHour,
    )
    .map((period) => ({
      startHour: Number(period.startHour),
      endHour: Number(period.endHour),
    }))
    .sort((left, right) =>
      left.startHour === right.startHour
        ? left.endHour - right.endHour
        : left.startHour - right.startHour,
    );

  return sanitized.reduce<BreakPeriod[]>((merged, period) => {
    const last = merged[merged.length - 1];
    if (!last || period.startHour > last.endHour) {
      merged.push({ ...period });
      return merged;
    }

    last.endHour = Math.max(last.endHour, period.endHour);
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
    .map((period) => `${formatHourLabel(period.startHour)}-${formatHourLabel(period.endHour)}`)
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

  const breakPeriodsFromArray = Array.isArray(candidate.breakPeriods)
    ? candidate.breakPeriods
        .filter(
          (period): period is BreakPeriod =>
            Boolean(period) &&
            typeof period === 'object' &&
            Number.isInteger((period as BreakPeriod).startHour) &&
            Number.isInteger((period as BreakPeriod).endHour),
        )
        .map((period) => ({
          startHour: Number(period.startHour),
          endHour: Number(period.endHour),
        }))
    : [];

  const legacyBreakPeriods =
    Number.isInteger((candidate as { breakStartHour?: unknown }).breakStartHour) &&
    Number.isInteger((candidate as { breakEndHour?: unknown }).breakEndHour)
      ? [
          {
            startHour: Number((candidate as { breakStartHour: number }).breakStartHour),
            endHour: Number((candidate as { breakEndHour: number }).breakEndHour),
          },
        ]
      : [];

  const breakPeriods = normalizeBreakPeriods(
    breakPeriodsFromArray.length > 0 ? breakPeriodsFromArray : legacyBreakPeriods,
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
