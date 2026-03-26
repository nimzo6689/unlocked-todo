export type Todo = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  startableAt: string;
  dueDate: string;
  status: 'Unlocked' | 'Locked' | 'Completed';
  effortMinutes: number;
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
}

export type TodoContextType = {
  todos: Todo[];
  form: Partial<Todo>;
  setForm: (form: Partial<Todo>) => void;
  modal: ModalState | null;
  setModal: (value: ModalState | null) => void;
  notificationEnabled: boolean;
  setNotificationEnabled: (value: boolean) => void;
  currentInProgressId: string | null;
  fetchTodos: () => Promise<void>;
  getTodo: (id: string) => Todo | undefined;
  setTodos: (todos: Todo[]) => void;
  requestNotificationPermission: () => void;
  handleDelete: (id: string) => void;
  handleComplete: (id: string) => void;
  decrementEffort: (id: string) => void;
  startTodo: (id: string) => void;
}
