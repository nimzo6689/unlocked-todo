import type { WorkSchedule } from './types';

export const WORK_SCHEDULE_STORAGE_KEY = 'workSchedule';

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  workingDays: [1, 2, 3, 4, 5],
  workStartHour: 9,
  workEndHour: 17,
  breakStartHour: 12,
  breakEndHour: 13,
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

export const formatWorkScheduleSummary = (schedule: WorkSchedule) => {
  const dayLabels = WEEKDAY_OPTIONS.filter((option) => schedule.workingDays.includes(option.value)).map(
    (option) => option.label,
  );

  return `${dayLabels.join('・')} ${formatHourLabel(schedule.workStartHour)}-${formatHourLabel(schedule.breakStartHour)} / ${formatHourLabel(schedule.breakEndHour)}-${formatHourLabel(schedule.workEndHour)}`;
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
  const breakStartHour = Number.isInteger(candidate.breakStartHour)
    ? Number(candidate.breakStartHour)
    : DEFAULT_WORK_SCHEDULE.breakStartHour;
  const breakEndHour = Number.isInteger(candidate.breakEndHour)
    ? Number(candidate.breakEndHour)
    : DEFAULT_WORK_SCHEDULE.breakEndHour;

  const hasValidHours =
    workStartHour >= 0 &&
    workStartHour < workEndHour &&
    workEndHour <= 24 &&
    breakStartHour >= workStartHour &&
    breakStartHour < breakEndHour &&
    breakEndHour <= workEndHour;

  if (workingDays.length === 0 || !hasValidHours) {
    return DEFAULT_WORK_SCHEDULE;
  }

  return {
    workingDays,
    workStartHour,
    workEndHour,
    breakStartHour,
    breakEndHour,
  };
};
