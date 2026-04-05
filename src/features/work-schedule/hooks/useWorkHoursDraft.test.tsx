import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkHoursDraft } from '@/features/work-schedule/hooks/useWorkHoursDraft';
import { DEFAULT_WORK_SCHEDULE } from '@/features/work-schedule/model/settings';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
  },
}));

const toastSuccessMock = vi.mocked(toast.success);

describe('useWorkHoursDraft', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
  });

  it('toggles no-break on and off', () => {
    const setWorkSchedule = vi.fn();
    const { result } = renderHook(() => useWorkHoursDraft(DEFAULT_WORK_SCHEDULE, setWorkSchedule));

    act(() => {
      result.current.toggleNoBreak(true);
    });

    expect(result.current.draft.breakPeriods).toEqual([]);

    act(() => {
      result.current.toggleNoBreak(false);
    });

    expect(result.current.draft.breakPeriods.length).toBeGreaterThan(0);
  });

  it('toggles working days and break periods', () => {
    const setWorkSchedule = vi.fn();
    const { result } = renderHook(() => useWorkHoursDraft(DEFAULT_WORK_SCHEDULE, setWorkSchedule));

    act(() => {
      result.current.toggleWorkingDay(1);
    });
    expect(result.current.draft.workingDays.includes(1)).toBe(false);

    act(() => {
      result.current.addBreakPeriod();
    });
    const addedLength = result.current.draft.breakPeriods.length;
    expect(addedLength).toBeGreaterThan(1);

    act(() => {
      result.current.removeBreakPeriod(addedLength - 1);
    });
    expect(result.current.draft.breakPeriods.length).toBe(addedLength - 1);
  });

  it('updates break period through normalization', () => {
    const setWorkSchedule = vi.fn();
    const { result } = renderHook(() => useWorkHoursDraft(DEFAULT_WORK_SCHEDULE, setWorkSchedule));

    act(() => {
      result.current.updateBreakPeriod(0, {
        startMinute: 13 * 60,
        endMinute: 12 * 60,
      });
    });

    expect(result.current.draft.breakPeriods).toHaveLength(0);
  });

  it('validates and rejects empty working days', () => {
    const setWorkSchedule = vi.fn();
    const { result } = renderHook(() => useWorkHoursDraft(DEFAULT_WORK_SCHEDULE, setWorkSchedule));

    act(() => {
      result.current.updateDraft((current) => ({ ...current, workingDays: [] }));
    });
    act(() => {
      result.current.handleSave();
    });

    expect(result.current.error).toBe('少なくとも 1 つの稼働日を選択してください。');
    expect(setWorkSchedule).not.toHaveBeenCalled();
  });

  it('validates and rejects invalid work-hour range', () => {
    const setWorkSchedule = vi.fn();
    const { result } = renderHook(() => useWorkHoursDraft(DEFAULT_WORK_SCHEDULE, setWorkSchedule));

    act(() => {
      result.current.updateDraft((current) => ({ ...current, workStartHour: 18, workEndHour: 18 }));
    });
    act(() => {
      result.current.handleSave();
    });

    expect(result.current.error).toBe('開始時刻は終了時刻より前に設定してください。');
    expect(setWorkSchedule).not.toHaveBeenCalled();
  });

  it('saves schedule when all values are valid', () => {
    const setWorkSchedule = vi.fn();
    const { result } = renderHook(() => useWorkHoursDraft(DEFAULT_WORK_SCHEDULE, setWorkSchedule));

    act(() => {
      result.current.handleSave();
    });

    expect(setWorkSchedule).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith('稼働設定を保存しました');
  });
});
