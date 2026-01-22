import type { Todo } from './db';

export type FilterButton = {
  key: string;
  label: string;
};

export const filterButtons: FilterButton[] = [
  { key: 'unlocked', label: 'Unlocked' },
  { key: 'locked', label: 'Locked' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

export const defaultForm: Partial<Todo> = {
  title: '',
  description: '',
  startableAt: new Date().toISOString(),
  dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  status: 'Unlocked',
  effort: 0.5,
  assignee: '自分',
  dependency: '',
};

// 画面への表示用（2023/10/25 14:30）
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

// <input type="datetime-local"> の値用（2023-10-25T14:30）
export function formatDateForInput(isoString?: string) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const tzoffset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  return localISOTime;
}
