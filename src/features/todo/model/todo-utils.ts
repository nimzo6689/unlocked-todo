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

export const filterButtons: FilterButton[] = [
  { key: 'unlocked', label: 'Unlocked' },
  { key: 'locked', label: 'Locked' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

export const defaultForm: Partial<Todo> = {
  title: '',
  description: '',
  taskType: DEFAULT_TASK_TYPE,
  startableAt: '',
  dueDate: '',
  status: 'Unlocked',
  effortMinutes: DEFAULT_EFFORT_MINUTES,
  actualWorkSeconds: 0,
  assignee: '自分',
  dependency: [],
};

export const getDependencyIds = (todo: Todo): string[] => {
  if (!todo.dependency) return [];
  if (Array.isArray(todo.dependency)) return todo.dependency.filter(Boolean);
  return [todo.dependency];
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

export function formatDurationFromSeconds(totalSeconds?: number) {
  const safeSeconds = Math.max(0, totalSeconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
}

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
    throw new Error('JSONの解析に失敗しました');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('JSONはTodo配列である必要があります');
  }

  return parsed.map((item, index) => {
    try {
      return validateAndNormalizeTodo(item);
    } catch (e) {
      throw new Error(`行${index + 1}のTodoが不正です: ${(e as Error).message}`);
    }
  });
}

/**
 * オブジェクトをTodo型として検証・正規化する。
 */
function validateAndNormalizeTodo(obj: unknown): Todo {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('オブジェクトが必須です');
  }

  const item = obj as Record<string, unknown>;
  const taskType = normalizeTaskType(item.taskType);

  // 必須フィールドの確認
  if (typeof item.id !== 'string' || !item.id) {
    throw new Error('idは空でない文字列である必要があります');
  }
  if (typeof item.title !== 'string') {
    throw new Error('titleは文字列である必要があります');
  }
  if (typeof item.createdAt !== 'string') {
    throw new Error('createdAtはISO 8601文字列である必要があります');
  }
  if (typeof item.startableAt !== 'string') {
    throw new Error('startableAtはISO 8601文字列である必要があります');
  }
  if (typeof item.dueDate !== 'string') {
    throw new Error('dueDateはISO 8601文字列である必要があります');
  }
  if (item.startableAt && item.dueDate) {
    if (new Date(item.startableAt as string) >= new Date(item.dueDate as string)) {
      throw new Error('開始日時は終了日時より前に設定してください');
    }
  }

  const status = item.status as string;
  if (!['Unlocked', 'Locked', 'Completed'].includes(status)) {
    throw new Error('statusは "Unlocked", "Locked", "Completed" のいずれかである必要があります');
  }

  const assignee = item.assignee as string;
  if (!['自分', '他人'].includes(assignee)) {
    throw new Error('assigneeは "自分" または "他人" である必要があります');
  }

  // 数値フィールドの正規化
  const effortMinutes = Number(item.effortMinutes);
  const actualWorkSeconds = Number(item.actualWorkSeconds);
  if (!Number.isFinite(effortMinutes) || effortMinutes < 0) {
    throw new Error('effortMinutesは0以上の数値である必要があります');
  }
  if (!Number.isFinite(actualWorkSeconds) || actualWorkSeconds < 0) {
    throw new Error('actualWorkSecondsは0以上の数値である必要があります');
  }

  // dependency の正規化
  let dependency: string | string[] | undefined;
  if (item.dependency !== undefined) {
    if (typeof item.dependency === 'string') {
      dependency = item.dependency || undefined;
    } else if (Array.isArray(item.dependency)) {
      const filtered = item.dependency.filter(d => typeof d === 'string' && d);
      dependency = filtered.length > 0 ? filtered : undefined;
    } else {
      throw new Error('dependencyは文字列または文字列配列である必要があります');
    }
  }

  return {
    id: item.id,
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
    assignee: assignee as Todo['assignee'],
    dependency,
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

  throw new Error('taskTypeは "Normal" または "Meeting" である必要があります');
}

export function normalizeTodo(todo: Todo): Todo {
  const taskType = normalizeTaskType(todo.taskType);
  const isMeeting = taskType === 'Meeting';

  return {
    ...todo,
    taskType,
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
    dependency: isMeeting ? undefined : todo.dependency,
  };
}
