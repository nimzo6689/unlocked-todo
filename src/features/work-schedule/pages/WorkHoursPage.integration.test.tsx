import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkHoursPage } from '@/features/work-schedule/pages/WorkHoursPage';
import { useTodoContext } from '@/app/providers/TodoContext';
import { DEFAULT_WORK_SCHEDULE } from '@/features/work-schedule/model/settings';
import toast from 'react-hot-toast';

vi.mock('@/app/providers/TodoContext', () => ({
  useTodoContext: vi.fn(),
}));

vi.mock('@/features/shortcuts/context/ShortcutContext', () => ({
  useRegisterShortcuts: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
  },
}));

const useTodoContextMock = vi.mocked(useTodoContext);
const toastSuccessMock = vi.mocked(toast.success);

describe('WorkHoursPage integration', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    useTodoContextMock.mockReturnValue({
      workSchedule: DEFAULT_WORK_SCHEDULE,
      setWorkSchedule: vi.fn(),
    } as never);
  });

  it('toggles break section with no-break checkbox', () => {
    render(<WorkHoursPage />);

    expect(screen.getByText('休憩時間')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('休憩時間なし'));

    expect(screen.queryByText('休憩時間')).not.toBeInTheDocument();
  });

  it('adds and removes break periods', () => {
    render(<WorkHoursPage />);

    expect(screen.getAllByRole('button', { name: '削除' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '休憩を追加' }));
    expect(screen.getAllByRole('button', { name: '削除' })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: '削除' })[0]);
    expect(screen.getAllByRole('button', { name: '削除' })).toHaveLength(1);
  });

  it('shows validation error when no working day is selected', () => {
    render(<WorkHoursPage />);

    fireEvent.click(screen.getByRole('button', { name: '月' }));
    fireEvent.click(screen.getByRole('button', { name: '火' }));
    fireEvent.click(screen.getByRole('button', { name: '水' }));
    fireEvent.click(screen.getByRole('button', { name: '木' }));
    fireEvent.click(screen.getByRole('button', { name: '金' }));

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    expect(screen.getByText('少なくとも 1 つの稼働日を選択してください。')).toBeInTheDocument();
  });

  it('saves valid schedule', () => {
    const setWorkSchedule = vi.fn();
    useTodoContextMock.mockReturnValue({
      workSchedule: DEFAULT_WORK_SCHEDULE,
      setWorkSchedule,
    } as never);

    render(<WorkHoursPage />);

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    expect(setWorkSchedule).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith('稼働設定を保存しました');
  });

  it('updates work hours and break period inputs before save', () => {
    const setWorkSchedule = vi.fn();
    useTodoContextMock.mockReturnValue({
      workSchedule: DEFAULT_WORK_SCHEDULE,
      setWorkSchedule,
    } as never);

    render(<WorkHoursPage />);

    fireEvent.change(screen.getByLabelText('開始時刻'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('終了時刻'), { target: { value: '18' } });

    fireEvent.change(screen.getByLabelText('休憩開始'), { target: { value: '12:30' } });
    fireEvent.change(screen.getByLabelText('休憩終了'), { target: { value: '13:30' } });

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    expect(setWorkSchedule).toHaveBeenCalledTimes(1);
    const saved = setWorkSchedule.mock.calls[0][0];
    expect(saved.workStartHour).toBe(8);
    expect(saved.workEndHour).toBe(18);
    expect(saved.breakPeriods[0]).toEqual({ startMinute: 750, endMinute: 810 });
  });

  it('defers break validation and normalization until editing is finalized', () => {
    const setWorkSchedule = vi.fn();
    useTodoContextMock.mockReturnValue({
      workSchedule: DEFAULT_WORK_SCHEDULE,
      setWorkSchedule,
    } as never);

    render(<WorkHoursPage />);

    const breakStartInput = screen.getByLabelText('休憩開始') as HTMLInputElement;
    const breakEndInput = screen.getByLabelText('休憩終了') as HTMLInputElement;

    expect(breakStartInput.value).toBe('12:00');
    expect(breakEndInput.value).toBe('13:00');

    breakStartInput.focus();
    fireEvent.input(breakStartInput, { target: { value: '17:00' } });

    expect(breakStartInput.value).toBe('17:00');
    expect(breakEndInput.value).toBe('13:00');

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    expect(setWorkSchedule).toHaveBeenCalledTimes(1);
    const saved = setWorkSchedule.mock.calls[0][0];
    expect(saved.breakPeriods[0]).toEqual({ startMinute: 1019, endMinute: 1020 });
  });
});
