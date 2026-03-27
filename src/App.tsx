import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ListTodo, CalendarDays } from 'lucide-react';
import { TodoFormPage } from './pages/TodoFormPage';
import { TodoListPage } from './pages/TodoListPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { TodoProvider } from './contexts/TodoProvider';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './components/Sidebar';
import type { SidebarItem } from './components/Sidebar';

const sidebarItems: SidebarItem[] = [
  { label: 'タスク一覧', path: '/', icon: ListTodo },
  { label: '空き状況', path: '/availability', icon: CalendarDays },
];

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={sidebarItems}
        currentPath={location.pathname}
        onSelect={path => navigate(path)}
      />

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<TodoListPage />} />
          <Route path="/new" element={<TodoFormPage />} />
          <Route path="/edit/:id" element={<TodoFormPage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
        </Routes>
      </main>

      <Toaster />
    </div>
  );
};

function App() {
  return (
    <TodoProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </TodoProvider>
  );
}

export default App;
