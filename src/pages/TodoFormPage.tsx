import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TodoForm } from '../components/TodoForm';
import type { Todo } from '../common/types';
import {
  defaultForm,
  DEFAULT_EFFORT_MINUTES,
  DEFAULT_TASK_TYPE,
  getDependencyIds,
  getMeetingStatus,
  isMeetingTodo,
} from '../common/utils';
import { useTodoContext } from '../contexts/TodoContext';
import toast from 'react-hot-toast';
import { useRegisterShortcuts } from '../contexts/ShortcutContext';

const QUICK_EFFORT_VALUES = [5, 10, 25, 55, 115];

export const TodoFormPage = () => {
  const { todos, form, setForm, getTodo, fetchTodos } = useTodoContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [successorIds, setSuccessorIds] = useState<string[]>([]);
  const initializedFormKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (id) {
      if (initializedFormKeyRef.current === id) {
        return;
      }

      const todo = getTodo(id);
      if (!todo) {
        return;
      }

      setForm(todo);
      const successors = todos
        .filter(item => item.id !== todo.id && getDependencyIds(item).includes(todo.id))
        .map(item => item.id);
      setSuccessorIds(successors);
      initializedFormKeyRef.current = id;
    } else {
      if (initializedFormKeyRef.current === 'new') {
        return;
      }

      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0);
      if (dueDate <= now) {
        dueDate.setDate(dueDate.getDate() + 1);
      }
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

  async function handleSave() {
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
            startableAt: hasDependency ? (form.startableAt || '') : (form.startableAt || todo.startableAt),
            status: isMeeting
              ? getMeetingStatus(form.dueDate || todo.dueDate, todo.status)
              : ((form.status as Todo['status']) || todo.status),
            effortMinutes: isMeeting ? 0 : (form.effortMinutes || todo.effortMinutes),
            actualWorkSeconds: isMeeting ? 0 : (todo.actualWorkSeconds || 0),
            assignee: isMeeting ? todo.assignee : ((form.assignee as Todo['assignee']) || todo.assignee),
          } as Todo;
        }

        const depIds = getDependencyIds(todo);
        const shouldDependOnCurrent = safeSuccessorIds.includes(todo.id);
        const alreadyDependsOnCurrent = depIds.includes(currentTodoId);

        if (!shouldDependOnCurrent && !alreadyDependsOnCurrent) {
          return todo;
        }

        if (shouldDependOnCurrent && !alreadyDependsOnCurrent) {
          return {
            ...todo,
            dependency: [...depIds, currentTodoId],
            startableAt: '',
          };
        }

        if (!shouldDependOnCurrent && alreadyDependsOnCurrent) {
          const nextDeps = depIds.filter(depId => depId !== currentTodoId);
          return {
            ...todo,
            dependency: nextDeps.length > 0 ? nextDeps : undefined,
          };
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
    toast.success("保存しました");
  }

  async function handleComplete() {
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
  }

  function handleCancel() {
    initializedFormKeyRef.current = null;
    setForm(defaultForm);
    setSuccessorIds([]);
    navigate('/');
  }

  function handleOpenTodo(todoId: string) {
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = `/edit/${todoId}`;

    const openedWindow = window.open(nextUrl.toString(), '_blank', 'noopener,noreferrer');
    if (!openedWindow) {
      navigate(`/edit/${todoId}`);
    }
  }

  const shortcutRegistration = useMemo(() => {
    const isMeeting = isMeetingTodo({ taskType: form.taskType || DEFAULT_TASK_TYPE });

    return {
      pageLabel: id ? 'Todo 編集' : 'Todo 新規作成',
      shortcuts: [
        {
          id: 'form-save',
          description: 'フォームを保存する',
          category: 'フォーム操作' as const,
          bindings: ['mod+enter'],
          action: () => {
            void handleSave();
          },
          allowInInput: true,
        },
        {
          id: 'form-complete',
          description: '保存して一覧へ戻る',
          category: 'フォーム操作' as const,
          bindings: ['mod+shift+enter'],
          action: () => {
            void handleComplete();
          },
          allowInInput: true,
        },
        {
          id: 'form-cancel',
          description: '編集をキャンセルする',
          category: 'フォーム操作' as const,
          bindings: ['escape'],
          action: handleCancel,
          allowInInput: true,
        },
        ...QUICK_EFFORT_VALUES.map((value, index) => ({
          id: `form-effort-${value}`,
          description: `工数を ${value} 分に設定する`,
          category: 'ページ操作' as const,
          bindings: [`alt+${index + 1}`],
          action: () => setForm({ ...form, effortMinutes: value }),
          enabled: !isMeeting,
        })),
      ],
    };
  }, [form, id, setForm]);

  useRegisterShortcuts(shortcutRegistration);

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-xl max-w-md sm:max-w-2xl md:max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">{id ? 'Todoの編集' : 'Todoの新規作成'}</h1>
      <TodoForm
        form={form}
        todos={todos}
        actualWorkSeconds={form.id ? getTodo(form.id)?.actualWorkSeconds || 0 : 0}
        onChange={setForm}
        successorIds={successorIds}
        onSuccessorChange={setSuccessorIds}
        onSave={handleSave}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onOpenTodo={handleOpenTodo}
        saving={saving}
      />
    </div>
  );
};
