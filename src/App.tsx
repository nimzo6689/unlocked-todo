import React, { useEffect, useState, useRef } from 'react';
import { marked } from 'marked';
import './App.css';

type Todo = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  startableAt: string;
  dueDate: string;
  status: 'Active' | 'Waiting' | 'Completed';
  effort: number;
  assignee: '自分' | '他人';
  dependency?: string;
};

const DB_NAME = 'shokubunTodoDB';
const DB_VERSION = 1;
const OBJECT_STORE_NAME = 'todos';

const NOTIFIED_TODOS_KEY = 'notified-todos';
const NOTIFICATION_PERMISSION_KEY = 'notificationPermission';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as IDBDatabase);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBRequest).result as IDBDatabase;
      if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

const todoDB = {
  fetch: async (): Promise<Todo[]> => {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([OBJECT_STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
      const request = objectStore.getAll();
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result as Todo[]);
      };
      request.onerror = () => resolve([]);
    });
  },
  save: async (todos: Todo[]) => {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
      const clearRequest = objectStore.clear();
      clearRequest.onsuccess = () => {
        todos.forEach((todo) => objectStore.put(todo));
        transaction.oncomplete = () => resolve(undefined);
      };
      clearRequest.onerror = () => resolve(undefined);
    });
  },
};

function formatDate(isoString?: string) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateForInput(isoString?: string) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const tzoffset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - tzoffset)
    .toISOString()
    .slice(0, 16);
  return localISOTime;
}

type View = 'list' | 'form';

const defaultForm: Partial<Todo> = {
  title: '',
  description: '',
  startableAt: new Date().toISOString(),
  dueDate: '',
  status: 'Active',
  effort: 0,
  assignee: '自分',
  dependency: '',
};

const statusClasses: Record<string, string> = {
  Active: 'bg-blue-100 text-blue-800',
  Waiting: 'bg-purple-100 text-purple-800',
  Completed: 'bg-green-100 text-green-800',
};
const assigneeClasses: Record<string, string> = {
  自分: 'bg-indigo-100 text-indigo-800',
  他人: 'bg-pink-100 text-pink-800',
};

const filterButtons = [
  { key: 'active', label: 'Active' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [view, setView] = useState<View>('list');
  // editIdは未使用なので削除
  const [filter, setFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt'>('dueDate');
  const [form, setForm] = useState<Partial<Todo>>(defaultForm);
  const [modal, setModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // 初期ロード
  useEffect(() => {
    todoDB.fetch().then(setTodos);
  }, []);

  // Service Worker 登録
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // 通知チェック
  useEffect(() => {
    const interval = setInterval(() => checkForNotifications(), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos]);

  // 通知ボタン状態
  const notificationEnabled =
    localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'granted' &&
    Notification.permission === 'granted';

  // Todo取得
  const getTodo = (id: string) => todos.find((t) => t.id === id);

  // 通知
  function showNotification(title: string, options: NotificationOptions) {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, options);
      });
    }
  }

  async function checkForNotifications() {
    if (Notification.permission !== 'granted') return;
    const now = new Date();
    const notifiedTodoIds: string[] = JSON.parse(
      sessionStorage.getItem(NOTIFIED_TODOS_KEY) || '[]'
    );
    todos.forEach((todo) => {
      const startableAt = new Date(todo.startableAt || todo.createdAt);
      const dependentTodo = todo.dependency ? getTodo(todo.dependency) : null;
      const isDependencyIncomplete = dependentTodo && dependentTodo.status !== 'Completed';
      const isReady =
        todo.status === 'Active' &&
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
    sessionStorage.setItem(NOTIFIED_TODOS_KEY, JSON.stringify(notifiedTodoIds));
  }

  // CRUD
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    let newTodos = [...todos];
    if (form.id) {
      newTodos = newTodos.map((todo) =>
        todo.id === form.id ? { ...todo, ...form } as Todo : todo
      );
    } else {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        createdAt: now,
        startableAt: form.startableAt || now,
        title: form.title || '',
        description: form.description || '',
        dueDate: form.dueDate || '',
        status: form.status as Todo['status'] || 'Active',
        effort: form.effort || 0,
        assignee: form.assignee as Todo['assignee'] || '自分',
        dependency: form.dependency || '',
      };
      newTodos.push(newTodo);
    }
    await todoDB.save(newTodos);
    setTodos(await todoDB.fetch());
    setView('list');
  // setEditId 削除
    setForm(defaultForm);
  }

  function handleEdit(id: string) {
  // setEditId 削除
    setForm(getTodo(id) || defaultForm);
    setView('form');
  }
  function handleNew() {
  // setEditId 削除
    setForm(defaultForm);
    setView('form');
  }
  function handleDelete(id: string) {
    setModal({
      message: 'このTodoを本当に削除しますか？\nこの操作は取り消せません。',
      onConfirm: async () => {
        const newTodos = todos.filter((todo) => todo.id !== id);
        newTodos.forEach((todo) => {
          if (todo.dependency === id) todo.dependency = '';
        });
        await todoDB.save(newTodos);
        setTodos(await todoDB.fetch());
        setModal(null);
      },
    });
  }
  function handleCancel() {
    setView('list');
  // setEditId 削除
    setForm(defaultForm);
  }
  function handleFilterChange(f: string) {
    setFilter(f);
  }
  function handleSortChange(s: 'dueDate' | 'createdAt') {
    setSortBy(s);
  }

  // 通知許可
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      alert('このブラウザは通知をサポートしていません。');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
    } else {
      localStorage.removeItem(NOTIFICATION_PERMISSION_KEY);
    }
  }

  // フィルタリング
  const filteredTodos = todos.filter((todo) => {
    const now = new Date();
    const startableAt = new Date(todo.startableAt || todo.createdAt);
    const dependentTodo = todo.dependency ? getTodo(todo.dependency) : null;
    const isDependencyIncomplete = dependentTodo && dependentTodo.status !== 'Completed';
    if (filter === 'all') return true;
    if (filter === 'completed') return todo.status === 'Completed';
    if (filter === 'active') {
      return todo.status === 'Active' && startableAt <= now && !isDependencyIncomplete;
    }
    if (filter === 'waiting') {
      return (
        todo.status === 'Waiting' ||
        (todo.status === 'Active' && (startableAt > now || isDependencyIncomplete))
      );
    }
    return false;
  });

  filteredTodos.sort((a, b) => {
    if (sortBy === 'dueDate') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Markdownプレビュー
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  useEffect(() => {
    const result = marked.parse(form.description || '');
    if (typeof result === 'string') {
      setPreviewHtml(result);
    } else if (result instanceof Promise) {
      result.then((html) => setPreviewHtml(html));
    }
  }, [form.description]);

  // --- UI ---
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <p className="text-slate-700 mb-6 whitespace-pre-line">{modal.message}</p>
            <div className="flex justify-end space-x-3">
              <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg" onClick={() => setModal(null)}>キャンセル</button>
              <button className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg" onClick={modal.onConfirm}>削除</button>
            </div>
          </div>
        </div>
      )}
      {view === 'list' && (
        <>
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Todoリスト</h1>
              <p className="text-slate-500 mt-1">現在 {filteredTodos.length} 件のタスクがあります。</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                className={`bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform hover:scale-105 ${notificationEnabled ? 'bg-slate-400 cursor-not-allowed' : ''}`}
                disabled={notificationEnabled}
                onClick={requestNotificationPermission}
              >
                {notificationEnabled ? '通知は有効です' : '通知を有効にする'}
              </button>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform hover:scale-105" onClick={handleNew}>
                新規作成
              </button>
            </div>
          </header>
          <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-600">フィルター:</span>
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                {filterButtons.map((btn) => (
                  <button
                    key={btn.key}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filter === btn.key ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:bg-slate-200'}`}
                    onClick={() => handleFilterChange(btn.key)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-600">ソート:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as 'dueDate' | 'createdAt')}
                className="border border-slate-300 rounded-md text-sm p-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="dueDate">期限順</option>
                <option value="createdAt">作成日順</option>
              </select>
            </div>
          </div>
          <main id="todo-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTodos.length > 0 ? (
              filteredTodos.map((todo) => {
                const now = new Date();
                const dueDate = new Date(todo.dueDate);
                const startableAt = new Date(todo.startableAt || todo.createdAt);
                const isOverdue = new Date(dueDate.getTime() - (todo.effort || 0) * 3600 * 1000) < now;
                const isDueToday = dueDate.toDateString() === now.toDateString();
                let cardBgClass = 'bg-white';
                if (todo.status !== 'Completed') {
                  if (isOverdue) {
                    cardBgClass = 'bg-red-100 border-red-300';
                  } else if (isDueToday) {
                    cardBgClass = 'bg-yellow-100 border-yellow-300';
                  }
                } else {
                  cardBgClass = 'bg-slate-50 opacity-70';
                }
                const dependentTodo = todo.dependency ? getTodo(todo.dependency) : null;
                const isDependencyIncomplete = dependentTodo && dependentTodo.status !== 'Completed';
                const isWaitingOnTime = todo.status === 'Active' && startableAt > now;
                let waitingReasonHtml = '';
                if (
                  filter === 'waiting' &&
                  (isDependencyIncomplete || isWaitingOnTime)
                ) {
                  if (isDependencyIncomplete) {
                    waitingReasonHtml = `<div class='col-span-2 mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md text-purple-700 text-xs'><strong>待機理由:</strong> 依存タスク「${dependentTodo?.title}」が未完了です。</div>`;
                  } else if (isWaitingOnTime) {
                    waitingReasonHtml = `<div class='col-span-2 mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md text-purple-700 text-xs'><strong>待機理由:</strong> 着手可能日時 (${formatDate(todo.startableAt)}) になっていません。</div>`;
                  }
                }
                return (
                  <div key={todo.id} className={`${cardBgClass} rounded-lg shadow-md p-4 border flex flex-col justify-between transition-shadow hover:shadow-lg`}>
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{todo.title}</h3>
                        <div className="flex-shrink-0 ml-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusClasses[todo.status]}`}>{todo.status}</span>
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 mb-3 markdown-preview" dangerouslySetInnerHTML={{ __html: marked.parse(todo.description || '') }} />
                    </div>
                    <div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-4 pt-4 border-t">
                        <div><strong>作成日:</strong> {formatDate(todo.createdAt)}</div>
                        <div><strong>着手可能日:</strong> {formatDate(todo.startableAt)}</div>
                        <div><strong>期限日:</strong> {formatDate(todo.dueDate)}</div>
                        <div><strong>工数:</strong> {todo.effort || 0} 時間</div>
                        <div className="col-span-2"><strong>担当:</strong> <span className={`font-semibold px-2 py-0.5 rounded-full ${assigneeClasses[todo.assignee]}`}>{todo.assignee}</span></div>
                        {dependentTodo && (
                          <div className="col-span-2">
                            <strong>依存Todo:</strong>
                            <span className="text-slate-700">{dependentTodo.title}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClasses[dependentTodo.status]}`}>{dependentTodo.status}</span>
                          </div>
                        )}
                        {waitingReasonHtml && (
                          <div className="col-span-2" dangerouslySetInnerHTML={{ __html: waitingReasonHtml }} />
                        )}
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <button onClick={() => handleEdit(todo.id)} className="text-sm bg-slate-500 hover:bg-slate-600 text-white font-semibold py-1 px-3 rounded-md">編集</button>
                        <button onClick={() => handleDelete(todo.id)} className="text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md">削除</button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500 col-span-full text-center py-10">タスクはありません。</p>
            )}
          </main>
        </>
      )}
      {view === 'form' && (
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{form.id ? 'Todoの編集' : 'Todoの新規作成'}</h1>
          <form onSubmit={handleSave}>
            <input type="hidden" value={form.id || ''} />
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">タイトル <span className="text-red-500">*</span></label>
              <input type="text" id="title" required value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">説明 (Markdown対応)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <textarea ref={descriptionRef} id="description" rows={8} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                <div id="markdown-preview-container" className="prose prose-sm p-3 border border-slate-200 rounded-md bg-slate-50 h-full min-h-[100px]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="startableAt" className="block text-sm font-medium text-slate-700 mb-1">着手可能日時</label>
                <input type="datetime-local" id="startableAt" value={formatDateForInput(form.startableAt)} onChange={e => setForm(f => ({ ...f, startableAt: new Date(e.target.value).toISOString() }))} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 mb-1">期限日時 <span className="text-red-500">*</span></label>
                <input type="datetime-local" id="dueDate" required value={formatDateForInput(form.dueDate)} onChange={e => setForm(f => ({ ...f, dueDate: new Date(e.target.value).toISOString() }))} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="effort" className="block text-sm font-medium text-slate-700 mb-1">工数 (時間)</label>
                <input type="number" id="effort" min={0} value={form.effort || 0} onChange={e => setForm(f => ({ ...f, effort: parseInt(e.target.value, 10) || 0 }))} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                <select id="status" value={form.status || 'Active'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Todo['status'] }))} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white">
                  <option value="Active">Active</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label htmlFor="assignee" className="block text-sm font-medium text-slate-700 mb-1">担当</label>
                <select id="assignee" value={form.assignee || '自分'} onChange={e => setForm(f => ({ ...f, assignee: e.target.value as Todo['assignee'] }))} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white">
                  <option value="自分">自分</option>
                  <option value="他人">他人</option>
                </select>
              </div>
            </div>
            <div className="mb-6">
              <label htmlFor="dependency" className="block text-sm font-medium text-slate-700 mb-1">依存Todo</label>
              <select id="dependency" value={form.dependency || ''} onChange={e => setForm(f => ({ ...f, dependency: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white">
                <option value="">なし</option>
                {todos.filter(t => t.id !== form.id).map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={handleCancel} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg">キャンセル</button>
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md">保存</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
