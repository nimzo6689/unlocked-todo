import {
  DEFAULT_WORK_SCHEDULE,
  formatHourLabel,
  formatMinuteLabel,
  normalizeBreakPeriods,
  sanitizeWorkSchedule,
} from '../settings';

describe('work-schedule settings', () => {
  it('formats hour and minute labels', () => {
    expect(formatHourLabel(9)).toBe('09:00');
    expect(formatMinuteLabel(9 * 60 + 30)).toBe('09:30');
    expect(formatMinuteLabel(26 * 60)).toBe('24:00');
  });

  it('normalizes break periods by filtering and merging', () => {
    const normalized = normalizeBreakPeriods(
      [
        { startMinute: 12 * 60, endMinute: 13 * 60 },
        { startMinute: 12 * 60 + 30, endMinute: 14 * 60 },
        { startMinute: 8 * 60, endMinute: 8 * 60 + 30 },
      ],
      9,
      17,
    );

    expect(normalized).toEqual([{ startMinute: 12 * 60, endMinute: 14 * 60 }]);
  });

  it('sanitizes valid schedule and deduplicates weekdays', () => {
    const sanitized = sanitizeWorkSchedule({
      workingDays: [1, 1, 3, 5],
      workStartHour: 8,
      workEndHour: 18,
      breakPeriods: [
        { startMinute: 12 * 60, endMinute: 13 * 60 },
        { startMinute: 12 * 60 + 30, endMinute: 14 * 60 },
      ],
    });

    expect(sanitized.workingDays).toEqual([1, 3, 5]);
    expect(sanitized.breakPeriods).toEqual([{ startMinute: 12 * 60, endMinute: 14 * 60 }]);
  });

  it('converts legacy break hour schema to breakPeriods', () => {
    const sanitized = sanitizeWorkSchedule({
      workingDays: [1, 2, 3, 4, 5],
      workStartHour: 9,
      workEndHour: 17,
      breakStartHour: 12,
      breakEndHour: 13,
    });

    expect(sanitized.breakPeriods).toEqual([{ startMinute: 12 * 60, endMinute: 13 * 60 }]);
  });

  it('falls back to default schedule for invalid work hours', () => {
    const sanitized = sanitizeWorkSchedule({
      workingDays: [1, 2, 3],
      workStartHour: 18,
      workEndHour: 17,
    });

    expect(sanitized).toEqual(DEFAULT_WORK_SCHEDULE);
  });
});
