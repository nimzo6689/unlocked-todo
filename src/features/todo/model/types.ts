export type TodoTaskType = 'Normal' | 'Meeting';

export type Todo = {
  id: string;
  title: string;
  description: string;
  taskType: TodoTaskType;
  createdAt: string;
  startedAt?: string;
  startableAt: string;
  dueDate: string;
  status: 'Unlocked' | 'Locked' | 'Completed';
  effortMinutes: number;
  actualWorkSeconds: number;
  assignee: '自分' | '他人';
  dependency?: string | string[];
  completedAt?: string;
};

export type FilterButton = {
  key: string;
  label: string;
};

export type ModalState = {
  message: string;
  onConfirm: () => void;
};

export type BreakPeriod = {
  startMinute: number;
  endMinute: number;
};

export type WorkSchedule = {
  workingDays: number[];
  workStartHour: number;
  workEndHour: number;
  breakPeriods: BreakPeriod[];
};

export type ImportResult = {
  success: boolean;
  addedCount: number;
  updatedCount: number;
  message: string;
};

export type TodoContextType = {
  todos: Todo[];
  form: Partial<Todo>;
  setForm: (form: Partial<Todo>) => void;
  modal: ModalState | null;
  setModal: (value: ModalState | null) => void;
  notificationEnabled: boolean;
  setNotificationEnabled: (value: boolean) => void;
  workSchedule: WorkSchedule;
  setWorkSchedule: (value: WorkSchedule) => void;
  currentInProgressId: string | null;
  fetchTodos: () => Promise<void>;
  getTodo: (id: string) => Todo | undefined;
  setTodos: (todos: Todo[]) => void;
  requestNotificationPermission: () => void;
  handleDelete: (id: string) => void;
  handleComplete: (id: string) => void;
  startTodo: (id: string) => void;
  exportTodos: () => Promise<void>;
  exportTodosToText: () => string;
  importTodos: (file: File) => Promise<ImportResult>;
  importTodosFromText: (text: string) => Promise<ImportResult>;
};
