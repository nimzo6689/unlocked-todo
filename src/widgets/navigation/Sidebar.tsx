import { useEffect, useState } from 'react';
import { ChevronRight, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getExpandedKeysForPath,
  isNavigationItemActive,
  type NavigationItem,
} from '@/shared/config/navigation';

type SidebarProps = {
  items: NavigationItem[];
  currentPath?: string;
  onSelect?: (path: string) => void;
};

export const Sidebar = ({ items, currentPath, onSelect }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const { t } = useTranslation();
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() =>
    getExpandedKeysForPath(items, currentPath),
  );
  const bottomAnchoredItemKey = 'settings-help';
  const primaryItems = items.filter(item => item.key !== bottomAnchoredItemKey);
  const bottomItems = items.filter(item => item.key === bottomAnchoredItemKey);

  useEffect(() => {
    const activeKeys = getExpandedKeysForPath(items, currentPath).filter(
      key => key !== bottomAnchoredItemKey,
    );
    if (activeKeys.length === 0) {
      return;
    }

    setExpandedKeys(previous => [...new Set([...previous, ...activeKeys])]);
  }, [items, currentPath, bottomAnchoredItemKey]);

  const toggleExpanded = (key: string) => {
    setExpandedKeys(previous =>
      previous.includes(key)
        ? previous.filter(currentKey => currentKey !== key)
        : [...previous, key],
    );
  };

  const renderItems = (
    navigationItems: NavigationItem[],
    depth = 0,
    forceExpandedContent = false,
    popupParentKey?: string,
  ) =>
    navigationItems.map(item => {
      const Icon = item.icon;
      const hasChildren = Boolean(item.children?.length);
      const isExpanded = expandedKeys.includes(item.key);
      const isActive = isNavigationItemActive(item, currentPath);
      const isBottomAnchoredRoot = depth === 0 && item.key === bottomAnchoredItemKey;
      const basePaddingClass = depth === 0 ? 'px-2' : 'pl-11 pr-2';

      return (
        <div key={item.key} className={isBottomAnchoredRoot ? 'relative space-y-1' : 'space-y-1'}>
          <button
            onClick={() => {
              if (hasChildren) {
                toggleExpanded(item.key);
                return;
              }

              if (item.path) {
                if (popupParentKey) {
                  setExpandedKeys(previous =>
                    previous.filter(currentKey => currentKey !== popupParentKey),
                  );
                }
                onSelect?.(item.path);
              }
            }}
            title={collapsed ? item.label : undefined}
            className={`flex w-full items-center gap-3 rounded-lg ${basePaddingClass} py-2.5 text-sm transition-colors ${
              isActive
                ? 'bg-slate-600 text-white font-medium'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            } ${isBottomAnchoredRoot ? 'relative z-10' : ''}`}
          >
            {Icon ? (
              <Icon size={depth === 0 ? 20 : 16} className="shrink-0" />
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-full bg-current opacity-70" />
            )}
            {(forceExpandedContent || !collapsed) && (
              <>
                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                {hasChildren && (
                  <ChevronRight
                    size={16}
                    className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                )}
              </>
            )}
          </button>

          {isBottomAnchoredRoot && hasChildren && (
            <div
              className={`absolute bottom-full left-0 z-20 mb-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-700 bg-slate-800/95 p-1 shadow-2xl backdrop-blur-sm transition-all duration-150 ${
                isExpanded
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-1 opacity-0'
              }`}
              aria-hidden={!isExpanded}
            >
              <div className="max-h-[20rem] space-y-1 overflow-y-auto">
                {renderItems(
                  item.children ?? [],
                  depth + 1,
                  isBottomAnchoredRoot || forceExpandedContent,
                  isBottomAnchoredRoot ? item.key : popupParentKey,
                )}
              </div>
            </div>
          )}

          {!isBottomAnchoredRoot && hasChildren && isExpanded && (
            <div className="space-y-1">
              {renderItems(item.children ?? [], depth + 1, forceExpandedContent, popupParentKey)}
            </div>
          )}
        </div>
      );
    });

  return (
    <aside
      className={`app-sidebar sticky top-0 z-30 flex h-screen flex-col overflow-visible bg-slate-800 text-white transition-all duration-300 ease-in-out ${
        collapsed ? 'w-14' : 'w-48'
      }`}
    >
      <nav className="mt-2 flex min-h-0 flex-1 flex-col gap-1 px-2 pb-2">
        {/* トグルボタン */}
        <button
          onClick={() => setCollapsed(prev => !prev)}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <Menu size={20} className="shrink-0" />
          {!collapsed && <span className="truncate">{t('common.appName')}</span>}
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-1">{renderItems(primaryItems)}</div>

        {bottomItems.length > 0 && (
          <div className="mt-auto border-t border-slate-700 pt-2">{renderItems(bottomItems)}</div>
        )}
      </nav>
    </aside>
  );
};
