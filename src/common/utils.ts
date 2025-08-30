import type { Todo } from './db';

export type FilterButton = {
  key: string;
  label: string;
};

export const filterButtons: FilterButton[] = [
  { key: 'active', label: 'Active' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

export const defaultForm: Partial<Todo> = {
  title: '',
  description: '',
  startableAt: new Date().toISOString(),
  dueDate: '',
  status: 'Active',
  effort: 0,
  assignee: '自分',
  dependency: '',
};

// 日付フォーマット等のユーティリティ
export function formatDate(isoString?: string) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateForInput(isoString?: string) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const tzoffset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  return localISOTime;
}
