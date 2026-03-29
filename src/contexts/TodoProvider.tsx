import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { todoDB } from '../common/db';
import type { Todo, ModalState, TodoContextType } from '../common/types';
import { defaultForm, getDependencyIds } from '../common/utils';
import {
  DEFAULT_WORK_SCHEDULE,
  sanitizeWorkSchedule,
  WORK_SCHEDULE_STORAGE_KEY,
} from '../common/settings';
import { TodoContext } from './TodoContext';

// LocalStorage に保存するキー
const NOTIFIED_TODOS_KEY = 'notified-todos';
const NOTIFICATION_PERMISSION_KEY = 'notificationPermission';

interface TodoProviderProps {
  children: ReactNode;
}

export const TodoProvider: React.FC<TodoProviderProps> = ({ children }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [form, setForm] = useState<Partial<Todo>>(defaultForm);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(
    () =>
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'granted'
  );
  const [workSchedule, setWorkSchedule] = useState(() => {
    const storedValue = localStorage.getItem(WORK_SCHEDULE_STORAGE_KEY);
    if (!storedValue) {
      return DEFAULT_WORK_SCHEDULE;
    }

    try {
      return sanitizeWorkSchedule(JSON.parse(storedValue));
    } catch {
      return DEFAULT_WORK_SCHEDULE;
    }
  });
  const [currentInProgressId, setCurrentInProgressId] = useState<string | null>(null);
  const [currentInProgressStartedAt, setCurrentInProgressStartedAt] = useState<number | null>(null);
  const todosRef = useRef<Todo[]>([]);
  const currentInProgressIdRef = useRef<string | null>(null);
  const currentInProgressStartedAtRef = useRef<number | null>(null);
  const trackedElapsedSecondsRef = useRef(0);

  const fetchTodos = useCallback(async () => {
    const data = await todoDB.fetch();
    setTodos(
      data.map((todo) => ({
        ...todo,
        effortMinutes: Number.isFinite(Number(todo.effortMinutes))
          ? Math.max(0, Number(todo.effortMinutes))
          : 0,
        actualWorkSeconds: Number.isFinite(Number(todo.actualWorkSeconds))
          ? Math.max(0, Number(todo.actualWorkSeconds))
          : 0,
      })),
    );
  }, []);

  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  useEffect(() => {
    currentInProgressIdRef.current = currentInProgressId;
  }, [currentInProgressId]);

  useEffect(() => {
    currentInProgressStartedAtRef.current = currentInProgressStartedAt;
  }, [currentInProgressStartedAt]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const isDev = import.meta.env.DEV;
      const swPath = isDev
        ? `${baseUrl}dev-sw.js?dev-sw`
        : `${baseUrl}sw.js`;
      const scope = baseUrl;

      navigator.serviceWorker
        .register(swPath, { scope })
        .then((reg) => {
          console.log('ServiceWorker registered', swPath, reg.scope);
        })
        .catch((error) => {
          console.error('ServiceWorker registration failed:', error);
        });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WORK_SCHEDULE_STORAGE_KEY, JSON.stringify(workSchedule));
  }, [workSchedule]);

  const getTodo = useCallback(
    (id: string) => todos.find((t) => t.id === id),
    [todos]
  );

  useEffect(() => {
    const showNotification = (title: string, options: NotificationOptions) => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, options);
        });
      }
    };

    const checkForNotifications = () => {
      if (Notification.permission !== 'granted') {
        return;
      }

      const notifiedTodoIds: string[] = JSON.parse(
        localStorage.getItem(NOTIFIED_TODOS_KEY) || '[]'
      );
      const now = new Date();

      todos.forEach((todo) => {
        const startableAt = new Date(todo.startableAt || todo.createdAt);
        const dependentTodos = getDependencyIds(todo)
          .map(getTodo)
          .filter((t): t is Todo => Boolean(t));
        const isDependencyIncomplete = dependentTodos.some(
          (t) => t.status !== 'Completed',
        );

        const isReady =
          todo.status === 'Unlocked' &&
          startableAt <= now &&
          !isDependencyIncomplete;

        if (isReady && !notifiedTodoIds.includes(todo.id)) {
          showNotification('タスクが開始可能です！', {
            body: `「${todo.title}」に着手できます。`,
            icon: 'https://placehold.co/192x192/0ea5e9/ffffff?text=Todo',
          });
          notifiedTodoIds.push(todo.id);
        }
      });
      localStorage.setItem(NOTIFIED_TODOS_KEY, JSON.stringify(notifiedTodoIds));
    };

    const interval = setInterval(() => checkForNotifications(), 30_000);
    return () => clearInterval(interval);
  }, [todos, getTodo]);

  const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
      setModal({
        message: 'このブラウザは通知をサポートしていません。',
        onConfirm: () => setModal(null),
      });
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
        setNotificationEnabled(true);
      } else {
        localStorage.removeItem(NOTIFICATION_PERMISSION_KEY);
        setNotificationEnabled(false);
      }
    });
  };

  const syncInProgressActualWork = useCallback(async (stopAfterSync = false) => {
    const activeId = currentInProgressIdRef.current;
    const startedAt = currentInProgressStartedAtRef.current;

    if (!activeId || startedAt === null) {
      if (stopAfterSync) {
        trackedElapsedSecondsRef.current = 0;
        currentInProgressIdRef.current = null;
        currentInProgressStartedAtRef.current = null;
        setCurrentInProgressId(null);
        setCurrentInProgressStartedAt(null);
      }
      return;
    }

    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const deltaSeconds = elapsedSeconds - trackedElapsedSecondsRef.current;

    if (deltaSeconds > 0) {
      const newTodos = todosRef.current.map(todo =>
        todo.id === activeId
          ? {
              ...todo,
              actualWorkSeconds: (todo.actualWorkSeconds || 0) + deltaSeconds,
            }
          : todo,
      );

      trackedElapsedSecondsRef.current = elapsedSeconds;
      todosRef.current = newTodos;
      setTodos(newTodos);
      await todoDB.save(newTodos);
    }

    if (stopAfterSync) {
      trackedElapsedSecondsRef.current = 0;
      currentInProgressIdRef.current = null;
      currentInProgressStartedAtRef.current = null;
      setCurrentInProgressId(null);
      setCurrentInProgressStartedAt(null);
    }
  }, []);

  useEffect(() => {
    if (!currentInProgressId || currentInProgressStartedAt === null) {
      return;
    }

    const interval = window.setInterval(() => {
      void syncInProgressActualWork();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentInProgressId, currentInProgressStartedAt, syncInProgressActualWork]);

  const handleDelete = (id: string) => {
    setModal({
      message: 'このTodoを本当に削除しますか？\nこの操作は取り消せません。',
      onConfirm: async () => {
        if (currentInProgressIdRef.current === id) {
          await syncInProgressActualWork(true);
        }
        const deletedAt = new Date().toISOString();
        const newTodos = todosRef.current.filter((todo) => todo.id !== id);
        newTodos.forEach((todo) => {
          const originalDeps = getDependencyIds(todo);
          const newDeps = originalDeps.filter((depId) => depId !== id);
          const dependencyChanged = newDeps.length < originalDeps.length;
          todo.dependency = newDeps.length > 0 ? newDeps : undefined;
          if (dependencyChanged) {
            todo.startableAt = deletedAt;
          }
        });
        const { todoDB } = await import('../common/db');
        await todoDB.save(newTodos);
        setTodos(newTodos);
        setModal(null);
      },
    });
  };

  const handleComplete = (id: string) => {
    setModal({
      message: 'このTodoを完了にしますか？',
      onConfirm: async () => {
        if (currentInProgressIdRef.current === id) {
          await syncInProgressActualWork(true);
        }
        const completedAt = new Date().toISOString();
        let newTodos = todosRef.current.map((todo) =>
          todo.id === id ? { ...todo, status: 'Completed' as const, completedAt } : todo
        );
        // 依存関係をチェックして、startableAtを更新
        newTodos = newTodos.map((todo) => {
          if (!todo.dependency) return todo;
          const depIds = getDependencyIds(todo);
          if (depIds.includes(id)) {
            // この完了が依存に含まれている場合、全ての依存が完了しているかチェック
            const allDepsCompleted = depIds.every((depId) => {
              const depTodo = newTodos.find((t) => t.id === depId);
              return depTodo?.status === 'Completed';
            });
            if (allDepsCompleted) {
              // 全て完了したら、最も遅いcompletedAtをstartableAtに
              const maxCompletedAt = depIds
                .map((depId) => newTodos.find((t) => t.id === depId)?.completedAt)
                .filter(Boolean)
                .sort()
                .pop();
              return { ...todo, startableAt: maxCompletedAt || todo.startableAt };
            }
          }
          return todo;
        });
        const { todoDB } = await import('../common/db');
        await todoDB.save(newTodos);
        setTodos(newTodos);
        setModal(null);
      },
    });
  };

  const startTodo = async (id: string) => {
    if (currentInProgressId === id) {
      await syncInProgressActualWork(true);
      return;
    }

    if (currentInProgressIdRef.current) {
      await syncInProgressActualWork(true);
    }

    const targetTodo = todosRef.current.find((todo) => todo.id === id);
    if (targetTodo && !targetTodo.startedAt) {
      const firstStartedAt = new Date().toISOString();
      const updatedTodos = todosRef.current.map((todo) =>
        todo.id === id ? { ...todo, startedAt: firstStartedAt } : todo,
      );
      todosRef.current = updatedTodos;
      setTodos(updatedTodos);
      await todoDB.save(updatedTodos);
    }

    trackedElapsedSecondsRef.current = 0;
    const startedAt = Date.now();
    currentInProgressIdRef.current = id;
    currentInProgressStartedAtRef.current = startedAt;
    setCurrentInProgressId(id);
    setCurrentInProgressStartedAt(startedAt);
  };

  const value: TodoContextType = {
    todos,
    form,
    modal,
    notificationEnabled,
    workSchedule,
    currentInProgressId,
    fetchTodos,
    getTodo,
    setTodos,
    requestNotificationPermission,
    handleDelete,
    handleComplete,
    startTodo,
    setForm,
    setModal,
    setNotificationEnabled,
    setWorkSchedule,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};
