import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkHoursPage } from '@/features/work-schedule/pages/WorkHoursPage';
import { useTodoContext } from '@/app/providers/TodoContext';
import { DEFAULT_WORK_SCHEDULE } from '@/features/work-schedule/model/settings';

const handleSave = vi.fn();

vi.mock('@/app/providers/TodoContext', () => ({
  useTodoContext: vi.fn(),
}));

vi.mock('@/features/shortcuts/context/ShortcutContext', () => ({
  useRegisterShortcuts: vi.fn(),
}));

vi.mock('@/features/work-schedule/hooks/useWorkHoursDraft', () => ({
  useWorkHoursDraft: () => ({
    draft: DEFAULT_WORK_SCHEDULE,
    error: '',
    hasNoBreak: false,
    updateDraft: vi.fn(),
    toggleNoBreak: vi.fn(),
    toggleWorkingDay: vi.fn(),
    addBreakPeriod: vi.fn(),
    removeBreakPeriod: vi.fn(),
    updateBreakPeriod: vi.fn(),
    handleSave,
  }),
}));

const useTodoContextMock = vi.mocked(useTodoContext);

describe('WorkHoursPage', () => {
  beforeEach(() => {
    handleSave.mockReset();
    useTodoContextMock.mockReturnValue({
      workSchedule: DEFAULT_WORK_SCHEDULE,
      setWorkSchedule: vi.fn(),
    } as never);
  });

  it('calls save handler', () => {
    render(<WorkHoursPage />);

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    expect(handleSave).toHaveBeenCalledTimes(1);
  });
});
