import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { todoDB } from '../common/db';
import type { Todo, ModalState, TodoContextType, ImportResult } from '../common/types';
import {
  defaultForm,
  getDependencyIds,
  isMeetingTodo,
  normalizeTodo,
  todosToJSON,
  todosFromJSON,
} from '../common/utils';
import {
  DEFAULT_WORK_SCHEDULE,
  sanitizeWorkSchedule,
  WORK_SCHEDULE_STORAGE_KEY,
} from '../common/settings';
import { TodoContext } from './TodoContext';

// LocalStorage に保存するキー
const NOTIFIED_TODOS_KEY = 'notified-todos';
const NOTIFICATION_PERMISSION_KEY = 'notificationPermission';
const IN_PROGRESS_TODO_KEY = 'in-progress-todo';
const MEETING_AUTOCOMPLETE_INTERVAL_MS = 30_000;

interface TodoProviderProps {
  children: ReactNode;
}

export const TodoProvider: React.FC<TodoProviderProps> = ({ children }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isTodosLoaded, setIsTodosLoaded] = useState(false);
  const [isInProgressRestoreDone, setIsInProgressRestoreDone] = useState(false);
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
  const hasRestoredInProgressRef = useRef(false);

  const fetchTodos = useCallback(async () => {
    const data = await todoDB.fetch();
    const normalizedTodos = data.map(normalizeTodo);
    todosRef.current = normalizedTodos;
    setTodos(normalizedTodos);
    setIsTodosLoaded(true);
  }, []);
  const completeTodos = useCallback(async (ids: string[]) => {
    const targetIds = new Set(ids);
    if (targetIds.size === 0) {
      return false;
    }

    const completedAt = new Date().toISOString();
    let changed = false;

    let newTodos = todosRef.current.map((todo) => {
      if (!targetIds.has(todo.id) || todo.status === 'Completed') {
        return todo;
      }

      changed = true;
      return { ...todo, status: 'Completed' as const, completedAt };
    });

    newTodos = newTodos.map((todo) => {
      if (!todo.dependency) {
        return todo;
      }

      const depIds = getDependencyIds(todo);
      if (!depIds.some((depId) => targetIds.has(depId))) {
        return todo;
      }

      const allDepsCompleted = depIds.every((depId) => {
        const depTodo = newTodos.find((item) => item.id === depId);
        return depTodo?.status === 'Completed';
      });

      if (!allDepsCompleted) {
        return todo;
      }

      const maxCompletedAt = depIds
        .map((depId) => newTodos.find((item) => item.id === depId)?.completedAt)
        .filter(Boolean)
        .sort()
        .pop();

      if (maxCompletedAt && maxCompletedAt !== todo.startableAt) {
        changed = true;
        return { ...todo, startableAt: maxCompletedAt };
      }

      return todo;
    });

    if (!changed) {
      return false;
    }

    todosRef.current = newTodos;
    setTodos(newTodos);
    await todoDB.save(newTodos);
    return true;
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
    if (!isTodosLoaded || !isInProgressRestoreDone) {
      return;
    }

    if (currentInProgressId && currentInProgressStartedAt !== null) {
      localStorage.setItem(
        IN_PROGRESS_TODO_KEY,
        JSON.stringify({ id: currentInProgressId, startedAt: currentInProgressStartedAt }),
      );
      return;
    }

    localStorage.removeItem(IN_PROGRESS_TODO_KEY);
  }, [currentInProgressId, currentInProgressStartedAt, isTodosLoaded, isInProgressRestoreDone]);

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
        if (isMeetingTodo(todo)) {
          return;
        }

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
            data: {
              url: `${import.meta.env.BASE_URL}#/?filter=unlocked`,
            },
          });
          notifiedTodoIds.push(todo.id);
        }
      });
      localStorage.setItem(NOTIFIED_TODOS_KEY, JSON.stringify(notifiedTodoIds));
    };

    const interval = setInterval(() => checkForNotifications(), MEETING_AUTOCOMPLETE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [todos, getTodo]);

  useEffect(() => {
    const syncCompletedMeetings = () => {
      const now = Date.now();
      const targetIds = todosRef.current
        .filter((todo) => {
          if (!isMeetingTodo(todo) || todo.status === 'Completed') {
            return false;
          }

          const end = new Date(todo.dueDate);
          return !Number.isNaN(end.getTime()) && end.getTime() <= now;
        })
        .map((todo) => todo.id);

      if (targetIds.length > 0) {
        void completeTodos(targetIds);
      }
    };

    syncCompletedMeetings();
    const interval = window.setInterval(syncCompletedMeetings, MEETING_AUTOCOMPLETE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [completeTodos]);

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
    if (!isTodosLoaded || hasRestoredInProgressRef.current) {
      return;
    }

    hasRestoredInProgressRef.current = true;

    let parsedState: { id: string; startedAt: number } | null = null;
    const savedState = localStorage.getItem(IN_PROGRESS_TODO_KEY);

    if (!savedState) {
      setIsInProgressRestoreDone(true);
      return;
    }

    try {
      const state = JSON.parse(savedState) as { id?: unknown; startedAt?: unknown };
      if (
        typeof state.id === 'string' &&
        state.id &&
        typeof state.startedAt === 'number' &&
        Number.isFinite(state.startedAt)
      ) {
        parsedState = { id: state.id, startedAt: state.startedAt };
      }
    } catch {
      parsedState = null;
    }

    if (!parsedState) {
      localStorage.removeItem(IN_PROGRESS_TODO_KEY);
      setIsInProgressRestoreDone(true);
      return;
    }

    const targetTodo = todosRef.current.find((todo) => todo.id === parsedState.id);
    if (!targetTodo || targetTodo.status === 'Completed' || isMeetingTodo(targetTodo)) {
      localStorage.removeItem(IN_PROGRESS_TODO_KEY);
      setIsInProgressRestoreDone(true);
      return;
    }

    const now = Date.now();
    const restoreDeltaSeconds = Math.max(0, Math.floor((now - parsedState.startedAt) / 1000));

    if (restoreDeltaSeconds > 0) {
      const updatedTodos = todosRef.current.map((todo) =>
        todo.id === parsedState.id
          ? {
              ...todo,
              actualWorkSeconds: (todo.actualWorkSeconds || 0) + restoreDeltaSeconds,
            }
          : todo,
      );
      todosRef.current = updatedTodos;
      setTodos(updatedTodos);
      void todoDB.save(updatedTodos);
    }

    trackedElapsedSecondsRef.current = 0;
    currentInProgressIdRef.current = parsedState.id;
    currentInProgressStartedAtRef.current = now;
    setCurrentInProgressId(parsedState.id);
    setCurrentInProgressStartedAt(now);

    localStorage.setItem(IN_PROGRESS_TODO_KEY, JSON.stringify({ id: parsedState.id, startedAt: now }));
    setIsInProgressRestoreDone(true);
  }, [isTodosLoaded]);

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
        await completeTodos([id]);
        setModal(null);
      },
    });
  };

  const startTodo = async (id: string) => {
    const targetTodo = todosRef.current.find((todo) => todo.id === id);
    if (!targetTodo || isMeetingTodo(targetTodo)) {
      return;
    }

    if (currentInProgressId === id) {
      await syncInProgressActualWork(true);
      return;
    }

    if (currentInProgressIdRef.current) {
      await syncInProgressActualWork(true);
    }

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

  const exportTodos = async () => {
    const json = todosToJSON(todosRef.current);
    const fileName = `todos-${new Date().toISOString().split('T')[0]}.json`;

    // showSaveFilePicker が利用可能かチェック
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (
          window as unknown as {
            showSaveFilePicker: (opts: {
              suggestedName: string;
              types: Array<{ description: string; accept: Record<string, string[]> }>;
            }) => Promise<FileSystemFileHandle>;
          }
        ).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'JSON File',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (err) {
        // ユーザーがキャンセルした場合はスルー、その他エラーもフォールバック
        if ((err as Error).name !== 'AbortError') {
          console.error('Save file error:', err);
        }
      }
    }

    // フォールバック: Blob + ダウンロード属性
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportTodosToText = () => todosToJSON(todosRef.current);

  const importTodosFromText = async (fileContent: string): Promise<ImportResult> => {
    try {
      const importedTodos = todosFromJSON(fileContent);

      // 既存 todos と id で突合して upsert を実行
      const existingIds = new Set(todosRef.current.map(t => t.id));
      let addedCount = 0;
      let updatedCount = 0;

      const mergedTodos = [...todosRef.current];
      for (const importedTodo of importedTodos) {
        const index = mergedTodos.findIndex(t => t.id === importedTodo.id);
        if (index >= 0) {
          // UPDATE: 既存IDは上書き
          mergedTodos[index] = importedTodo;
          updatedCount++;
        } else {
          // INSERT: 新規IDは追加
          mergedTodos.push(importedTodo);
          addedCount++;
        }
      }

      // 進行中タスクと衝突する場合、計測を同期停止
      if (currentInProgressIdRef.current && !existingIds.has(currentInProgressIdRef.current)) {
        const importedId = importedTodos.find(
          t => t.id === currentInProgressIdRef.current
        );
        if (!importedId) {
          // 進行中タスクが削除された場合も同期停止
          await syncInProgressActualWork(true);
        }
      }

      await todoDB.save(mergedTodos);
      await fetchTodos();

      return {
        success: true,
        addedCount,
        updatedCount,
        message: `${addedCount}件追加, ${updatedCount}件更新`,
      };
    } catch (err) {
      return {
        success: false,
        addedCount: 0,
        updatedCount: 0,
        message: (err as Error).message,
      };
    }
  };

  const importTodos = async (file: File): Promise<ImportResult> => {
    try {
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

      return importTodosFromText(fileContent);
    } catch (err) {
      return {
        success: false,
        addedCount: 0,
        updatedCount: 0,
        message: (err as Error).message,
      };
    }
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
    exportTodos,
    exportTodosToText,
    importTodos,
    importTodosFromText,
    setForm,
    setModal,
    setNotificationEnabled,
    setWorkSchedule,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};
