import { useMemo } from 'react';
import type { Todo, WorkSchedule } from '@/features/todo/model/types';
import { buildChartOption } from '../model/chart-builder';
import { formatDateLabel } from '../model/datetime-utils';
import { aggregateLoadForDates } from '../model/load-allocator';
import { buildTimeSlots } from '../model/schedule-calculator';
import type { AvailabilityChartData } from '../model/types';

export const useAvailabilityCharts = (
  displayDates: string[],
  selfNormalTodos: Todo[],
  selfMeetings: Todo[],
  workSchedule: WorkSchedule,
): AvailabilityChartData[] => {
  return useMemo(() => {
    const loadsByDate = aggregateLoadForDates(
      selfNormalTodos,
      selfMeetings,
      displayDates,
      workSchedule,
    );

    return displayDates.map(dateStr => {
      const fallbackSlots = buildTimeSlots(dateStr, workSchedule);
      const load = loadsByDate[dateStr] ?? {
        slots: fallbackSlots,
        taskSeries: [],
        meetingSeries: fallbackSlots.map(() => 0),
        slotTotals: fallbackSlots.map(() => 0),
        slotContributors: fallbackSlots.map(() => []),
      };
      const hasLoad =
        load.slotTotals.some(value => value > 0) || load.meetingSeries.some(value => value > 0);
      const maxLoad = Math.max(...load.slotTotals, 0);
      const overloadedSlots = load.slotTotals.filter(value => value > 1).length;

      return {
        ...load,
        hasLoad,
        maxLoad,
        overloadedSlots,
        dateLabel: formatDateLabel(dateStr),
        option: buildChartOption(load, workSchedule),
      };
    });
  }, [displayDates, selfMeetings, selfNormalTodos, workSchedule]);
};
