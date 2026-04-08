import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { todoDB } from '@/features/todo/model/db';
import type { Todo, ModalState, TodoContextType, ImportResult } from '@/features/todo/model/types';
import {
  defaultForm,
  getTodoTitleFallback,
  getDependencyIds,
  isMeetingTodo,
  normalizeTodo,
  todosToJSON,
  todosFromJSON,
} from '@/features/todo/model/todo-utils';
import { getRecurringHorizonRange } from '@/features/todo/model/recurring-utils';
import {
  DEFAULT_WORK_SCHEDULE,
  sanitizeWorkSchedule,
  WORK_SCHEDULE_STORAGE_KEY,
} from '@/features/work-schedule/model/settings';
import i18n from '@/shared/i18n';
import { TodoContext } from './TodoContext';

// LocalStorage に保存するキー
const NOTIFIED_TODOS_KEY = 'notified-todos';
const NOTIFICATION_PERMISSION_KEY = 'notificationPermission';
const IN_PROGRESS_TODO_KEY = 'in-progress-todo';
const RECURRING_SYNC_LAST_RUN_DATE_KEY = 'recurring-sync-last-run-date';
const MEETING_AUTOCOMPLETE_INTERVAL_MS = 30_000;
const TODO_PAGE_SIZE = 20;

interface TodoProviderProps {
  children: ReactNode;
}

export const TodoProvider: React.FC<TodoProviderProps> = ({ children }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadedOffset, setLoadedOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isTodosLoaded, setIsTodosLoaded] = useState(false);
  const [isInProgressRestoreDone, setIsInProgressRestoreDone] = useState(false);
  const [form, setForm] = useState<Partial<Todo>>(defaultForm);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(
    () =>
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'granted',
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
  const todoMapRef = useRef<Map<string, Todo>>(new Map());
  const currentInProgressIdRef = useRef<string | null>(null);
  const currentInProgressStartedAtRef = useRef<number | null>(null);
  const trackedElapsedSecondsRef = useRef(0);
  const hasRestoredInProgressRef = useRef(false);

  const notifyPersistenceError = useCallback((error: unknown, messageKey: string) => {
    console.error('Todo persistence error:', error);
    toast.error(i18n.t(messageKey));
  }, []);

  const collectDependencyIds = useCallback((sourceTodos: Todo[]) => {
    return [...new Set(sourceTodos.flatMap(todo => getDependencyIds(todo)))];
  }, []);

  const syncTodoMap = useCallback((visibleTodos: Todo[], extraTodos: Todo[] = []) => {
    const nextMap = new Map<string, Todo>();
    [...visibleTodos, ...extraTodos].forEach(todo => {
      nextMap.set(todo.id, todo);
    });
    todoMapRef.current = nextMap;
  }, []);

  const appendTodos = useCallback((current: Todo[], next: Todo[]) => {
    const seen = new Set(current.map(todo => todo.id));
    const merged = [...current];
    next.forEach(todo => {
      if (seen.has(todo.id)) {
        return;
      }

      seen.add(todo.id);
      merged.push(todo);
    });
    return merged;
  }, []);

  const fetchMissingDependencies = useCallback(
    async (sourceTodos: Todo[]) => {
      const dependencyIds = collectDependencyIds(sourceTodos);
      const missingDependencyIds = dependencyIds.filter(depId => !todoMapRef.current.has(depId));

      if (missingDependencyIds.length === 0) {
        return [] as Todo[];
      }

      const dependencies = await todoDB.bulkGetByIds(missingDependencyIds);
      return dependencies.map(normalizeTodo);
    },
    [collectDependencyIds],
  );

  const fetchTodos = useCallback(async () => {
    try {
      const [pageRows, count] = await Promise.all([
        todoDB.fetchPage(0, TODO_PAGE_SIZE),
        todoDB.fetchTotalCount(),
      ]);
      const visibleTodos = pageRows.map(normalizeTodo);
      todoMapRef.current = new Map(visibleTodos.map(todo => [todo.id, todo]));
      const dependencyTodos = await fetchMissingDependencies(visibleTodos);

      syncTodoMap(visibleTodos, dependencyTodos);
      todosRef.current = visibleTodos;
      setTodos(visibleTodos);
      setLoadedOffset(visibleTodos.length);
      setTotalCount(count);
    } catch (error) {
      notifyPersistenceError(error, 'todo.toast.migrationFailed');
      setIsInProgressRestoreDone(true);
    }
    setIsTodosLoaded(true);
  }, [fetchMissingDependencies, notifyPersistenceError, syncTodoMap]);

  const loadMoreTodos = useCallback(async () => {
    if (loadedOffset >= totalCount) {
      return;
    }

    try {
      const [pageRows, count] = await Promise.all([
        todoDB.fetchPage(loadedOffset, TODO_PAGE_SIZE),
        todoDB.fetchTotalCount(),
      ]);
      const nextTodos = pageRows.map(normalizeTodo);
      const mergedTodos = appendTodos(todosRef.current, nextTodos);

      todosRef.current = mergedTodos;
      setTodos(mergedTodos);
      setLoadedOffset(Math.min(loadedOffset + nextTodos.length, count));
      setTotalCount(count);

      nextTodos.forEach(todo => {
        todoMapRef.current.set(todo.id, todo);
      });

      const dependencyTodos = await fetchMissingDependencies(nextTodos);
      dependencyTodos.forEach(todo => {
        todoMapRef.current.set(todo.id, todo);
      });
    } catch (error) {
      notifyPersistenceError(error, 'todo.toast.persistenceFailed');
    }
  }, [appendTodos, fetchMissingDependencies, loadedOffset, notifyPersistenceError, totalCount]);

  const hasMoreTodos = loadedOffset < totalCount;
  const completeTodos = useCallback(
    async (ids: string[]) => {
      const targetIds = new Set(ids);
      if (targetIds.size === 0) {
        return false;
      }

      const completedAt = new Date().toISOString();
      let changed = false;

      const updatedById = new Map<string, Todo>();

      let newTodos = todosRef.current.map(todo => {
        if (!targetIds.has(todo.id) || todo.status === 'Completed') {
          updatedById.set(todo.id, todo);
          return todo;
        }

        changed = true;
        const updatedTodo = { ...todo, status: 'Completed' as const, completedAt };
        updatedById.set(updatedTodo.id, updatedTodo);
        return updatedTodo;
      });

      const impactedTodos = await todoDB.fetchDependentsByDependencyIds([...targetIds]);
      const normalizedImpactedTodos = impactedTodos.map(normalizeTodo);

      normalizedImpactedTodos.forEach(todo => {
        if (!updatedById.has(todo.id)) {
          updatedById.set(todo.id, todo);
        }
      });

      const missingDepIds = new Set<string>();
      normalizedImpactedTodos.forEach(todo => {
        getDependencyIds(todo).forEach(depId => {
          if (!updatedById.has(depId) && !todoMapRef.current.has(depId)) {
            missingDepIds.add(depId);
          }
        });
      });

      if (missingDepIds.size > 0) {
        const dependencyRows = await todoDB.bulkGetByIds([...missingDepIds]);
        dependencyRows.map(normalizeTodo).forEach(todo => {
          todoMapRef.current.set(todo.id, todo);
        });
      }

      const dependencyLookup = new Map<string, Todo>(todoMapRef.current);
      updatedById.forEach((todo, id) => {
        dependencyLookup.set(id, todo);
      });

      const updatedImpactedTodos: Todo[] = [];
      normalizedImpactedTodos.forEach(todo => {
        if (!todo.dependsOn) {
          return;
        }

        const depIds = getDependencyIds(todo);
        if (!depIds.some(depId => targetIds.has(depId))) {
          return;
        }

        const allDepsCompleted = depIds.every(depId => {
          const depTodo = dependencyLookup.get(depId);
          return depTodo?.status === 'Completed';
        });

        if (!allDepsCompleted) {
          return;
        }

        const maxCompletedAt = depIds
          .map(depId => dependencyLookup.get(depId)?.completedAt)
          .filter(Boolean)
          .sort()
          .pop();

        if (maxCompletedAt && maxCompletedAt !== todo.startableAt) {
          changed = true;
          const updatedTodo = { ...todo, startableAt: maxCompletedAt };
          updatedImpactedTodos.push(updatedTodo);
          updatedById.set(updatedTodo.id, updatedTodo);
        }
      });

      if (!changed) {
        return false;
      }

      try {
        const changedTodos = [...updatedById.values()].filter(
          todo => targetIds.has(todo.id) || updatedImpactedTodos.some(item => item.id === todo.id),
        );

        if (changedTodos.length > 0) {
          await todoDB.bulkPut(changedTodos);
        }

        const visibleTodoLookup = new Map(newTodos.map(todo => [todo.id, todo]));
        updatedImpactedTodos.forEach(todo => {
          if (visibleTodoLookup.has(todo.id)) {
            visibleTodoLookup.set(todo.id, todo);
          }
        });

        newTodos = [...visibleTodoLookup.values()];
        todosRef.current = newTodos;
        setTodos(newTodos);
        changedTodos.forEach(todo => {
          todoMapRef.current.set(todo.id, todo);
        });
        return true;
      } catch (error) {
        notifyPersistenceError(error, 'todo.toast.persistenceFailed');
        return false;
      }
    },
    [notifyPersistenceError],
  );

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
    if (!isTodosLoaded) {
      return;
    }

    const runRecurringSync = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const lastRunDate = localStorage.getItem(RECURRING_SYNC_LAST_RUN_DATE_KEY);

      if (lastRunDate === today) {
        return;
      }

      try {
        const { from, to } = getRecurringHorizonRange(new Date());
        const generatedTodos = await todoDB.syncRecurringTodosInRange(from, to);

        localStorage.setItem(RECURRING_SYNC_LAST_RUN_DATE_KEY, today);

        if (generatedTodos.length > 0) {
          await fetchTodos();
        }
      } catch (error) {
        notifyPersistenceError(error, 'todo.toast.persistenceFailed');
      }
    };

    void runRecurringSync();
  }, [fetchTodos, isTodosLoaded, notifyPersistenceError]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const isDev = import.meta.env.DEV;
      const swPath = isDev ? `${baseUrl}dev-sw.js?dev-sw` : `${baseUrl}sw.js`;
      const scope = baseUrl;

      navigator.serviceWorker
        .register(swPath, { scope })
        .then(reg => {
          console.log('ServiceWorker registered', swPath, reg.scope);
        })
        .catch(error => {
          console.error('ServiceWorker registration failed:', error);
        });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WORK_SCHEDULE_STORAGE_KEY, JSON.stringify(workSchedule));
  }, [workSchedule]);

  const getTodo = useCallback((id: string) => todoMapRef.current.get(id), []);

  useEffect(() => {
    const showNotification = (title: string, options: NotificationOptions) => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        });
      }
    };

    const checkForNotifications = () => {
      if (Notification.permission !== 'granted') {
        return;
      }

      const notifiedTodoIds: string[] = JSON.parse(
        localStorage.getItem(NOTIFIED_TODOS_KEY) || '[]',
      );
      const now = new Date();

      todos.forEach(todo => {
        if (isMeetingTodo(todo)) {
          return;
        }

        const startableAt = new Date(todo.startableAt || todo.createdAt);
        const dependentTodos = getDependencyIds(todo)
          .map(getTodo)
          .filter((t): t is Todo => Boolean(t));
        const isDependencyIncomplete = dependentTodos.some(t => t.status !== 'Completed');

        const isReady = todo.status === 'Unlocked' && startableAt <= now && !isDependencyIncomplete;

        if (isReady && !notifiedTodoIds.includes(todo.id)) {
          showNotification(i18n.t('notifications.browserNotificationTitle'), {
            body: i18n.t('notifications.browserNotificationBody', { title: todo.title }),
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
        .filter(todo => {
          if (!isMeetingTodo(todo) || todo.status === 'Completed') {
            return false;
          }

          const end = new Date(todo.dueDate);
          return !Number.isNaN(end.getTime()) && end.getTime() <= now;
        })
        .map(todo => todo.id);

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
        message: i18n.t('notifications.unsupportedBrowser'),
        onConfirm: () => setModal(null),
      });
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
        setNotificationEnabled(true);
      } else {
        localStorage.removeItem(NOTIFICATION_PERMISSION_KEY);
        setNotificationEnabled(false);
      }
    });
  };

  const syncInProgressActualWork = useCallback(
    async (stopAfterSync = false) => {
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
        const currentTodo = todosRef.current.find(todo => todo.id === activeId);
        const updatedTodo = currentTodo
          ? {
              ...currentTodo,
              actualWorkSeconds: (currentTodo.actualWorkSeconds || 0) + deltaSeconds,
            }
          : null;
        const newTodos = updatedTodo
          ? todosRef.current.map(todo => (todo.id === activeId ? updatedTodo : todo))
          : todosRef.current;

        trackedElapsedSecondsRef.current = elapsedSeconds;
        todosRef.current = newTodos;
        setTodos(newTodos);
        if (updatedTodo) {
          try {
            await todoDB.put(updatedTodo);
            todoMapRef.current.set(updatedTodo.id, updatedTodo);
          } catch (error) {
            notifyPersistenceError(error, 'todo.toast.persistenceFailed');
          }
        }
      }

      if (stopAfterSync) {
        trackedElapsedSecondsRef.current = 0;
        currentInProgressIdRef.current = null;
        currentInProgressStartedAtRef.current = null;
        setCurrentInProgressId(null);
        setCurrentInProgressStartedAt(null);
      }
    },
    [notifyPersistenceError],
  );

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

    const targetTodo = todosRef.current.find(todo => todo.id === parsedState.id);
    if (!targetTodo || targetTodo.status === 'Completed' || isMeetingTodo(targetTodo)) {
      localStorage.removeItem(IN_PROGRESS_TODO_KEY);
      setIsInProgressRestoreDone(true);
      return;
    }

    const now = Date.now();
    const restoreDeltaSeconds = Math.max(0, Math.floor((now - parsedState.startedAt) / 1000));

    if (restoreDeltaSeconds > 0) {
      const currentTodo = todosRef.current.find(todo => todo.id === parsedState.id);
      const updatedTodo = currentTodo
        ? {
            ...currentTodo,
            actualWorkSeconds: (currentTodo.actualWorkSeconds || 0) + restoreDeltaSeconds,
          }
        : null;
      const updatedTodos = updatedTodo
        ? todosRef.current.map(todo => (todo.id === parsedState.id ? updatedTodo : todo))
        : todosRef.current;
      todosRef.current = updatedTodos;
      setTodos(updatedTodos);
      if (updatedTodo) {
        void todoDB.put(updatedTodo).then(
          () => {
            todoMapRef.current.set(updatedTodo.id, updatedTodo);
          },
          error => {
            notifyPersistenceError(error, 'todo.toast.persistenceFailed');
          },
        );
      }
    }

    trackedElapsedSecondsRef.current = 0;
    currentInProgressIdRef.current = parsedState.id;
    currentInProgressStartedAtRef.current = now;
    setCurrentInProgressId(parsedState.id);
    setCurrentInProgressStartedAt(now);

    localStorage.setItem(
      IN_PROGRESS_TODO_KEY,
      JSON.stringify({ id: parsedState.id, startedAt: now }),
    );
    setIsInProgressRestoreDone(true);
  }, [isTodosLoaded, notifyPersistenceError]);

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
    const targetTodo = todosRef.current.find(todo => todo.id === id);
    const todoTitle = targetTodo?.title?.trim() || getTodoTitleFallback();

    setModal({
      message: i18n.t('todo.confirm.delete', { title: todoTitle }),
      onConfirm: async () => {
        if (currentInProgressIdRef.current === id) {
          await syncInProgressActualWork(true);
        }
        const deletedAt = new Date().toISOString();
        const dependentTodos = (await todoDB.fetchDependentsByDependencyIds([id])).map(
          normalizeTodo,
        );
        const updatedDependents: Todo[] = [];
        dependentTodos.forEach(todo => {
          const originalDeps = getDependencyIds(todo);
          const newDeps = originalDeps.filter(depId => depId !== id);
          const dependencyChanged = newDeps.length < originalDeps.length;
          if (!dependencyChanged) {
            return;
          }

          updatedDependents.push({
            ...todo,
            dependsOn: newDeps.length > 0 ? newDeps : undefined,
            startableAt: deletedAt,
          });
        });

        try {
          await todoDB.delete(id);
          if (updatedDependents.length > 0) {
            await todoDB.bulkPut(updatedDependents);
          }
        } catch (error) {
          notifyPersistenceError(error, 'todo.toast.persistenceFailed');
          return;
        }

        const updatedDependentsById = new Map(updatedDependents.map(todo => [todo.id, todo]));
        const newTodos = todosRef.current
          .filter(todo => todo.id !== id)
          .map(todo => updatedDependentsById.get(todo.id) ?? todo);

        todoMapRef.current.delete(id);
        updatedDependents.forEach(todo => {
          todoMapRef.current.set(todo.id, todo);
        });
        setTotalCount(current => Math.max(0, current - 1));
        setLoadedOffset(newTodos.length);
        todosRef.current = newTodos;
        setTodos(newTodos);
        setModal(null);
      },
    });
  };

  const handleComplete = (id: string) => {
    const targetTodo = todosRef.current.find(todo => todo.id === id);
    const todoTitle = targetTodo?.title?.trim() || getTodoTitleFallback();

    setModal({
      message: i18n.t('todo.confirm.complete', { title: todoTitle }),
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
    const targetTodo = todosRef.current.find(todo => todo.id === id);
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
      const updatedTodo: Todo = { ...targetTodo, startedAt: firstStartedAt };
      const updatedTodos = todosRef.current.map(todo => (todo.id === id ? updatedTodo : todo));
      todosRef.current = updatedTodos;
      setTodos(updatedTodos);
      try {
        await todoDB.put(updatedTodo);
        todoMapRef.current.set(updatedTodo.id, updatedTodo);
      } catch (error) {
        notifyPersistenceError(error, 'todo.toast.persistenceFailed');
      }
    }

    trackedElapsedSecondsRef.current = 0;
    const startedAt = Date.now();
    currentInProgressIdRef.current = id;
    currentInProgressStartedAtRef.current = startedAt;
    setCurrentInProgressId(id);
    setCurrentInProgressStartedAt(startedAt);
  };

  const exportTodos = async () => {
    const exportSource = await todoDB.fetchAll();
    const json = todosToJSON(exportSource.map(normalizeTodo));
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

  const exportTodosToText = async () => {
    const exportSource = await todoDB.fetchAll();
    return todosToJSON(exportSource.map(normalizeTodo));
  };

  const importTodosFromText = async (fileContent: string): Promise<ImportResult> => {
    try {
      const importedTodos = todosFromJSON(fileContent);

      const existingRows = await todoDB.bulkGetByIds(importedTodos.map(todo => todo.id));
      const existingIds = new Set(existingRows.map(todo => todo.id));
      let addedCount = 0;
      let updatedCount = 0;

      importedTodos.forEach(todo => {
        if (existingIds.has(todo.id)) {
          updatedCount += 1;
          return;
        }
        addedCount += 1;
      });

      try {
        await todoDB.bulkPut(importedTodos.map(normalizeTodo));
      } catch (error) {
        notifyPersistenceError(error, 'todo.toast.persistenceFailed');
        return {
          success: false,
          addedCount: 0,
          updatedCount: 0,
          message: i18n.t('todo.toast.persistenceFailed'),
        };
      }

      await fetchTodos();

      return {
        success: true,
        addedCount,
        updatedCount,
        message: i18n.t('todo.importResult.summary', { addedCount, updatedCount }),
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
    loadMoreTodos,
    hasMoreTodos,
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
