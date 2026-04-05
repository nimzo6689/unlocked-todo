import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanActualPage } from '@/features/analytics/pages/PlanActualPage';
import { useTodoContext } from '@/app/providers/TodoContext';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { createTodo } from '@/test/factories/todo';

const chartSpy = vi.fn();

vi.mock('echarts-for-react', () => ({
  default: (props: unknown) => {
    chartSpy(props);
    return <div data-testid="plan-actual-chart" />;
  },
}));

vi.mock('@/app/providers/TodoContext', () => ({
  useTodoContext: vi.fn(),
}));

vi.mock('@/features/shortcuts/context/ShortcutContext', () => ({
  useRegisterShortcuts: vi.fn(),
}));

const useTodoContextMock = vi.mocked(useTodoContext);
const useRegisterShortcutsMock = vi.mocked(useRegisterShortcuts);

describe('PlanActualPage', () => {
  beforeEach(() => {
    chartSpy.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T09:00:00.000Z'));
  });

  it('shows empty message when no completed todos are in range', () => {
    useTodoContextMock.mockReturnValue({ todos: [] } as never);

    render(<PlanActualPage />);

    expect(screen.getByText('指定期間内に、表示対象の完了タスクがありません。')).toBeInTheDocument();
  });

  it('renders chart and normalizes invalid numeric fields', () => {
    useTodoContextMock.mockReturnValue({
      todos: [
        createTodo({
          id: 'done-1',
          status: 'Completed',
          startedAt: '2026-04-04T10:00:00.000Z',
          dueDate: '2026-04-04T12:00:00.000Z',
          effortMinutes: -10,
          actualWorkSeconds: Number.NaN,
        }),
      ],
    } as never);

    render(<PlanActualPage />);

    expect(screen.getByTestId('plan-actual-chart')).toBeInTheDocument();

    const chartProps = chartSpy.mock.calls[0]?.[0] as { option: { series: Array<{ data: unknown[] }> } };
    expect(chartProps.option.series[0].data[0]).toBe(0);
    expect(chartProps.option.series[1].data[0]).toBe(0);
  });

  it('filters out meeting, invalid startedAt and out-of-range rows', () => {
    useTodoContextMock.mockReturnValue({
      todos: [
        createTodo({
          id: 'in-range',
          title: '対象',
          status: 'Completed',
          startedAt: '2026-04-04T10:00:00.000Z',
          dueDate: '2026-04-04T12:00:00.000Z',
          effortMinutes: 30,
          actualWorkSeconds: 2400,
        }),
        createTodo({
          id: 'meeting',
          taskType: 'Meeting',
          status: 'Completed',
          startedAt: '2026-04-04T10:00:00.000Z',
          dueDate: '2026-04-04T11:00:00.000Z',
        }),
        createTodo({
          id: 'invalid-started-at',
          status: 'Completed',
          startedAt: 'invalid',
        }),
        createTodo({
          id: 'out-of-range',
          status: 'Completed',
          startedAt: '2026-03-20T10:00:00.000Z',
        }),
      ],
    } as never);

    render(<PlanActualPage />);

    const chartProps = chartSpy.mock.calls[0]?.[0] as { option: { xAxis: { data: string[] } } };
    expect(chartProps.option.xAxis.data).toEqual(['対象']);
  });

  it('updates date with shortcuts and date input', () => {
    useTodoContextMock.mockReturnValue({
      todos: [
        createTodo({
          id: 'done-1',
          status: 'Completed',
          startedAt: '2026-04-04T10:00:00.000Z',
          dueDate: '2026-04-04T12:00:00.000Z',
        }),
      ],
    } as never);

    render(<PlanActualPage />);

    const input = screen.getByLabelText('集計開始日') as HTMLInputElement;
    expect(input.value).toBe('2026-04-04');

    const registration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    expect(registration).toBeDefined();

    act(() => {
      registration?.shortcuts.find((item) => item.id === 'plan-actual-prev-day')?.action();
    });

    const latestRegistration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    act(() => {
      latestRegistration?.shortcuts.find((item) => item.id === 'plan-actual-next-day')?.action();
    });

    fireEvent.change(input, { target: { value: '2026-04-02' } });
    expect(input.value).toBe('2026-04-02');

    const currentRegistration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    act(() => {
      currentRegistration?.shortcuts.find((item) => item.id === 'plan-actual-today')?.action();
    });

    expect(chartSpy).toHaveBeenCalled();
  });

  it('handles tooltip and axis label format branches', () => {
    useTodoContextMock.mockReturnValue({
      todos: [
        createTodo({
          id: 'over',
          title: 'とても長いタイトルABCDEFGHIJK',
          status: 'Completed',
          startedAt: '2026-04-04T10:00:00.000Z',
          dueDate: '2026-04-04T12:00:00.000Z',
          effortMinutes: 10,
          actualWorkSeconds: 1800,
        }),
        createTodo({
          id: 'under',
          title: '短い',
          status: 'Completed',
          startedAt: '2026-04-04T11:00:00.000Z',
          dueDate: '2026-04-04T13:00:00.000Z',
          effortMinutes: 40,
          actualWorkSeconds: 600,
        }),
      ],
    } as never);

    render(<PlanActualPage />);

    const chartProps = chartSpy.mock.calls.at(-1)?.[0] as {
      option: {
        tooltip: { formatter: (params: unknown) => string };
        xAxis: { axisLabel: { formatter: (value: string) => string } };
      };
    };

    const tooltipFormatter = chartProps.option.tooltip.formatter;
    const withArrayParams = tooltipFormatter([{ dataIndex: 0 }]);
    const withSingleParams = tooltipFormatter({ dataIndex: 1 });
    const withMissingRow = tooltipFormatter([{ dataIndex: 99 }]);

    expect(withArrayParams).toContain('判定: 超過');
    expect(withSingleParams).toContain('判定: 予定内');
    expect(withMissingRow).toBe('');

    const axisFormatter = chartProps.option.xAxis.axisLabel.formatter;
    expect(axisFormatter('とても長いタイトルABCDEFGHIJK').endsWith('...')).toBe(true);
    expect(axisFormatter('短い')).toBe('短い');
  });

  it('keeps invalid date input unchanged on shortcut move', () => {
    useTodoContextMock.mockReturnValue({
      todos: [
        createTodo({
          id: 'done-1',
          status: 'Completed',
          startedAt: '2026-04-04T10:00:00.000Z',
          dueDate: '2026-04-04T12:00:00.000Z',
        }),
      ],
    } as never);

    render(<PlanActualPage />);

    const input = screen.getByLabelText('集計開始日') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');

    const registration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    act(() => {
      registration?.shortcuts.find((item) => item.id === 'plan-actual-prev-day')?.action();
    });

    expect(input.value).toBe('');
  });
});
