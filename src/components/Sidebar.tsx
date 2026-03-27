import { useState } from 'react';
import { Menu, type LucideIcon } from 'lucide-react';

export type SidebarItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

type SidebarProps = {
  items: SidebarItem[];
  currentPath?: string;
  onSelect?: (path: string) => void;
};

export const Sidebar = ({ items, currentPath, onSelect }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      className={`flex flex-col min-h-screen bg-slate-800 text-white transition-all duration-300 ease-in-out ${
        collapsed ? 'w-14' : 'w-48'
      }`}
    >
      <nav className="mt-2 flex flex-col gap-1 px-2">
        {/* トグルボタン */}
        <button
          onClick={() => setCollapsed(prev => !prev)}
          aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折り畳む'}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <Menu size={20} className="shrink-0" />
          {!collapsed && <span className="truncate">Unlocked Todo</span>}
        </button>

        {items.map(item => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => onSelect?.(item.path)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-slate-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
