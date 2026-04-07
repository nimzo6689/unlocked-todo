import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import i18n from '@/shared/i18n';
import type { Todo } from '@/features/todo/model/types';
import {
  defaultForm,
  DEFAULT_EFFORT_MINUTES,
  DEFAULT_TASK_TYPE,
  getDependencyIds,
  getMeetingStatus,
  isMeetingTodo,
} from '@/features/todo/model/todo-utils';
import type { WorkSchedule } from '@/features/todo/model/types';

type UseTodoFormOptions = {
  todos: Todo[];
  form: Partial<Todo>;
  setForm: (form: Partial<Todo>) => void;
  getTodo: (id: string) => Todo | undefined;
  fetchTodos: () => Promise<void>;
  id: string | undefined;
  workSchedule: WorkSchedule;
};

const getDateAtHour = (baseDate: Date, hour: number) => {
  const next = new Date(baseDate);
  next.setHours(hour, 0, 0, 0);
  return next;
};

const isWorkingDay = (date: Date, schedule: WorkSchedule) =>
  schedule.workingDays.includes(date.getDay());

const isWithinWorkingHours = (now: Date, schedule: WorkSchedule) => {
  if (!isWorkingDay(now, schedule)) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = schedule.workStartHour * 60;
  const endMinutes = schedule.workEndHour * 60;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
};

const getWorkingDayByOffset = (
  baseDate: Date,
  schedule: WorkSchedule,
  offset: number,
  allowToday: boolean,
) => {
  const cursor = new Date(baseDate);
  cursor.setHours(0, 0, 0, 0);

  let found = 0;
  while (true) {
    const isToday =
      cursor.getTime() ===
      new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).getTime();
    if (isWorkingDay(cursor, schedule) && (allowToday || !isToday)) {
      if (found === offset) {
        return new Date(cursor);
      }
      found += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
};

const getStartOfWeek = (baseDate: Date) => {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const daysFromMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
};

const getFirstWorkingDayOfWeek = (weekStart: Date, schedule: WorkSchedule) => {
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + offset);
    if (isWorkingDay(day, schedule)) {
      return day;
    }
  }
  return new Date(weekStart);
};

const getLastWorkingDayOfWeek = (weekStart: Date, schedule: WorkSchedule) => {
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + offset);
    if (isWorkingDay(day, schedule)) {
      return day;
    }
  }
  return new Date(weekStart);
};

export const useTodoForm = ({
  todos,
  form,
  setForm,
  getTodo,
  fetchTodos,
  id,
  workSchedule,
}: UseTodoFormOptions) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [successorIds, setSuccessorIds] = useState<string[]>([]);
  const initializedFormKeyRef = useRef<string | null>(null);

  const normalizeActualWorkSeconds = (value: unknown) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }
    return Math.floor(numeric);
  };

  const getDueDateByQuickAction = useCallback(
    (quickAction: 'today' | 'tomorrow' | 'thisWeek', now: Date) => {
      const withinWorkingHours = isWithinWorkingHours(now, workSchedule);

      if (quickAction === 'thisWeek') {
        const weekStart = getStartOfWeek(now);
        const lastWorkingDay = getLastWorkingDayOfWeek(weekStart, workSchedule);
        return getDateAtHour(lastWorkingDay, workSchedule.workEndHour);
      }

      if (quickAction === 'today') {
        const target = getWorkingDayByOffset(now, workSchedule, 0, withinWorkingHours);
        return getDateAtHour(target, workSchedule.workEndHour);
      }

      const target = getWorkingDayByOffset(now, workSchedule, 1, withinWorkingHours);
      return getDateAtHour(target, workSchedule.workEndHour);
    },
    [workSchedule],
  );

  const getStartableAtByQuickAction = useCallback(
    (quickAction: 'now' | 'tomorrow' | 'nextWeek', now: Date) => {
      if (quickAction === 'now') {
        return new Date(now);
      }

      if (quickAction === 'tomorrow') {
        const target = getWorkingDayByOffset(now, workSchedule, 0, false);
        return getDateAtHour(target, workSchedule.workStartHour);
      }

      const thisWeekStart = getStartOfWeek(now);
      const nextWeekStart = new Date(thisWeekStart);
      nextWeekStart.setDate(thisWeekStart.getDate() + 7);
      const firstWorkingDay = getFirstWorkingDayOfWeek(nextWeekStart, workSchedule);
      return getDateAtHour(firstWorkingDay, workSchedule.workStartHour);
    },
    [workSchedule],
  );

  useEffect(() => {
    if (id) {
      if (initializedFormKeyRef.current === id) return;

      const todo = getTodo(id);
      if (!todo) return;

      setForm(todo);
      const successors = todos
        .filter(item => item.id !== todo.id && getDependencyIds(item).includes(todo.id))
        .map(item => item.id);
      setSuccessorIds(successors);
      initializedFormKeyRef.current = id;
    } else {
      if (initializedFormKeyRef.current === 'new') return;

      const now = new Date();
      const dueDate = getDueDateByQuickAction('tomorrow', now);

      setForm({
        ...defaultForm,
        taskType: DEFAULT_TASK_TYPE,
        startableAt: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
      });
      setSuccessorIds([]);
      initializedFormKeyRef.current = 'new';
    }
  }, [id, getDueDateByQuickAction, getTodo, setForm, todos]);

  const applyDueDateQuickAction = (quickAction: 'today' | 'tomorrow' | 'thisWeek') => {
    const dueDate = getDueDateByQuickAction(quickAction, new Date());
    setForm({
      ...form,
      dueDate: dueDate.toISOString(),
    });
  };

  const applyStartableAtQuickAction = (quickAction: 'now' | 'tomorrow' | 'nextWeek') => {
    const startableAt = getStartableAtByQuickAction(quickAction, new Date());
    setForm({
      ...form,
      startableAt: startableAt.toISOString(),
    });
  };

  const handleSave = async () => {
    const now = new Date().toISOString();
    const taskType = form.taskType || DEFAULT_TASK_TYPE;
    const isMeeting = isMeetingTodo({ taskType });

    if (form.startableAt && form.dueDate) {
      if (new Date(form.startableAt) >= new Date(form.dueDate)) {
        toast.error(i18n.t('todo.validation.startBeforeDue'));
        return;
      }
    }

    const dependency = Array.isArray(form.dependsOn)
      ? form.dependsOn.filter(Boolean)
      : form.dependsOn
        ? [form.dependsOn]
        : [];
    const normalizedDependency = isMeeting ? [] : dependency;
    const hasDependency = normalizedDependency.length > 0;
    const { todoDB } = await import('@/features/todo/model/db');

    if (form.id) {
      const currentTodoId = form.id;
      const currentTodo = getTodo(currentTodoId);
      if (!currentTodo) {
        toast.error(i18n.t('todo.validation.dependencyInvalid'));
        return;
      }

      const safeSuccessorIds = isMeeting
        ? []
        : successorIds.filter(todoId => todoId !== currentTodoId);

      const formActualWorkSeconds = normalizeActualWorkSeconds(form.actualWorkSeconds);
      const updatedCurrentTodo: Todo = {
        ...currentTodo,
        ...form,
        taskType,
        dependsOn: normalizedDependency,
        startableAt: hasDependency
          ? form.startableAt || ''
          : form.startableAt || currentTodo.startableAt,
        status: isMeeting
          ? getMeetingStatus(form.dueDate || currentTodo.dueDate, currentTodo.status)
          : (form.status as Todo['status']) || currentTodo.status,
        effortMinutes: isMeeting ? 0 : form.effortMinutes || currentTodo.effortMinutes,
        actualWorkSeconds: isMeeting ? 0 : formActualWorkSeconds,
      };

      const dependentTodos = await todoDB.fetchDependentsByDependencyIds([currentTodoId]);
      const successorFromContext = safeSuccessorIds
        .map(successorId => getTodo(successorId))
        .filter((todo): todo is Todo => Boolean(todo));
      const missingSuccessorIds = safeSuccessorIds.filter(
        successorId => !successorFromContext.some(todo => todo.id === successorId),
      );
      const successorFromDB = await todoDB.bulkGetByIds(missingSuccessorIds);

      const successorTargets = new Map<string, Todo>();
      [...dependentTodos, ...successorFromContext, ...successorFromDB].forEach(todo => {
        if (todo.id !== currentTodoId) {
          successorTargets.set(todo.id, todo);
        }
      });

      const updatedSuccessors: Todo[] = [];
      [...successorTargets.values()].forEach(todo => {
        const depIds = getDependencyIds(todo);
        const shouldDependOnCurrent = safeSuccessorIds.includes(todo.id);
        const alreadyDependsOnCurrent = depIds.includes(currentTodoId);

        if (!shouldDependOnCurrent && !alreadyDependsOnCurrent) {
          return;
        }

        if (shouldDependOnCurrent && !alreadyDependsOnCurrent) {
          updatedSuccessors.push({
            ...todo,
            dependsOn: [...depIds, currentTodoId],
            startableAt: '',
          });
          return;
        }

        if (!shouldDependOnCurrent && alreadyDependsOnCurrent) {
          const nextDeps = depIds.filter(depId => depId !== currentTodoId);
          updatedSuccessors.push({
            ...todo,
            dependsOn: nextDeps.length > 0 ? nextDeps : undefined,
          });
        }
      });

      await todoDB.put(updatedCurrentTodo);
      if (updatedSuccessors.length > 0) {
        await todoDB.bulkPut(updatedSuccessors);
      }
    } else {
      const formActualWorkSeconds = normalizeActualWorkSeconds(form.actualWorkSeconds);
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        createdAt: now,
        startableAt: hasDependency ? form.startableAt || '' : form.startableAt || now,
        title: form.title || '',
        description: form.description || '',
        taskType,
        dueDate: form.dueDate || '',
        status: isMeeting
          ? getMeetingStatus(form.dueDate || '')
          : (form.status as Todo['status']) || 'Unlocked',
        effortMinutes: isMeeting ? 0 : form.effortMinutes || DEFAULT_EFFORT_MINUTES,
        actualWorkSeconds: isMeeting ? 0 : formActualWorkSeconds,
        dependsOn: normalizedDependency,
      };
      await todoDB.put(newTodo);
    }

    await fetchTodos();
    toast.success(i18n.t('todo.toast.saveSuccess'));
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await handleSave();
      initializedFormKeyRef.current = null;
      setForm(defaultForm);
      setSuccessorIds([]);
      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    initializedFormKeyRef.current = null;
    setForm(defaultForm);
    setSuccessorIds([]);
    navigate('/');
  };

  const handleOpenTodo = (todoId: string) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = `/edit/${todoId}`;
    const openedWindow = window.open(nextUrl.toString(), '_blank', 'noopener,noreferrer');
    if (!openedWindow) navigate(`/edit/${todoId}`);
  };

  return {
    saving,
    successorIds,
    setSuccessorIds,
    applyDueDateQuickAction,
    applyStartableAtQuickAction,
    handleSave,
    handleComplete,
    handleCancel,
    handleOpenTodo,
  };
};
