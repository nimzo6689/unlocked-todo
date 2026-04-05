import { useState } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { TodoFormPage } from '@/features/todo/pages/TodoFormPage';
import { TodoListPage } from '@/features/todo/pages/TodoListPage';
import { AvailabilityPage } from '@/features/availability/pages/AvailabilityPage';
import { PlanActualPage } from '@/features/analytics/pages/PlanActualPage';
import { NotificationsSettingsPage } from '@/features/notifications/pages/NotificationsSettingsPage';
import { WorkHoursPage } from '@/features/work-schedule/pages/WorkHoursPage';
import { AboutPage } from '@/features/about/pages/AboutPage';
import { UsagePage } from '@/features/usage/pages/UsagePage';
import { TodoProvider } from '@/app/providers/TodoProvider';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from '@/widgets/navigation/Sidebar';
import { Drawer } from '@/widgets/navigation/Drawer';
import { navigationItems } from '@/shared/config/navigation';
import { ShortcutProvider } from '@/features/shortcuts/context/ShortcutContext';

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <ShortcutProvider
      currentPath={location.pathname}
      drawerOpen={drawerOpen}
      setDrawerOpen={setDrawerOpen}
      navigate={navigate}
    >
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <div className="hidden md:block md:shrink-0">
          <Sidebar
            items={navigationItems}
            currentPath={location.pathname}
            onSelect={(path) => navigate(path)}
          />
        </div>

        <Drawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          items={navigationItems}
          currentPath={location.pathname}
          onSelect={(path) => navigate(path)}
        />

        <main className="h-screen flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur md:hidden">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="メニューを開く"
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Hakaru Todo</p>
              <p className="text-sm font-semibold text-slate-900">ナビゲーション</p>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<TodoListPage />} />
              <Route path="/new" element={<TodoFormPage />} />
              <Route path="/edit/:id" element={<TodoFormPage />} />
              <Route path="/availability" element={<AvailabilityPage />} />
              <Route path="/plan-actual" element={<PlanActualPage />} />
              <Route path="/settings/notifications" element={<NotificationsSettingsPage />} />
              <Route path="/settings/work-hours" element={<WorkHoursPage />} />
              <Route path="/help/about" element={<AboutPage />} />
              <Route path="/help/usage" element={<UsagePage />} />
            </Routes>
          </div>
        </main>

        <Toaster />
      </div>
    </ShortcutProvider>
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
