import i18n, { getIntlLocale, normalizeLocale, type AppLocale } from '@/shared/i18n';
import type { FilterButton, Todo, TodoTaskType } from './types';

export const DEFAULT_TASK_TYPE: TodoTaskType = 'Normal';
export const DEFAULT_EFFORT_MINUTES = 25;

export const isMeetingTodo = (todo: Pick<Todo, 'taskType'>) => todo.taskType === 'Meeting';

export const isNormalTodo = (todo: Pick<Todo, 'taskType'>) => todo.taskType === 'Normal';

export const getMeetingStatus = (
  dueDate: string,
  currentStatus?: Todo['status'],
): Todo['status'] => {
  if (currentStatus === 'Completed') {
    return 'Completed';
  }

  const end = new Date(dueDate);
  if (Number.isNaN(end.getTime())) {
    return 'Unlocked';
  }

  return end.getTime() <= Date.now() ? 'Completed' : 'Unlocked';
};

export const getFilterButtons = (
  locale: AppLocale = normalizeLocale(i18n.resolvedLanguage),
): FilterButton[] => [
  { key: 'unlocked', label: i18n.t('todo.common.filters.unlocked', { lng: locale }) },
  { key: 'locked', label: i18n.t('todo.common.filters.locked', { lng: locale }) },
  { key: 'meeting', label: i18n.t('todo.common.filters.meeting', { lng: locale }) },
  { key: 'completed', label: i18n.t('todo.common.filters.completed', { lng: locale }) },
  { key: 'all', label: i18n.t('todo.common.filters.all', { lng: locale }) },
];

// Backward compatibility for existing imports while migrating todo pages.
export const filterButtons = getFilterButtons();

export const defaultForm: Partial<Todo> = {
  title: '',
  description: '',
  taskType: DEFAULT_TASK_TYPE,
  startableAt: '',
  dueDate: '',
  status: 'Unlocked',
  effortMinutes: DEFAULT_EFFORT_MINUTES,
  actualWorkSeconds: 0,
  dependsOn: [],
};

export const getDependencyIds = (todo: Todo): string[] => {
  if (!todo.dependsOn) return [];
  if (Array.isArray(todo.dependsOn)) return todo.dependsOn.filter(Boolean);
  return [todo.dependsOn];
};

// 画面への表示用（2023/10/25 14:30）
export function formatDate(
  isoString?: string,
  locale: AppLocale = normalizeLocale(i18n.resolvedLanguage),
) {
  if (!isoString) return i18n.t('todo.common.noDate', { lng: locale });
  const date = new Date(isoString);
  return date.toLocaleString(getIntlLocale(locale), {
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

export function formatDurationFromSeconds(totalSeconds?: number) {
  const safeSeconds = Math.max(0, totalSeconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
}

export const getTodoStatusLabel = (
  status: Todo['status'],
  locale: AppLocale = normalizeLocale(i18n.resolvedLanguage),
) => i18n.t(`todo.common.statuses.${status}`, { lng: locale });

export const getTodoTaskTypeLabel = (
  taskType: TodoTaskType,
  locale: AppLocale = normalizeLocale(i18n.resolvedLanguage),
) =>
  i18n.t(
    taskType === 'Meeting' ? 'todo.common.taskTypes.meeting' : 'todo.common.taskTypes.normal',
    {
      lng: locale,
    },
  );

export const getTodoTitleFallback = (locale: AppLocale = normalizeLocale(i18n.resolvedLanguage)) =>
  i18n.t('todo.common.untitled', { lng: locale });

/**
 * Todo配列をJSON文字列に変換する。
 */
export function todosToJSON(todos: Todo[]): string {
  return JSON.stringify(todos, null, 2);
}

/**
 * JSON文字列をTodo配列に変換し、型とフィールドを検証・正規化する。
 */
export function todosFromJSON(jsonString: string): Todo[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error(i18n.t('todo.validation.jsonParseFailed'));
  }

  if (!Array.isArray(parsed)) {
    throw new Error(i18n.t('todo.validation.arrayRequired'));
  }

  return parsed.map((item, index) => {
    try {
      return validateAndNormalizeTodo(item);
    } catch (e) {
      throw new Error(
        i18n.t('todo.validation.rowInvalid', {
          index: index + 1,
          message: (e as Error).message,
        }),
      );
    }
  });
}

/**
 * オブジェクトをTodo型として検証・正規化する。
 */
function validateAndNormalizeTodo(obj: unknown): Todo {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error(i18n.t('todo.validation.objectRequired'));
  }

  const item = obj as Record<string, unknown>;
  const taskType = normalizeTaskType(item.taskType);
  const id =
    typeof item.id === 'string' && item.id.trim().length > 0
      ? item.id
      : item.id === undefined || item.id === null || item.id === ''
        ? crypto.randomUUID()
        : null;

  // 必須フィールドの確認
  if (id === null) {
    throw new Error(i18n.t('todo.validation.idRequired'));
  }
  if (typeof item.title !== 'string') {
    throw new Error(i18n.t('todo.validation.titleString'));
  }
  if (typeof item.createdAt !== 'string') {
    throw new Error(i18n.t('todo.validation.createdAtIso'));
  }
  if (typeof item.startableAt !== 'string') {
    throw new Error(i18n.t('todo.validation.startableAtIso'));
  }
  if (typeof item.dueDate !== 'string') {
    throw new Error(i18n.t('todo.validation.dueDateIso'));
  }
  if (item.startableAt && item.dueDate) {
    if (new Date(item.startableAt as string) >= new Date(item.dueDate as string)) {
      throw new Error(i18n.t('todo.validation.startBeforeEnd'));
    }
  }

  const status = item.status as string;
  if (!['Unlocked', 'Locked', 'Completed'].includes(status)) {
    throw new Error(i18n.t('todo.validation.statusInvalid'));
  }

  // 数値フィールドの正規化
  const effortMinutes = Number(item.effortMinutes);
  const actualWorkSeconds = Number(item.actualWorkSeconds);
  if (!Number.isFinite(effortMinutes) || effortMinutes < 0) {
    throw new Error(i18n.t('todo.validation.effortNonNegative'));
  }
  if (!Number.isFinite(actualWorkSeconds) || actualWorkSeconds < 0) {
    throw new Error(i18n.t('todo.validation.actualNonNegative'));
  }

  // dependsOn の正規化
  let dependsOn: string | string[] | undefined;
  if (item.dependsOn !== undefined) {
    if (typeof item.dependsOn === 'string') {
      dependsOn = item.dependsOn || undefined;
    } else if (Array.isArray(item.dependsOn)) {
      const filtered = item.dependsOn.filter(d => typeof d === 'string' && d);
      dependsOn = filtered.length > 0 ? filtered : undefined;
    } else {
      throw new Error(i18n.t('todo.validation.dependencyInvalid'));
    }
  }

  return {
    id,
    title: item.title,
    description: typeof item.description === 'string' ? item.description : '',
    taskType,
    createdAt: item.createdAt,
    startedAt: typeof item.startedAt === 'string' ? item.startedAt : undefined,
    startableAt: item.startableAt,
    dueDate: item.dueDate,
    status: status as Todo['status'],
    effortMinutes: Math.max(0, effortMinutes),
    actualWorkSeconds: Math.max(0, actualWorkSeconds),
    dependsOn,
    completedAt: typeof item.completedAt === 'string' ? item.completedAt : undefined,
  };
}

export function normalizeTaskType(value: unknown): TodoTaskType {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_TASK_TYPE;
  }

  if (value === 'Normal' || value === 'Meeting') {
    return value;
  }

  throw new Error(i18n.t('todo.validation.taskTypeInvalid'));
}

export function normalizeTodo(todo: Todo): Todo {
  const taskType = normalizeTaskType(todo.taskType);
  const isMeeting = taskType === 'Meeting';

  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    taskType,
    createdAt: todo.createdAt,
    startedAt: todo.startedAt,
    startableAt: todo.startableAt,
    dueDate: todo.dueDate,
    status: isMeeting ? getMeetingStatus(todo.dueDate, todo.status) : todo.status,
    effortMinutes: isMeeting
      ? 0
      : Number.isFinite(Number(todo.effortMinutes))
        ? Math.max(0, Number(todo.effortMinutes))
        : 0,
    actualWorkSeconds: isMeeting
      ? 0
      : Number.isFinite(Number(todo.actualWorkSeconds))
        ? Math.max(0, Number(todo.actualWorkSeconds))
        : 0,
    dependsOn: isMeeting ? undefined : todo.dependsOn,
    completedAt: todo.completedAt,
  };
}
