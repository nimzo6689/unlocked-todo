import { useEffect, useState, useCallback } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { todoDB } from "./common/db";
import type { Todo } from "./common/db";
import { FormRoute } from "./components/FormRoute";
import { ListRoute } from "./components/ListRoute";

// LocalStorage に保存するキー
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

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [form, setForm] = useState<Partial<Todo>>(defaultForm);
  const [modal, setModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [notificationEnabled, setNotificationEnabled] = useState(
    () =>
      Notification.permission &&
      localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === "granted"
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
      navigator.serviceWorker.register("/sw.js");
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
      if (Notification.permission !== "granted") {
        return;
      }

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
                modal={modal}
                setModal={setModal}
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
