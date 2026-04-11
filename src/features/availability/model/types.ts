import type { EChartsOption } from 'echarts';

export const SLOT_MINUTES = 30;
export const DISPLAY_WINDOW_DAYS = 7;
export const HOUR_MS = 60 * 60 * 1000;
export const SLOT_MS = SLOT_MINUTES * 60 * 1000;

export type TimeSlot = {
  label: string;
  start: Date;
  end: Date;
  isWorking: boolean;
  isElapsed: boolean;
};

export type Interval = {
  startMs: number;
  endMs: number;
};

export type SlotContributor = {
  taskId: string;
  title: string;
  load: number;
};

export type DatedTimeSlot = TimeSlot & {
  dateStr: string;
};

export type AggregatedLoad = {
  slots: TimeSlot[];
  taskSeries: Array<{ id: string; title: string; data: number[] }>;
  meetingSeries: number[];
  slotTotals: number[];
  slotContributors: SlotContributor[][];
};

export type AvailabilityChartData = AggregatedLoad & {
  option: EChartsOption;
  hasLoad: boolean;
  maxLoad: number;
  overloadedSlots: number;
  dateLabel: string;
};
