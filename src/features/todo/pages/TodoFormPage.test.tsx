import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TodoFormPage } from '@/features/todo/pages/TodoFormPage';
import { useTodoContext } from '@/app/providers/TodoContext';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { createTodo } from '@/test/factories/todo';
import { DEFAULT_WORK_SCHEDULE } from '@/features/work-schedule/model/settings';

vi.mock('@/app/providers/TodoContext', () => ({
  useTodoContext: vi.fn(),
}));

vi.mock('@/features/shortcuts/context/ShortcutContext', () => ({
  useRegisterShortcuts: vi.fn(),
}));

vi.mock('@/features/todo/hooks/useTodoForm', () => ({
  useTodoForm: () => ({
    saving: false,
    successorIds: [],
    setSuccessorIds: vi.fn(),
    applyDueDateQuickAction: vi.fn(),
    applyStartableAtQuickAction: vi.fn(),
    handleSave: vi.fn(async () => undefined),
    handleSaveAndClose: vi.fn(async () => undefined),
    handleMarkCompletedAndClose: vi.fn(async () => undefined),
    handleMarkIncompleteAndClose: vi.fn(async () => undefined),
    handleCancel: vi.fn(),
    handleOpenTodo: vi.fn(),
  }),
}));

const useTodoContextMock = vi.mocked(useTodoContext);
const useRegisterShortcutsMock = vi.mocked(useRegisterShortcuts);

const renderFormPage = (path: string) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/new" element={<TodoFormPage />} />
        <Route path="/edit/:id" element={<TodoFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('TodoFormPage', () => {
  beforeEach(() => {
    useRegisterShortcutsMock.mockClear();
    useTodoContextMock.mockReturnValue({
      todos: [
        createTodo({ id: 'todo-1', title: '編集中Todo' }),
        createTodo({ id: 'todo-2', title: '依存先Todo', status: 'Unlocked' }),
      ],
      form: { id: 'todo-1', title: 'sample', taskType: 'Normal' },
      setForm: vi.fn(),
      getTodo: vi.fn(),
      fetchTodos: vi.fn(async () => undefined),
      workSchedule: DEFAULT_WORK_SCHEDULE,
    } as never);
  });

  it('renders new form title on /new', () => {
    renderFormPage('/new');

    expect(screen.getByRole('heading', { name: 'Todoの新規作成' })).toBeInTheDocument();
    expect(screen.getByLabelText('タイトル *')).toBeInTheDocument();
  });

  it('renders edit form title on /edit/:id', () => {
    renderFormPage('/edit/todo-1');

    expect(screen.getByRole('heading', { name: 'Todoの編集' })).toBeInTheDocument();
  });

  it('registers focus shortcuts and quick effort shortcuts with expected bindings', () => {
    renderFormPage('/edit/todo-1');

    const registration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    expect(registration).toBeDefined();

    const shortcuts = registration?.shortcuts ?? [];
    const byId = (id: string) => shortcuts.find(item => item.id === id);

    expect(byId('form-focus-title')?.bindings).toEqual(['alt+1']);
    expect(byId('form-focus-task-type')?.bindings).toEqual(['alt+2']);
    expect(byId('form-focus-description')?.bindings).toEqual(['alt+3']);
    expect(byId('form-focus-startable-at')?.bindings).toEqual(['alt+4']);
    expect(byId('form-focus-due-date')?.bindings).toEqual(['alt+5']);
    expect(byId('form-focus-effort')?.bindings).toEqual(['alt+6']);
    expect(byId('form-focus-actual-work')?.bindings).toEqual(['alt+7']);
    expect(byId('form-focus-dependency')?.bindings).toEqual(['alt+9']);
    expect(byId('form-focus-title')?.allowInInput).toBe(true);

    expect(byId('form-effort-5')?.bindings).toEqual(['alt+shift+1']);
    expect(byId('form-effort-10')?.bindings).toEqual(['alt+shift+2']);
    expect(byId('form-effort-25')?.bindings).toEqual(['alt+shift+3']);
    expect(byId('form-effort-55')?.bindings).toEqual(['alt+shift+4']);
    expect(byId('form-effort-115')?.bindings).toEqual(['alt+shift+5']);
  });

  it('focus shortcuts move focus to target form controls', async () => {
    renderFormPage('/edit/todo-1');

    const registration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    expect(registration).toBeDefined();

    act(() => {
      registration?.shortcuts.find(item => item.id === 'form-focus-title')?.action();
    });
    expect(screen.getByLabelText('タイトル *')).toHaveFocus();

    act(() => {
      registration?.shortcuts.find(item => item.id === 'form-focus-description')?.action();
    });
    expect(screen.getByLabelText('説明')).toHaveFocus();

    act(() => {
      registration?.shortcuts.find(item => item.id === 'form-focus-due-date')?.action();
    });
    expect(screen.getByLabelText('期限 *')).toHaveFocus();

    act(() => {
      registration?.shortcuts.find(item => item.id === 'form-focus-dependency')?.action();
    });

    await waitFor(() => {
      expect(screen.getByLabelText('依存先Todo')).toHaveFocus();
    });
  });

  it('shows complete-and-close button only when status is Unlocked', () => {
    useTodoContextMock.mockReturnValue({
      todos: [
        createTodo({ id: 'todo-1', title: '編集中Todo', status: 'Unlocked' }),
        createTodo({ id: 'todo-2', title: '依存先Todo', status: 'Unlocked' }),
      ],
      form: { id: 'todo-1', title: 'sample', taskType: 'Normal', status: 'Unlocked' },
      setForm: vi.fn(),
      getTodo: vi.fn(),
      fetchTodos: vi.fn(async () => undefined),
      workSchedule: DEFAULT_WORK_SCHEDULE,
    } as never);

    renderFormPage('/edit/todo-1');

    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存して閉じる' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '完了にして閉じる' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '未完了にして閉じる' })).not.toBeInTheDocument();
  });

  it('shows mark-incomplete-and-close button only when status is Completed', () => {
    useTodoContextMock.mockReturnValue({
      todos: [
        createTodo({ id: 'todo-1', title: '編集中Todo', status: 'Completed' }),
        createTodo({ id: 'todo-2', title: '依存先Todo', status: 'Unlocked' }),
      ],
      form: { id: 'todo-1', title: 'sample', taskType: 'Normal', status: 'Completed' },
      setForm: vi.fn(),
      getTodo: vi.fn(),
      fetchTodos: vi.fn(async () => undefined),
      workSchedule: DEFAULT_WORK_SCHEDULE,
    } as never);

    renderFormPage('/edit/todo-1');

    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存して閉じる' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '完了にして閉じる' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '未完了にして閉じる' })).toBeInTheDocument();
  });
});
