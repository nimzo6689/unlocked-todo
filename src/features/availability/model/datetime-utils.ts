import i18n, { getIntlLocale, normalizeLocale } from '@/shared/i18n';

export const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTimeLabel = (date: Date) => {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatDateLabel = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  const locale = normalizeLocale(i18n.resolvedLanguage);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = new Intl.DateTimeFormat(getIntlLocale(locale), {
    weekday: 'short',
  }).format(date);

  if (locale === 'ja') {
    return `${month}/${day}(${weekday})`;
  }

  return `${month}/${day} (${weekday})`;
};

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
