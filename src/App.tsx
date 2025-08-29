import React, { useEffect, useState, useCallback } from "react";
import {
  HashRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
} from "react-router-dom";
import "./App.css";
import { todoDB } from "./db";
import type { Todo } from "./db";
import { TodoCard } from "./components/TodoCard";
import { TodoForm } from "./components/TodoForm";
import { Modal } from "./components/Modal";

// localStorageに保存するキー
const NOTIFIED_TODOS_KEY = "notified-todos";
const NOTIFICATION_PERMISSION_KEY = "notificationPermission";

const defaultForm: Partial<Todo> = {
  title: "",
  description: "",
  startableAt: new Date().toISOString(),
  dueDate: "",
  status: "Active",
  effort: 0,
  assignee: "自分",
  dependency: "",
};

const filterButtons = [
  { key: "active", label: "Active" },
  { key: "waiting", label: "Waiting" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

// ### FormRouteコンポーネントをAppの外に定義 ###
// 必要なstateや関数をpropsとして受け取る
const FormRoute = ({
  todos,
  form,
  onChange,
  getTodo,
  onSaveSuccess,
}: {
  todos: Todo[];
  form: Partial<Todo>;
  onChange: (form: Partial<Todo>) => void;
  getTodo: (id: string) => Todo | undefined;
  onSaveSuccess: () => Promise<void>;
}) => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      onChange(getTodo(id) || defaultForm);
    } else {
      onChange(defaultForm);
    }
    // getTodoとonChangeはuseCallbackでメモ化されているか、
    // stateセッターなので依存配列に含めても安全
  }, [id, getTodo, onChange]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    let newTodos = [...todos];

    if (form.id) {
      newTodos = newTodos.map((todo) =>
        todo.id === form.id ? ({ ...todo, ...form } as Todo) : todo
      );
    } else {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        createdAt: now,
        startableAt: form.startableAt || now,
        title: form.title || "",
        description: form.description || "",
        dueDate: form.dueDate || "",
        status: (form.status as Todo["status"]) || "Active",
        effort: form.effort || 0,
        assignee: (form.assignee as Todo["assignee"]) || "自分",
        dependency: form.dependency || "",
      };
      newTodos.push(newTodo);
    }

    await todoDB.save(newTodos);
    await onSaveSuccess(); // Appコンポーネントのtodosを再取得
    onChange(defaultForm); // フォームをリセット
    navigate("/"); // 一覧画面に戻る
  }

  function handleCancel() {
    onChange(defaultForm);
    navigate("/"); // 一覧画面に戻る
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {id ? "Todoの編集" : "Todoの新規作成"}
      </h1>
      <TodoForm
        form={form}
        todos={todos}
        onChange={onChange}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

// ### ListRouteコンポーネントもAppの外に定義 ###
const ListRoute = ({
  todos,
  getTodo,
  filter,
  sortBy,
  modal,
  setModal,
  handleFilterChange,
  handleSortChange,
  requestNotificationPermission,
  notificationEnabled,
}: {
  todos: Todo[];
  getTodo: (id: string) => Todo | undefined;
  filter: string;
  sortBy: "dueDate" | "createdAt";
  modal: { message: string; onConfirm: () => void } | null;
  setModal: (modal: { message: string; onConfirm: () => void } | null) => void;
  handleFilterChange: (f: string) => void;
  handleSortChange: (s: "dueDate" | "createdAt") => void;
  requestNotificationPermission: () => void;
  notificationEnabled: boolean;
}) => {
  const navigate = useNavigate();

  function handleEdit(id: string) {
    navigate(`/edit/${id}`);
  }
  function handleNew() {
    navigate("/new");
  }
  async function handleDelete(id: string) {
    setModal({
      message: "このTodoを本当に削除しますか？\nこの操作は取り消せません。",
      onConfirm: async () => {
        const newTodos = todos.filter((todo) => todo.id !== id);
        newTodos.forEach((todo) => {
          if (todo.dependency === id) todo.dependency = "";
        });
        await todoDB.save(newTodos);
        // Appコンポーネント側でtodosが更新されるのを待つ
        // ここで直接todosを更新する代わりに、親の再取得を促すのがより良い設計
        // 今回は親のonSnapshot等がないため、親のstate更新に任せる
        setModal(null);
      },
    });
  }

  const filteredTodos = todos
    .filter((todo) => {
      const now = new Date();
      const startableAt = new Date(todo.startableAt || todo.createdAt);
      const dependentTodo = todo.dependency ? getTodo(todo.dependency) : null;
      const isDependencyIncomplete =
        dependentTodo && dependentTodo.status !== "Completed";
      if (filter === "all") return true;
      if (filter === "completed") return todo.status === "Completed";
      if (filter === "active") {
        return (
          todo.status === "Active" &&
          startableAt <= now &&
          !isDependencyIncomplete
        );
      }
      if (filter === "waiting") {
        return (
          todo.status === "Waiting" ||
          (todo.status === "Active" &&
            (startableAt > now || isDependencyIncomplete))
        );
      }
      return false;
    })
    .sort((a, b) => {
      if (sortBy === "dueDate" && a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <>
      {modal && (
        <Modal
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Todoリスト</h1>
          <p className="text-slate-500 mt-1">
            現在 {filteredTodos.length} 件のタスクがあります。
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          <button
            className={`bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform hover:scale-105 ${
              notificationEnabled ? "bg-slate-400 cursor-not-allowed" : ""
            }`}
            disabled={notificationEnabled}
            onClick={requestNotificationPermission}
          >
            {notificationEnabled ? "通知は有効です" : "通知を有効にする"}
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform hover:scale-105"
            onClick={handleNew}
          >
            新規作成
          </button>
        </div>
      </header>
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-slate-600">
            フィルター:
          </span>
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            {filterButtons.map((btn) => (
              <button
                key={btn.key}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                  filter === btn.key
                    ? "bg-white text-blue-600 shadow"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
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
            onChange={(e) =>
              handleSortChange(e.target.value as "dueDate" | "createdAt")
            }
            className="border border-slate-300 rounded-md text-sm p-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="dueDate">期限順</option>
            <option value="createdAt">作成日順</option>
          </select>
        </div>
      </div>
      <main
        id="todo-list"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredTodos.length > 0 ? (
          filteredTodos.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              dependentTodo={todo.dependency ? getTodo(todo.dependency) : null}
              filter={filter}
              onEdit={handleEdit}
              onDelete={() => handleDelete(todo.id)}
            />
          ))
        ) : (
          <p className="text-slate-500 col-span-full text-center py-10">
            タスクはありません。
          </p>
        )}
      </main>
    </>
  );
};

// ### メインのAppコンポーネント ###
// stateの管理と、各コンポーネントへのpropsの受け渡しに専念
function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<string>("active");
  const [sortBy, setSortBy] = useState<"dueDate" | "createdAt">("dueDate");
  const [form, setForm] = useState<Partial<Todo>>(defaultForm);
  const [modal, setModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // 初回レンダリング時にlocalStorageとNotification.permissionをチェックして状態を初期化
  const [notificationEnabled, setNotificationEnabled] = useState(
    () => localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === "granted"
  );

  const fetchTodos = useCallback(async () => {
    const data = await todoDB.fetch();
    setTodos(data);
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const getTodo = useCallback(
    (id: string) => todos.find((t) => t.id === id),
    [todos]
  );

  useEffect(() => {
    const showNotification = (title: string, options: NotificationOptions) => {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, options);
        });
      }
    };

    const checkForNotifications = () => {
      if (Notification.permission !== "granted") return;
      const notifiedTodoIds: string[] = JSON.parse(
        localStorage.getItem(NOTIFIED_TODOS_KEY) || "[]"
      );
      const now = new Date();

      todos.forEach((todo) => {
        const startableAt = new Date(todo.startableAt || todo.createdAt);
        const dependentTodo = todo.dependency ? getTodo(todo.dependency) : null;
        const isDependencyIncomplete =
          dependentTodo && dependentTodo.status !== "Completed";

        const isReady =
          todo.status === "Active" &&
          startableAt <= now &&
          !isDependencyIncomplete;

        if (isReady && !notifiedTodoIds.includes(todo.id)) {
          showNotification("タスクが開始可能です！", {
            body: `「${todo.title}」に着手できます。`,
            icon: "https://placehold.co/192x192/0ea5e9/ffffff?text=Todo",
          });
          notifiedTodoIds.push(todo.id);
        }
      });
      localStorage.setItem(NOTIFIED_TODOS_KEY, JSON.stringify(notifiedTodoIds));
    };

    const interval = setInterval(() => checkForNotifications(), 30000);
    return () => clearInterval(interval);
  }, [todos, getTodo]);

  // async関数を削除し、直接thenで処理する
  function requestNotificationPermission() {
    if (!("Notification" in window)) {
      setModal({
        message: "このブラウザは通知をサポートしていません。",
        onConfirm: () => setModal(null),
      });
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "granted");
        setNotificationEnabled(true);
      } else {
        localStorage.removeItem(NOTIFICATION_PERMISSION_KEY);
        setNotificationEnabled(false);
      }
    });
  }

  return (
    <HashRouter>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
        <Routes>
          <Route
            path="/"
            element={
              <ListRoute
                todos={todos}
                getTodo={getTodo}
                filter={filter}
                sortBy={sortBy}
                modal={modal}
                setModal={setModal}
                handleFilterChange={setFilter}
                handleSortChange={setSortBy}
                requestNotificationPermission={requestNotificationPermission}
                notificationEnabled={notificationEnabled}
              />
            }
          />
          <Route
            path="/new"
            element={
              <FormRoute
                todos={todos}
                form={form}
                onChange={setForm}
                getTodo={getTodo}
                onSaveSuccess={fetchTodos}
              />
            }
          />
          <Route
            path="/edit/:id"
            element={
              <FormRoute
                todos={todos}
                form={form}
                onChange={setForm}
                getTodo={getTodo}
                onSaveSuccess={fetchTodos}
              />
            }
          />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
