import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Todo } from '../common/types';
import {
  defaultForm,
  DEFAULT_EFFORT_MINUTES,
  DEFAULT_TASK_TYPE,
  getDependencyIds,
  getMeetingStatus,
  isMeetingTodo,
} from '../common/utils';

type UseTodoFormOptions = {
  todos: Todo[];
  form: Partial<Todo>;
  setForm: (form: Partial<Todo>) => void;
  getTodo: (id: string) => Todo | undefined;
  fetchTodos: () => Promise<void>;
  id: string | undefined;
};

export const useTodoForm = ({
  todos,
  form,
  setForm,
  getTodo,
  fetchTodos,
  id,
}: UseTodoFormOptions) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [successorIds, setSuccessorIds] = useState<string[]>([]);
  const initializedFormKeyRef = useRef<string | null>(null);

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
      const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0);
      if (dueDate <= now) dueDate.setDate(dueDate.getDate() + 1);

      setForm({
        ...defaultForm,
        taskType: DEFAULT_TASK_TYPE,
        startableAt: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
      });
      setSuccessorIds([]);
      initializedFormKeyRef.current = 'new';
    }
  }, [id, getTodo, setForm, todos]);

  const handleSave = async () => {
    const now = new Date().toISOString();
    let newTodos = [...todos];
    const taskType = form.taskType || DEFAULT_TASK_TYPE;
    const isMeeting = isMeetingTodo({ taskType });

    const dependency = Array.isArray(form.dependency)
      ? form.dependency.filter(Boolean)
      : form.dependency
      ? [form.dependency]
      : [];
    const normalizedDependency = isMeeting ? [] : dependency;
    const hasDependency = normalizedDependency.length > 0;

    if (form.id) {
      const currentTodoId = form.id;
      const safeSuccessorIds = isMeeting
        ? []
        : successorIds.filter(todoId => todoId !== currentTodoId);

      newTodos = newTodos.map(todo => {
        if (todo.id === currentTodoId) {
          return {
            ...todo,
            ...form,
            taskType,
            dependency: normalizedDependency,
            startableAt: hasDependency
              ? (form.startableAt || '')
              : (form.startableAt || todo.startableAt),
            status: isMeeting
              ? getMeetingStatus(form.dueDate || todo.dueDate, todo.status)
              : ((form.status as Todo['status']) || todo.status),
            effortMinutes: isMeeting ? 0 : (form.effortMinutes || todo.effortMinutes),
            actualWorkSeconds: isMeeting ? 0 : (todo.actualWorkSeconds || 0),
            assignee: isMeeting
              ? todo.assignee
              : ((form.assignee as Todo['assignee']) || todo.assignee),
          } as Todo;
        }

        const depIds = getDependencyIds(todo);
        const shouldDependOnCurrent = safeSuccessorIds.includes(todo.id);
        const alreadyDependsOnCurrent = depIds.includes(currentTodoId);

        if (!shouldDependOnCurrent && !alreadyDependsOnCurrent) return todo;

        if (shouldDependOnCurrent && !alreadyDependsOnCurrent) {
          return { ...todo, dependency: [...depIds, currentTodoId], startableAt: '' };
        }

        if (!shouldDependOnCurrent && alreadyDependsOnCurrent) {
          const nextDeps = depIds.filter(depId => depId !== currentTodoId);
          return { ...todo, dependency: nextDeps.length > 0 ? nextDeps : undefined };
        }

        return todo;
      });
    } else {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        createdAt: now,
        startableAt: hasDependency ? (form.startableAt || '') : (form.startableAt || now),
        title: form.title || '',
        description: form.description || '',
        taskType,
        dueDate: form.dueDate || '',
        status: isMeeting
          ? getMeetingStatus(form.dueDate || '')
          : ((form.status as Todo['status']) || 'Unlocked'),
        effortMinutes: isMeeting ? 0 : (form.effortMinutes || DEFAULT_EFFORT_MINUTES),
        actualWorkSeconds: 0,
        assignee: (form.assignee as Todo['assignee']) || '自分',
        dependency: normalizedDependency,
      };
      newTodos.push(newTodo);
    }

    const { todoDB } = await import('../common/db');
    await todoDB.save(newTodos);
    await fetchTodos();
    toast.success('保存しました');
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
    handleSave,
    handleComplete,
    handleCancel,
    handleOpenTodo,
  };
};
