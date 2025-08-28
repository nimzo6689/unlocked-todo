import React, { useEffect, useState } from 'react';
import './App.css';
import { todoDB } from './db';
import type { Todo } from './db';
import { TodoCard } from './components/TodoCard';
import { TodoForm } from './components/TodoForm';
import { Modal } from './components/Modal';


const NOTIFIED_TODOS_KEY = 'notified-todos';
const NOTIFICATION_PERMISSION_KEY = 'notificationPermission';


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

  // --- UI ---
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
      {modal && (
        <Modal message={modal.message} onConfirm={modal.onConfirm} onCancel={() => setModal(null)} />
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
              filteredTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  dependentTodo={todo.dependency ? getTodo(todo.dependency) : null}
                  filter={filter}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <p className="text-slate-500 col-span-full text-center py-10">タスクはありません。</p>
            )}
          </main>
        </>
      )}
      {view === 'form' && (
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{form.id ? 'Todoの編集' : 'Todoの新規作成'}</h1>
          <TodoForm
            form={form}
            todos={todos}
            onChange={setForm}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}

export default App;
