import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Clock3,
  Info,
  ListTodo,
  Settings2,
  type LucideIcon,
} from 'lucide-react';

export type NavigationItem = {
  key: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  children?: NavigationItem[];
};

export const navigationItems: NavigationItem[] = [
  { key: 'todos', label: 'タスク一覧', path: '/', icon: ListTodo },
  { key: 'availability', label: '空き状況', path: '/availability', icon: CalendarDays },
  { key: 'plan-actual', label: '予実管理', path: '/plan-actual', icon: BarChart3 },
  {
    key: 'settings-help',
    label: '設定とヘルプ',
    icon: Settings2,
    children: [
      {
        key: 'settings-notifications',
        label: '通知設定',
        path: '/settings/notifications',
        icon: Bell,
      },
      {
        key: 'settings-work-hours',
        label: '稼働設定',
        path: '/settings/work-hours',
        icon: Clock3,
      },
      {
        key: 'help-usage',
        label: '使い方',
        path: '/help/usage',
        icon: BookOpen,
      },
      {
        key: 'help-about',
        label: 'アプリ情報',
        path: '/help/about',
        icon: Info,
      },
    ],
  },
];

export const isNavigationItemActive = (item: NavigationItem, currentPath?: string): boolean => {
  if (!currentPath) {
    return false;
  }

  if (item.path === currentPath) {
    return true;
  }

  return item.children?.some(child => isNavigationItemActive(child, currentPath)) ?? false;
};

export const getExpandedKeysForPath = (items: NavigationItem[], currentPath?: string): string[] => {
  if (!currentPath) {
    return [];
  }

  const expandedKeys = new Set<string>();

  const walk = (item: NavigationItem): boolean => {
    if (item.path === currentPath) {
      return true;
    }

    if (!item.children) {
      return false;
    }

    const childMatched = item.children.some(child => walk(child));
    if (childMatched) {
      expandedKeys.add(item.key);
    }
    return childMatched;
  };

  items.forEach(item => {
    walk(item);
  });

  return [...expandedKeys];
};
