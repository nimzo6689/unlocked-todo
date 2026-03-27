import { useState } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { TodoFormPage } from './pages/TodoFormPage';
import { TodoListPage } from './pages/TodoListPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { TodoProvider } from './contexts/TodoProvider';
import { Toaster } from 'react-hot-toast';
import { Drawer } from './components/Drawer';
import type { DrawerItem } from './components/Drawer';

const drawerItems: DrawerItem[] = [
  { label: 'タスク一覧', path: '/' },
  { label: '空き状況', path: '/availability' },
];

const AppContent = () => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <Drawer
        open={isDrawerOpen}
        onOpenChange={setDrawerOpen}
        items={drawerItems}
        onSelect={path => navigate(path)}
      />

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
        <button
          className="mb-4 inline-flex items-center justify-center h-10 w-10 rounded-md bg-slate-800 text-white shadow hover:bg-slate-700 transition-transform duration-200 hover:scale-110 active:scale-95"
          onClick={() => setDrawerOpen(true)}
          aria-label="メニューを開く"
        >
          <Menu size={20} />
        </button>

        <Routes>
          <Route path="/" element={<TodoListPage />} />
          <Route path="/new" element={<TodoFormPage />} />
          <Route path="/edit/:id" element={<TodoFormPage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
        </Routes>
      </div>

      <Toaster />
    </>
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
