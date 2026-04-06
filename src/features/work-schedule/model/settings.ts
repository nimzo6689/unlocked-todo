import type { BreakPeriod, WorkSchedule } from '@/features/todo/model/types';
import i18n, { getIntlLocale, normalizeLocale, type AppLocale } from '@/shared/i18n';

export const WORK_SCHEDULE_STORAGE_KEY = 'workSchedule';

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  workingDays: [1, 2, 3, 4, 5],
  workStartHour: 9,
  workEndHour: 17,
  breakPeriods: [{ startMinute: 12 * 60, endMinute: 13 * 60 }],
};

export const getWeekdayOptions = (locale: AppLocale = normalizeLocale(i18n.resolvedLanguage)) =>
  [1, 2, 3, 4, 5, 6, 0].map(value => ({
    value,
    label: i18n.t(`workHours.weekdays.short.${value}`, { lng: locale }),
  }));

export const formatHourLabel = (
  hour: number,
  locale: AppLocale = normalizeLocale(i18n.resolvedLanguage),
) => {
  const normalizedHour = Math.max(0, Math.min(hour, 24));

  if (normalizedHour === 24) {
    return '24:00';
  }

  const date = new Date(Date.UTC(2000, 0, 1, normalizedHour, 0));
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
};

export const formatMinuteLabel = (
  minuteOfDay: number,
  locale: AppLocale = normalizeLocale(i18n.resolvedLanguage),
) => {
  const clamped = Math.max(0, Math.min(24 * 60, Math.trunc(minuteOfDay)));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;

  if (hour === 24 && minute === 0) {
    return '24:00';
  }

  const date = new Date(Date.UTC(2000, 0, 1, hour % 24, minute));
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
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
      period =>
        Number.isInteger(period.startMinute) &&
        Number.isInteger(period.endMinute) &&
        period.startMinute >= workStartMinute &&
        period.endMinute <= workEndMinute &&
        period.startMinute < period.endMinute,
    )
    .map(period => ({
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

export const formatWorkScheduleSummary = (
  schedule: WorkSchedule,
  locale: AppLocale = normalizeLocale(i18n.resolvedLanguage),
) => {
  const dayLabels = getWeekdayOptions(locale)
    .filter(option => schedule.workingDays.includes(option.value))
    .map(option => option.label);

  if (!hasBreakTime(schedule)) {
    return i18n.t('workHours.summary.noBreak', {
      lng: locale,
      days: dayLabels.join(locale === 'ja' ? '・' : ', '),
      start: formatHourLabel(schedule.workStartHour, locale),
      end: formatHourLabel(schedule.workEndHour, locale),
    });
  }

  const breakLabels = schedule.breakPeriods
    .map(
      period =>
        `${formatMinuteLabel(period.startMinute, locale)}-${formatMinuteLabel(period.endMinute, locale)}`,
    )
    .join(', ');

  return i18n.t('workHours.summary.withBreak', {
    lng: locale,
    days: dayLabels.join(locale === 'ja' ? '・' : ', '),
    start: formatHourLabel(schedule.workStartHour, locale),
    end: formatHourLabel(schedule.workEndHour, locale),
    breaks: breakLabels,
  });
};

export const sanitizeWorkSchedule = (value: unknown): WorkSchedule => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_WORK_SCHEDULE;
  }

  const candidate = value as Partial<WorkSchedule>;
  const workingDays = Array.isArray(candidate.workingDays)
    ? [
        ...new Set(
          candidate.workingDays.filter(
            (day): day is number => Number.isInteger(day) && day >= 0 && day <= 6,
          ),
        ),
      ].sort((left, right) => left - right)
    : DEFAULT_WORK_SCHEDULE.workingDays;

  const workStartHour = Number.isInteger(candidate.workStartHour)
    ? Number(candidate.workStartHour)
    : DEFAULT_WORK_SCHEDULE.workStartHour;
  const workEndHour = Number.isInteger(candidate.workEndHour)
    ? Number(candidate.workEndHour)
    : DEFAULT_WORK_SCHEDULE.workEndHour;
  const hasValidWorkHours = workStartHour >= 0 && workStartHour < workEndHour && workEndHour <= 24;

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
    .map(period => ({
      startMinute: Number(period.startMinute),
      endMinute: Number(period.endMinute),
    }));

  const legacyBreakPeriodsFromArray = rawBreakPeriods
    .filter(
      (
        period,
      ): period is {
        startHour: number;
        endHour: number;
      } =>
        Boolean(period) &&
        typeof period === 'object' &&
        Number.isInteger((period as { startHour?: unknown }).startHour) &&
        Number.isInteger((period as { endHour?: unknown }).endHour),
    )
    .map(period => ({
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
