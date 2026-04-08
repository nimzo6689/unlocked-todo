import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Clock3,
  Info,
  ListTodo,
  Repeat,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import type { TFunction } from 'i18next';

export type NavigationItem = {
  key: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  children?: NavigationItem[];
};

export const getNavigationItems = (t: TFunction): NavigationItem[] => [
  { key: 'todos', label: t('navigation.todos'), path: '/', icon: ListTodo },
  {
    key: 'availability',
    label: t('navigation.availability'),
    path: '/availability',
    icon: CalendarDays,
  },
  {
    key: 'plan-actual',
    label: t('navigation.planActual'),
    path: '/plan-actual',
    icon: BarChart3,
  },
  {
    key: 'settings-help',
    label: t('navigation.settingsHelp'),
    icon: Settings2,
    children: [
      {
        key: 'settings-notifications',
        label: t('navigation.notifications'),
        path: '/settings/general',
        icon: Bell,
      },
      {
        key: 'settings-work-hours',
        label: t('navigation.workHours'),
        path: '/settings/work-hours',
        icon: Clock3,
      },
      {
        key: 'settings-recurring',
        label: t('navigation.recurring'),
        path: '/settings/recurring',
        icon: Repeat,
      },
      {
        key: 'help-usage',
        label: t('navigation.usage'),
        path: '/help/usage',
        icon: BookOpen,
      },
      {
        key: 'help-about',
        label: t('navigation.about'),
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
