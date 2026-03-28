import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Menu } from 'lucide-react';
import {
  getExpandedKeysForPath,
  isNavigationItemActive,
  type NavigationItem,
} from '../common/navigation';

type SidebarProps = {
  items: NavigationItem[];
  currentPath?: string;
  onSelect?: (path: string) => void;
};

export const Sidebar = ({ items, currentPath, onSelect }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => getExpandedKeysForPath(items, currentPath));
  const bottomAnchoredItemKey = 'settings-help';
  const primaryItems = items.filter((item) => item.key !== bottomAnchoredItemKey);
  const bottomItems = items.filter((item) => item.key === bottomAnchoredItemKey);

  useEffect(() => {
    const activeKeys = getExpandedKeysForPath(items, currentPath);
    if (activeKeys.length === 0) {
      return;
    }

    setExpandedKeys((previous) => [...new Set([...previous, ...activeKeys])]);
  }, [items, currentPath]);

  const toggleExpanded = (key: string) => {
    setExpandedKeys((previous) =>
      previous.includes(key)
        ? previous.filter((currentKey) => currentKey !== key)
        : [...previous, key],
    );
  };

  const renderItems = (navigationItems: NavigationItem[], depth = 0) =>
    navigationItems.map((item) => {
      const Icon = item.icon;
      const hasChildren = Boolean(item.children?.length);
      const isExpanded = expandedKeys.includes(item.key);
      const isActive = isNavigationItemActive(item, currentPath);
      const basePaddingClass = depth === 0 ? 'px-2' : 'pl-11 pr-2';

      return (
        <div key={item.key} className="space-y-1">
          <button
            onClick={() => {
              if (hasChildren) {
                if (collapsed) {
                  setCollapsed(false);
                }
                toggleExpanded(item.key);
                return;
              }

              if (item.path) {
                onSelect?.(item.path);
              }
            }}
            title={collapsed ? item.label : undefined}
            className={`flex w-full items-center gap-3 rounded-lg ${basePaddingClass} py-2.5 text-sm transition-colors ${
              isActive
                ? 'bg-slate-600 text-white font-medium'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {Icon ? (
              <Icon size={depth === 0 ? 20 : 16} className="shrink-0" />
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-full bg-current opacity-70" />
            )}
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                {hasChildren && (
                  isExpanded ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />
                )}
              </>
            )}
          </button>

          {!collapsed && hasChildren && isExpanded && (
            <div className="space-y-1">{renderItems(item.children ?? [], depth + 1)}</div>
          )}
        </div>
      );
    });

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col overflow-hidden bg-slate-800 text-white transition-all duration-300 ease-in-out ${
        collapsed ? 'w-14' : 'w-48'
      }`}
    >
      <nav className="mt-2 flex min-h-0 flex-1 flex-col gap-1 px-2 pb-2">
        {/* トグルボタン */}
        <button
          onClick={() => setCollapsed(prev => !prev)}
          aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折り畳む'}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <Menu size={20} className="shrink-0" />
          {!collapsed && <span className="truncate">Unlocked Todo</span>}
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-1">
          {renderItems(primaryItems)}
        </div>

        {bottomItems.length > 0 && (
          <div className="mt-auto border-t border-slate-700 pt-2">
            {renderItems(bottomItems)}
          </div>
        )}
      </nav>
    </aside>
  );
};
