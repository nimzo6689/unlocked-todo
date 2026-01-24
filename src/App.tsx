import { HashRouter, Routes, Route } from "react-router-dom";
import { TodoFormPage } from "./pages/TodoFormPage";
import { TodoListPage } from "./pages/TodoListPage";
import { TodoProvider } from "./contexts/TodoProvider";

function App() {
  return (
    <TodoProvider>
      <HashRouter>
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
          <Routes>
            <Route
              path="/"
              element={<TodoListPage />}
            />
            <Route
              path="/new"
              element={<TodoFormPage />}
            />
            <Route
              path="/edit/:id"
              element={<TodoFormPage />}
            />
          </Routes>
        </div>
      </HashRouter>
    </TodoProvider>
  );
}

export default App;
