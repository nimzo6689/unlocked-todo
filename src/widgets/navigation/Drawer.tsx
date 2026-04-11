import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getExpandedKeysForPath,
  isNavigationItemActive,
  type NavigationItem,
} from '@/shared/config/navigation';
import {
  Drawer as UiDrawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
  DrawerHeader,
} from '@/shared/ui/drawer';

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavigationItem[];
  currentPath?: string;
  onSelect?: (path: string) => void;
};

export const Drawer = ({ open, onOpenChange, items, currentPath, onSelect }: DrawerProps) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() =>
    getExpandedKeysForPath(items, currentPath),
  );
  const { t } = useTranslation();
  const bottomAnchoredItemKey = 'settings-help';
  const primaryItems = items.filter(item => item.key !== bottomAnchoredItemKey);
  const bottomItems = items.filter(item => item.key === bottomAnchoredItemKey);

  useEffect(() => {
    const activeKeys = getExpandedKeysForPath(items, currentPath);
    if (activeKeys.length === 0) {
      return;
    }

    setExpandedKeys(previous => [...new Set([...previous, ...activeKeys])]);
  }, [items, currentPath]);

  const toggleExpanded = (key: string) => {
    setExpandedKeys(previous =>
      previous.includes(key)
        ? previous.filter(currentKey => currentKey !== key)
        : [...previous, key],
    );
  };

  const renderItems = (navigationItems: NavigationItem[], depth = 0) =>
    navigationItems.map(item => {
      const hasChildren = Boolean(item.children?.length);
      const isExpanded = expandedKeys.includes(item.key);
      const isActive = isNavigationItemActive(item, currentPath);
      const Icon = item.icon;

      return (
        <li key={item.key} className="space-y-1">
          <button
            onClick={() => {
              if (hasChildren) {
                toggleExpanded(item.key);
                return;
              }

              if (item.path) {
                onSelect?.(item.path);
                onOpenChange(false);
              }
            }}
            className={`flex w-full items-center gap-3 rounded-lg py-2 px-3 text-left transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-slate-700 hover:bg-slate-100'
            } ${depth > 0 ? 'pl-10' : ''}`}
          >
            {Icon ? <Icon size={depth === 0 ? 18 : 16} className="shrink-0" /> : null}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {hasChildren &&
              (isExpanded ? (
                <ChevronDown size={16} className="shrink-0" />
              ) : (
                <ChevronRight size={16} className="shrink-0" />
              ))}
          </button>

          {hasChildren && isExpanded && (
            <ul className="space-y-1">{renderItems(item.children ?? [], depth + 1)}</ul>
          )}
        </li>
      );
    });

  return (
    <UiDrawer open={open} onOpenChange={onOpenChange} direction="left">
      <DrawerContent className="flex min-h-screen w-[86vw] max-w-sm flex-col border-r border-slate-200 bg-white sm:min-h-dvh">
        <DrawerHeader className="flex items-center justify-between gap-2 p-4">
          <DrawerTitle>{t('drawer.title')}</DrawerTitle>
          <DrawerClose asChild>
            <button
              className="rounded-md p-1 text-slate-500 hover:text-slate-700"
              aria-label={t('drawer.close')}
            >
              <X size={18} />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <nav className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ul className="space-y-2">{renderItems(primaryItems)}</ul>
          </div>

          {bottomItems.length > 0 && (
            <div className="mt-auto border-t border-slate-200 pt-3">
              <ul className="space-y-2">{renderItems(bottomItems)}</ul>
            </div>
          )}
        </nav>
      </DrawerContent>
    </UiDrawer>
  );
};
