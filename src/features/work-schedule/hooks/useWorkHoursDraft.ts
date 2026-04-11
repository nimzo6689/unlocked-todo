import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { BreakPeriod, WorkSchedule } from '@/features/todo/model/types';
import i18n from '@/shared/i18n';
import { normalizeBreakPeriods } from '@/features/work-schedule/model/settings';

const createDefaultBreakPeriod = (workStartHour: number, workEndHour: number): BreakPeriod => {
  const workStartMinute = workStartHour * 60;
  const workEndMinute = workEndHour * 60;
  const preferredStartMinute = 12 * 60;
  const startMinute = Math.max(workStartMinute, Math.min(preferredStartMinute, workEndMinute - 60));
  return {
    startMinute,
    endMinute: startMinute + 60,
  };
};

export const useWorkHoursDraft = (
  workSchedule: WorkSchedule,
  setWorkSchedule: (schedule: WorkSchedule) => void,
) => {
  const [draft, setDraft] = useState<WorkSchedule>(workSchedule);
  const [error, setError] = useState('');
  const hasNoBreak = draft.breakPeriods.length === 0;

  useEffect(() => {
    setDraft(workSchedule);
  }, [workSchedule]);

  const updateDraft = (updater: (current: WorkSchedule) => WorkSchedule) => {
    setDraft(current => updater(current));
    setError('');
  };

  const toggleNoBreak = (enabled: boolean) => {
    updateDraft(current => {
      if (enabled) {
        return { ...current, breakPeriods: [] };
      }
      return {
        ...current,
        breakPeriods:
          current.breakPeriods.length > 0
            ? current.breakPeriods
            : [createDefaultBreakPeriod(current.workStartHour, current.workEndHour)],
      };
    });
  };

  const toggleWorkingDay = (day: number) => {
    updateDraft(current => {
      const nextDays = current.workingDays.includes(day)
        ? current.workingDays.filter(d => d !== day)
        : [...current.workingDays, day].sort((l, r) => l - r);
      return { ...current, workingDays: nextDays };
    });
  };

  const addBreakPeriod = () => {
    updateDraft(current => ({
      ...current,
      breakPeriods: [
        ...current.breakPeriods,
        createDefaultBreakPeriod(current.workStartHour, current.workEndHour),
      ],
    }));
  };

  const removeBreakPeriod = (index: number) => {
    updateDraft(current => ({
      ...current,
      breakPeriods: current.breakPeriods.filter((_, i) => i !== index),
    }));
  };

  const updateBreakPeriod = (index: number, nextPeriod: BreakPeriod) => {
    updateDraft(current => {
      const nextBreakPeriods = current.breakPeriods.map((period, i) =>
        i === index ? nextPeriod : period,
      );
      return {
        ...current,
        breakPeriods: normalizeBreakPeriods(
          nextBreakPeriods,
          current.workStartHour,
          current.workEndHour,
        ),
      };
    });
  };

  const handleSave = () => {
    if (draft.workingDays.length === 0) {
      setError(i18n.t('workHours.validation.noWorkingDay'));
      return;
    }

    if (draft.workStartHour >= draft.workEndHour) {
      setError(i18n.t('workHours.validation.invalidHours'));
      return;
    }

    const normalizedBreakPeriods = normalizeBreakPeriods(
      draft.breakPeriods,
      draft.workStartHour,
      draft.workEndHour,
    );

    if (normalizedBreakPeriods.length !== draft.breakPeriods.length) {
      setError(i18n.t('workHours.validation.invalidBreaks'));
      return;
    }

    const nextSchedule = { ...draft, breakPeriods: normalizedBreakPeriods };
    setWorkSchedule(nextSchedule);
    setDraft(nextSchedule);
    toast.success(i18n.t('workHours.saveSuccess'));
  };

  return {
    draft,
    error,
    hasNoBreak,
    updateDraft,
    toggleNoBreak,
    toggleWorkingDay,
    addBreakPeriod,
    removeBreakPeriod,
    updateBreakPeriod,
    handleSave,
  };
};
