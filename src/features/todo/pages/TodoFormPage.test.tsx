import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TodoFormPage } from '@/features/todo/pages/TodoFormPage';
import { useTodoContext } from '@/app/providers/TodoContext';
import { createTodo } from '@/test/factories/todo';
import { DEFAULT_WORK_SCHEDULE } from '@/features/work-schedule/model/settings';

vi.mock('@/app/providers/TodoContext', () => ({
  useTodoContext: vi.fn(),
}));

vi.mock('@/features/shortcuts/context/ShortcutContext', () => ({
  useRegisterShortcuts: vi.fn(),
}));

vi.mock('@/features/todo/ui/TodoForm', () => ({
  TodoForm: () => <div data-testid="todo-form" />,
}));

vi.mock('@/features/todo/hooks/useTodoForm', () => ({
  useTodoForm: () => ({
    saving: false,
    successorIds: [],
    setSuccessorIds: vi.fn(),
    applyDueDateQuickAction: vi.fn(),
    applyStartableAtQuickAction: vi.fn(),
    handleSave: vi.fn(async () => undefined),
    handleComplete: vi.fn(async () => undefined),
    handleCancel: vi.fn(),
    handleOpenTodo: vi.fn(),
  }),
}));

const useTodoContextMock = vi.mocked(useTodoContext);

describe('TodoFormPage', () => {
  beforeEach(() => {
    useTodoContextMock.mockReturnValue({
      todos: [createTodo()],
      form: { title: 'sample', taskType: 'Normal' },
      setForm: vi.fn(),
      getTodo: vi.fn(),
      fetchTodos: vi.fn(async () => undefined),
      workSchedule: DEFAULT_WORK_SCHEDULE,
    } as never);
  });

  it('renders new form title on /new', () => {
    render(
      <MemoryRouter initialEntries={['/new']}>
        <Routes>
          <Route path="/new" element={<TodoFormPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Todoの新規作成' })).toBeInTheDocument();
    expect(screen.getByTestId('todo-form')).toBeInTheDocument();
  });

  it('renders edit form title on /edit/:id', () => {
    render(
      <MemoryRouter initialEntries={['/edit/todo-1']}>
        <Routes>
          <Route path="/edit/:id" element={<TodoFormPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Todoの編集' })).toBeInTheDocument();
  });
});
