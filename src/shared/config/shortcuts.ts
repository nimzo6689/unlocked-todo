import type { TFunction } from 'i18next';

export type ShortcutCategory =
  | 'ナビゲーション'
  | '一覧操作'
  | 'フォーム操作'
  | 'ダイアログ'
  | 'ページ操作';

export type ShortcutDefinition = {
  id: string;
  description: string;
  category: ShortcutCategory;
  bindings: string[];
  action: () => void;
  keys?: string[];
  enabled?: boolean;
  visible?: boolean;
  allowInInput?: boolean;
  allowInDialog?: boolean;
};

export type ShortcutRegistration = {
  pageLabel?: string;
  overlayOpen?: boolean;
  shortcuts: ShortcutDefinition[];
};

export type ShortcutHelpSection = {
  category: ShortcutCategory;
  items: Array<{
    id: string;
    description: string;
    keys: string[];
  }>;
};

export const SHORTCUT_CATEGORY_ORDER: ShortcutCategory[] = [
  'ナビゲーション',
  '一覧操作',
  'フォーム操作',
  'ダイアログ',
  'ページ操作',
];

const KEY_LABELS: Record<string, string> = {
  mod: 'Ctrl/Cmd',
  ctrl: 'Ctrl',
  meta: 'Cmd',
  shift: 'Shift',
  alt: 'Alt',
  enter: 'Enter',
  escape: 'Esc',
  esc: 'Esc',
  space: 'Space',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
};

export const getShortcutCategoryLabel = (category: ShortcutCategory, t: TFunction) =>
  t(`shortcuts.categories.${category}`);

export const formatShortcutBinding = (binding: string) =>
  binding
    .split(' ')
    .map(stroke =>
      stroke
        .split('+')
        .map(part => KEY_LABELS[part] || part.toUpperCase())
        .join('+'),
    )
    .join(' → ');

export const getShortcutDisplayKeys = (shortcut: Pick<ShortcutDefinition, 'bindings' | 'keys'>) =>
  shortcut.keys || shortcut.bindings.map(formatShortcutBinding);
