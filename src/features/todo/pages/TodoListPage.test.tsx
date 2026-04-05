import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TodoListPage } from '@/features/todo/pages/TodoListPage';
import { useTodoContext } from '@/app/providers/TodoContext';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { createTodo } from '@/test/factories/todo';

vi.mock('@/app/providers/TodoContext', () => ({
  useTodoContext: vi.fn(),
}));

vi.mock('@/features/shortcuts/context/ShortcutContext', () => ({
  useRegisterShortcuts: vi.fn(),
}));

vi.mock('@/features/todo/hooks/useTodoListFilter', () => ({
  useTodoListFilter: vi.fn(),
}));

vi.mock('@/features/todo/hooks/useTodoSelection', () => ({
  useTodoSelection: vi.fn(),
}));

vi.mock('@/features/todo/hooks/useExportImport', () => ({
  useExportImport: vi.fn(),
}));

vi.mock('@/features/todo/ui/TodoCard', () => ({
  TodoCard: ({ todo }: { todo: { title: string } }) => <article>{todo.title}</article>,
}));

vi.mock('@/features/todo/ui/TodoListRows', () => ({
  TodoListRows: ({ todos }: { todos: Array<{ title: string }> }) => (
    <section aria-label="todo-list-rows">
      {todos.map(todo => (
        <div key={todo.title}>{todo.title}</div>
      ))}
    </section>
  ),
}));

const useTodoContextMock = vi.mocked(useTodoContext);
const useRegisterShortcutsMock = vi.mocked(useRegisterShortcuts);

describe('TodoListPage', () => {
  beforeEach(async () => {
    const { useTodoListFilter } = await import('@/features/todo/hooks/useTodoListFilter');
    const { useTodoSelection } = await import('@/features/todo/hooks/useTodoSelection');
    const { useExportImport } = await import('@/features/todo/hooks/useExportImport');

    vi.mocked(useTodoListFilter).mockReturnValue([
      createTodo({ id: 'todo-1', title: '一覧テスト' }),
    ]);
    vi.mocked(useTodoSelection).mockReturnValue({
      selectedTodoId: 'todo-1',
      setSelectedTodoId: vi.fn(),
      selectedTodo: createTodo({ id: 'todo-1', title: '一覧テスト' }),
      selectRelativeTodo: vi.fn(),
    });
    vi.mocked(useExportImport).mockReturnValue({
      isExportDialogOpen: false,
      setIsExportDialogOpen: vi.fn(),
      isImportDialogOpen: false,
      setIsImportDialogOpen: vi.fn(),
      exportText: '',
      importText: '',
      setImportText: vi.fn(),
      handleExport: vi.fn(),
      handleImport: vi.fn(),
      closeExportDialog: vi.fn(),
      closeImportDialog: vi.fn(),
      handleFileExport: vi.fn(async () => undefined),
      handleTextExport: vi.fn(),
      handleCopyExportText: vi.fn(async () => undefined),
      handleFileSelected: vi.fn(),
      handleTextImport: vi.fn(async () => undefined),
    });

    useTodoContextMock.mockReturnValue({
      todos: [createTodo({ id: 'todo-1', title: '一覧テスト' })],
      getTodo: vi.fn(),
      modal: null,
      setModal: vi.fn(),
      handleDelete: vi.fn(),
      handleComplete: vi.fn(),
      currentInProgressId: null,
      startTodo: vi.fn(),
      exportTodos: vi.fn(async () => undefined),
      exportTodosToText: vi.fn(() => '[]'),
      importTodos: vi.fn(async () => ({
        success: true,
        addedCount: 0,
        updatedCount: 0,
        message: '',
      })),
      importTodosFromText: vi.fn(async () => ({
        success: true,
        addedCount: 0,
        updatedCount: 0,
        message: '',
      })),
    } as never);

    useRegisterShortcutsMock.mockClear();
  });

  it('renders title and todo count', () => {
    render(
      <MemoryRouter initialEntries={['/?filter=unlocked']}>
        <TodoListPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'タスク一覧' })).toBeInTheDocument();
    expect(screen.getByText('現在 1 件のタスクがあります。')).toBeInTheDocument();
    expect(screen.getByText('一覧テスト')).toBeInTheDocument();
  });

  it('shows empty message when filtered todos are empty', async () => {
    const { useTodoListFilter } = await import('@/features/todo/hooks/useTodoListFilter');
    vi.mocked(useTodoListFilter).mockReturnValue([]);

    render(
      <MemoryRouter initialEntries={['/?filter=unlocked']}>
        <TodoListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('タスクはありません。')).toBeInTheDocument();
  });

  it('switches between card and list view', () => {
    render(
      <MemoryRouter initialEntries={['/?filter=unlocked&view=card']}>
        <TodoListPage />
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText('todo-list-rows')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'リスト表示' }));
    expect(screen.getByLabelText('todo-list-rows')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'カード表示' }));
    expect(screen.queryByLabelText('todo-list-rows')).not.toBeInTheDocument();
  });

  it('opens menu and invokes export/import handlers', async () => {
    const { useExportImport } = await import('@/features/todo/hooks/useExportImport');
    const handleExport = vi.fn();
    const handleImport = vi.fn();

    vi.mocked(useExportImport).mockReturnValue({
      isExportDialogOpen: false,
      setIsExportDialogOpen: vi.fn(),
      isImportDialogOpen: false,
      setIsImportDialogOpen: vi.fn(),
      exportText: '',
      importText: '',
      setImportText: vi.fn(),
      handleExport,
      handleImport,
      closeExportDialog: vi.fn(),
      closeImportDialog: vi.fn(),
      handleFileExport: vi.fn(async () => undefined),
      handleTextExport: vi.fn(),
      handleCopyExportText: vi.fn(async () => undefined),
      handleFileSelected: vi.fn(),
      handleTextImport: vi.fn(async () => undefined),
    });

    render(
      <MemoryRouter initialEntries={['/?filter=unlocked']}>
        <TodoListPage />
      </MemoryRouter>,
    );

    const menuButton = screen.getAllByRole('button').find(button => button.querySelector('svg'));
    expect(menuButton).toBeTruthy();
    fireEvent.click(menuButton!);

    fireEvent.click(screen.getByRole('button', { name: 'エクスポート' }));
    expect(handleExport).toHaveBeenCalledTimes(1);

    fireEvent.click(menuButton!);
    fireEvent.click(screen.getByRole('button', { name: 'インポート' }));
    expect(handleImport).toHaveBeenCalledTimes(1);
  });

  it('renders and handles export/import presenters and modal', async () => {
    const { useExportImport } = await import('@/features/todo/hooks/useExportImport');
    const closeExportDialog = vi.fn();
    const closeImportDialog = vi.fn();
    const setImportText = vi.fn();
    const handleTextImport = vi.fn(async () => undefined);
    const modalConfirm = vi.fn();
    const setModal = vi.fn();

    vi.mocked(useExportImport).mockReturnValue({
      isExportDialogOpen: true,
      setIsExportDialogOpen: vi.fn(),
      isImportDialogOpen: true,
      setIsImportDialogOpen: vi.fn(),
      exportText: '{"ok":true}',
      importText: '',
      setImportText,
      handleExport: vi.fn(),
      handleImport: vi.fn(),
      closeExportDialog,
      closeImportDialog,
      handleFileExport: vi.fn(async () => undefined),
      handleTextExport: vi.fn(),
      handleCopyExportText: vi.fn(async () => undefined),
      handleFileSelected: vi.fn(),
      handleTextImport,
    });

    useTodoContextMock.mockReturnValue({
      todos: [createTodo({ id: 'todo-1', title: '一覧テスト' })],
      getTodo: vi.fn(),
      modal: { message: '確認メッセージ', onConfirm: modalConfirm },
      setModal,
      handleDelete: vi.fn(),
      handleComplete: vi.fn(),
      currentInProgressId: null,
      startTodo: vi.fn(),
      exportTodos: vi.fn(async () => undefined),
      exportTodosToText: vi.fn(() => '[]'),
      importTodos: vi.fn(async () => ({
        success: true,
        addedCount: 0,
        updatedCount: 0,
        message: '',
      })),
      importTodosFromText: vi.fn(async () => ({
        success: true,
        addedCount: 0,
        updatedCount: 0,
        message: '',
      })),
    } as never);

    render(
      <MemoryRouter initialEntries={['/?filter=unlocked']}>
        <TodoListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('エクスポート')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(closeExportDialog).toHaveBeenCalledTimes(1);

    expect(screen.getByRole('heading', { name: 'インポート' })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('[{"id":"...","title":"..."}]'), {
      target: { value: '[{"id":"x"}]' },
    });
    expect(setImportText).toHaveBeenCalledWith('[{"id":"x"}]');

    fireEvent.click(screen.getAllByRole('button', { name: 'インポート' })[0]);
    expect(handleTextImport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(modalConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'キャンセル' })[0]);
    expect(setModal).toHaveBeenCalledWith(null);

    fireEvent.click(screen.getAllByRole('button', { name: 'キャンセル' })[1]);
    expect(closeImportDialog).toHaveBeenCalledTimes(1);
  });

  it('executes registered shortcut actions', async () => {
    const { useExportImport } = await import('@/features/todo/hooks/useExportImport');
    const handleDelete = vi.fn();
    const handleComplete = vi.fn();
    const startTodo = vi.fn();
    const setModal = vi.fn();
    const handleFileExport = vi.fn(async () => undefined);
    const handleTextExport = vi.fn();
    const handleCopyExportText = vi.fn(async () => undefined);
    const handleTextImport = vi.fn(async () => undefined);
    const closeExportDialog = vi.fn();
    const closeImportDialog = vi.fn();

    vi.mocked(useExportImport).mockReturnValue({
      isExportDialogOpen: true,
      setIsExportDialogOpen: vi.fn(),
      isImportDialogOpen: true,
      setIsImportDialogOpen: vi.fn(),
      exportText: '{"ok":true}',
      importText: '[{"id":"x"}]',
      setImportText: vi.fn(),
      handleExport: vi.fn(),
      handleImport: vi.fn(),
      closeExportDialog,
      closeImportDialog,
      handleFileExport,
      handleTextExport,
      handleCopyExportText,
      handleFileSelected: vi.fn(),
      handleTextImport,
    });

    const selectedTodo = createTodo({ id: 'todo-shortcut', status: 'Unlocked' });
    const modalConfirm = vi.fn();

    useTodoContextMock.mockReturnValue({
      todos: [selectedTodo],
      getTodo: vi.fn(),
      modal: { message: '確認', onConfirm: modalConfirm },
      setModal,
      handleDelete,
      handleComplete,
      currentInProgressId: null,
      startTodo,
      exportTodos: vi.fn(async () => undefined),
      exportTodosToText: vi.fn(() => '[]'),
      importTodos: vi.fn(async () => ({
        success: true,
        addedCount: 0,
        updatedCount: 0,
        message: '',
      })),
      importTodosFromText: vi.fn(async () => ({
        success: true,
        addedCount: 0,
        updatedCount: 0,
        message: '',
      })),
    } as never);

    render(
      <MemoryRouter initialEntries={['/?filter=unlocked']}>
        <TodoListPage />
      </MemoryRouter>,
    );

    const registration = useRegisterShortcutsMock.mock.calls.at(-1)?.[0];
    expect(registration).toBeDefined();

    const shortcuts = registration!.shortcuts;
    expect(shortcuts.find(item => item.id === 'list-view-list')?.bindings).toEqual(['v l']);
    expect(shortcuts.find(item => item.id === 'list-view-card')?.bindings).toEqual(['v c']);

    shortcuts.find(item => item.id === 'list-start')?.action();
    shortcuts.find(item => item.id === 'list-complete')?.action();
    shortcuts.find(item => item.id === 'list-delete')?.action();
    act(() => {
      shortcuts.find(item => item.id === 'list-view-list')?.action();
      shortcuts.find(item => item.id === 'list-view-card')?.action();
    });
    shortcuts.find(item => item.id === 'dialog-confirm-modal')?.action();
    shortcuts.find(item => item.id === 'dialog-close-modal')?.action();
    shortcuts.find(item => item.id === 'dialog-export-file')?.action();
    shortcuts.find(item => item.id === 'dialog-export-text')?.action();
    shortcuts.find(item => item.id === 'dialog-export-copy')?.action();
    shortcuts.find(item => item.id === 'dialog-import-submit')?.action();
    shortcuts.find(item => item.id === 'dialog-close-export')?.action();
    shortcuts.find(item => item.id === 'dialog-close-import')?.action();

    expect(startTodo).toHaveBeenCalledWith(expect.any(String));
    expect(handleComplete).toHaveBeenCalledWith(expect.any(String));
    expect(handleDelete).toHaveBeenCalledWith(expect.any(String));
    expect(modalConfirm).toHaveBeenCalledTimes(1);
    expect(setModal).toHaveBeenCalledWith(null);
    expect(handleFileExport).toHaveBeenCalledTimes(1);
    expect(handleTextExport).toHaveBeenCalledTimes(1);
    expect(handleCopyExportText).toHaveBeenCalledTimes(1);
    expect(handleTextImport).toHaveBeenCalledTimes(1);
    expect(closeExportDialog).toHaveBeenCalledTimes(1);
    expect(closeImportDialog).toHaveBeenCalledTimes(1);
  });
});
