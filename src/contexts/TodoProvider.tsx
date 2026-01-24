import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { todoDB } from '../common/db';
import type { Todo, ModalState, TodoContextType } from '../common/types';
import { defaultForm } from '../common/utils';
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
        const dependentTodo = todo.dependency ? getTodo(todo.dependency) : null;
        const isDependencyIncomplete =
          dependentTodo && dependentTodo.status !== 'Completed';

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
        const newTodos = todos.filter((todo) => todo.id !== id);
        newTodos.forEach((todo) => {
          if (todo.dependency === id) todo.dependency = '';
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
    setForm,
    setModal,
    setNotificationEnabled,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};
