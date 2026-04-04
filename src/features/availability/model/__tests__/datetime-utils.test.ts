import { addDays, formatDateLabel, formatTimeLabel, toDateInputValue } from '../datetime-utils';

describe('datetime-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats date input value as YYYY-MM-DD', () => {
    const date = new Date('2026-04-04T08:09:10.000Z');

    expect(toDateInputValue(date)).toBe('2026-04-04');
  });

  it('formats time label as HH:mm', () => {
    const date = new Date('2026-04-04T08:09:10.000Z');

    expect(formatTimeLabel(date)).toBe('08:09');
  });

  it('formats date label with weekday in Japanese', () => {
    expect(formatDateLabel('2026-04-04')).toBe('4/4(土)');
    expect(formatDateLabel('2026-04-06')).toBe('4/6(月)');
  });

  it('adds days without mutating the original date', () => {
    const original = new Date('2026-04-04T00:00:00.000Z');

    const next = addDays(original, 3);

    expect(toDateInputValue(original)).toBe('2026-04-04');
    expect(toDateInputValue(next)).toBe('2026-04-07');
  });
});
