import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { todoDB } from '../common/db';
import type { Todo, ModalState, TodoContextType } from '../common/types';
import { defaultForm, getDependencyIds } from '../common/utils';
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
      Notification.permission &&
      localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'granted'
  );

  const fetchTodos = useCallback(async () => {
    const data = await todoDB.fetch();
    setTodos(data);
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

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

  const handleDelete = (id: string) => {
    setModal({
      message: 'このTodoを本当に削除しますか？\nこの操作は取り消せません。',
      onConfirm: async () => {
        const deletedAt = new Date().toISOString();
        const newTodos = todos.filter((todo) => todo.id !== id);
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
        const completedAt = new Date().toISOString();
        let newTodos = todos.map((todo) =>
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

  const value: TodoContextType = {
    todos,
    form,
    modal,
    notificationEnabled,
    fetchTodos,
    getTodo,
    setTodos,
    requestNotificationPermission,
    handleDelete,
    handleComplete,
    setForm,
    setModal,
    setNotificationEnabled,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};
