import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityPage } from '@/features/availability/pages/AvailabilityPage';
import { useTodoContext } from '@/app/providers/TodoContext';
import { DEFAULT_WORK_SCHEDULE } from '@/features/work-schedule/model/settings';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { todoDB } from '@/features/todo/model/db';

const chartSpy = vi.fn();

vi.mock('echarts-for-react', () => ({
  default: (props: unknown) => {
    chartSpy(props);
    return <div data-testid="availability-chart" />;
  },
}));

vi.mock('@/app/providers/TodoContext', () => ({
  useTodoContext: vi.fn(),
}));

vi.mock('@/features/shortcuts/context/ShortcutContext', () => ({
  useRegisterShortcuts: vi.fn(),
}));

vi.mock('@/features/availability/hooks/useStableAvailabilityTodos', () => ({
  useStableAvailabilityTodos: (todos: unknown[]) => todos,
}));

vi.mock('@/features/availability/hooks/useAvailabilityCharts', () => ({
  useAvailabilityCharts: vi.fn(),
}));

vi.mock('@/features/todo/model/db', () => ({
  todoDB: {
    fetchForAvailability: vi.fn(),
  },
}));

const useTodoContextMock = vi.mocked(useTodoContext);
const useRegisterShortcutsMock = vi.mocked(useRegisterShortcuts);
const fetchForAvailabilityMock = vi.mocked(todoDB.fetchForAvailability);

describe('AvailabilityPage', () => {
  beforeEach(async () => {
    chartSpy.mockReset();
    const { useAvailabilityCharts } =
      await import('@/features/availability/hooks/useAvailabilityCharts');
    vi.mocked(useAvailabilityCharts).mockReturnValue([]);
    fetchForAvailabilityMock.mockResolvedValue([]);

    useTodoContextMock.mockReturnValue({
      todos: [],
      workSchedule: DEFAULT_WORK_SCHEDULE,
    } as never);
  });

  it('shows empty period message when no chart can be rendered', () => {
    render(<AvailabilityPage />);

    expect(screen.getByText('指定期間内に描画対象の稼働日がありません。')).toBeInTheDocument();
  });

  it('renders chart when load data exists', async () => {
    const { useAvailabilityCharts } =
      await import('@/features/availability/hooks/useAvailabilityCharts');
    vi.mocked(useAvailabilityCharts).mockReturnValue([
      {
        dateLabel: '4/4(土)',
        maxLoad: 1.2,
        overloadedSlots: 1,
        hasLoad: true,
        option: { series: [] },
      },
    ] as never);

    render(<AvailabilityPage />);

    expect(screen.getByTestId('availability-chart')).toBeInTheDocument();
    expect(screen.getByText('4/4(土)')).toBeInTheDocument();
  });

  it('focuses chart section by number shortcuts', async () => {
    const { useAvailabilityCharts } =
      await import('@/features/availability/hooks/useAvailabilityCharts');
    vi.mocked(useAvailabilityCharts).mockReturnValue([
      {
        dateLabel: '4/4(土)',
        maxLoad: 1.2,
        overloadedSlots: 1,
        hasLoad: true,
        option: { series: [] },
      },
      {
        dateLabel: '4/5(日)',
        maxLoad: 0.8,
        overloadedSlots: 0,
        hasLoad: true,
        option: { series: [] },
      },
    ] as never);

    render(<AvailabilityPage />);

    const registration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    expect(registration).toBeDefined();

    act(() => {
      registration?.shortcuts.find(item => item.id === 'availability-focus-chart-2')?.action();
    });

    expect(screen.getByTestId('availability-chart-section-2')).toHaveFocus();
  });

  it('renders no-load text and no-break business-hour text', async () => {
    const { useAvailabilityCharts } =
      await import('@/features/availability/hooks/useAvailabilityCharts');
    vi.mocked(useAvailabilityCharts).mockReturnValue([
      {
        dateLabel: '4/7(火)',
        maxLoad: 0,
        overloadedSlots: 0,
        hasLoad: false,
        option: { series: [] },
      },
    ] as never);

    useTodoContextMock.mockReturnValue({
      todos: [],
      workSchedule: {
        ...DEFAULT_WORK_SCHEDULE,
        breakPeriods: [],
      },
    } as never);

    render(<AvailabilityPage />);

    expect(
      screen.getByText(
        '4/7(火) の業務時間帯 (09:00-17:00 (休憩なし)) に重なるタスクがありません。',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(content => content.includes('稼働時間帯は'))).toBeInTheDocument();
  });

  it('changes date by input and registered shortcuts', async () => {
    const { useAvailabilityCharts } =
      await import('@/features/availability/hooks/useAvailabilityCharts');
    vi.mocked(useAvailabilityCharts).mockReturnValue([]);

    render(<AvailabilityPage />);

    const input = screen.getByLabelText('対象日') as HTMLInputElement;
    const initialDate = input.value;

    fireEvent.change(input, { target: { value: '2026-04-08' } });
    expect(input.value).toBe('2026-04-08');

    const registration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    expect(registration).toBeDefined();

    act(() => {
      registration?.shortcuts.find(item => item.id === 'availability-prev-day')?.action();
    });
    expect(input.value).toBe('2026-04-07');

    const latestRegistration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    act(() => {
      latestRegistration?.shortcuts.find(item => item.id === 'availability-next-day')?.action();
    });
    expect(input.value).toBe('2026-04-08');

    act(() => {
      latestRegistration?.shortcuts.find(item => item.id === 'availability-today')?.action();
    });
    expect(input.value).toBe(initialDate);

    fireEvent.change(input, { target: { value: '' } });
    const invalidRegistration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    act(() => {
      invalidRegistration?.shortcuts.find(item => item.id === 'availability-prev-day')?.action();
    });
    expect(input.value).toBe('');
  });
});
