import { createContext, useContext } from 'react';
import { type Todo, type ModalState } from '../common/types'; // 型定義を別ファイルからインポート

export interface TodoContextType {
  todos: Todo[];
  fetchTodos: () => Promise<void>;
  getTodo: (id: string) => Todo | undefined;
  setTodos: (todos: Todo[]) => void;
  form: Partial<Todo>;
  setForm: (form: Partial<Todo>) => void;
  modal: ModalState | null;
  setModal: (value: ModalState | null) => void;
  requestNotificationPermission: () => void;
  notificationEnabled: boolean;
  setNotificationEnabled: (value: boolean) => void;
  handleDelete: (id: string) => void;
}

export const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const useTodoContext = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodoContext must be used within a TodoProvider');
  }
  return context;
};
