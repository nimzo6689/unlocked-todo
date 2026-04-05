import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { Todo } from '@/features/todo/model/types';
import { TodoCard } from '@/features/todo/ui/TodoCard';
import { TodoListRows } from '@/features/todo/ui/TodoListRows';
import { Modal } from '@/shared/ui/Modal';
import { filterButtons, getDependencyIds, isMeetingTodo } from '@/features/todo/model/todo-utils';
import { useTodoContext } from '@/app/providers/TodoContext';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { useTodoListFilter } from '../hooks/useTodoListFilter';
import { useTodoSelection } from '../hooks/useTodoSelection';
import { useExportImport } from '../hooks/useExportImport';
import { ExportDialogPresenter, ImportDialogPresenter } from './TodoListPagePresenters';

export const TodoListPage = () => {
  const {
    todos,
    getTodo,
    modal,
    setModal,
    handleDelete,
    handleComplete,
    currentInProgressId,
    startTodo,
    exportTodos,
    exportTodosToText,
    importTodos,
    importTodosFromText,
  } = useTodoContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setTick] = useState(0);
  const filter = searchParams.get('filter') || 'unlocked';
  const view = searchParams.get('view') === 'list' ? 'list' : 'card';

  // 時刻経過による Locked→Unlocked / Meeting→Unlocked 等の遷移を自動反映するため定期再レンダリング
  useEffect(() => {
    const interval = window.setInterval(() => setTick(t => t + 1), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredTodos = useTodoListFilter(todos, filter, getTodo);
  const { setSelectedTodoId, selectedTodo, selectRelativeTodo } =
    useTodoSelection(filteredTodos);
  const {
    isExportDialogOpen,
    isImportDialogOpen,
    exportText,
    importText,
    setImportText,
    handleExport,
    handleImport,
    closeExportDialog,
    closeImportDialog,
    handleFileExport,
    handleTextExport,
    handleCopyExportText,
    handleFileSelected,
    handleTextImport,
  } = useExportImport({ exportTodos, exportTodosToText, importTodos, importTodosFromText });

  const isOverlayOpen = Boolean(modal || isExportDialogOpen || isImportDialogOpen || menuOpen);

  function handleEdit(id: string) {
    navigate(`/edit/${id}`);
  }

  function handleNew() {
    navigate('/new');
  }

  function handleFilterChange(f: string) {
    setSearchParams({
      ...Object.fromEntries(searchParams.entries()),
      filter: f,
    });
  }

  function handleViewChange(nextView: 'card' | 'list') {
    setSearchParams({
      ...Object.fromEntries(searchParams.entries()),
      view: nextView,
    });
  }

  const shortcutRegistration = useMemo(() => {
    const canStartSelected = Boolean(
      selectedTodo
      && !isMeetingTodo(selectedTodo)
      && (currentInProgressId === selectedTodo.id || selectedTodo.status === 'Unlocked'),
    );

    return {
      pageLabel: 'タスク一覧',
      overlayOpen: isOverlayOpen,
      shortcuts: [
        {
          id: 'list-next',
          description: '次のタスクを選択',
          category: '一覧操作' as const,
          bindings: ['j'],
          action: () => selectRelativeTodo(1),
          enabled: filteredTodos.length > 0,
        },
        {
          id: 'list-previous',
          description: '前のタスクを選択',
          category: '一覧操作' as const,
          bindings: ['k'],
          action: () => selectRelativeTodo(-1),
          enabled: filteredTodos.length > 0,
        },
        {
          id: 'list-edit-enter',
          description: '選択中タスクを開く',
          category: '一覧操作' as const,
          bindings: ['enter', 'o'],
          action: () => selectedTodo && handleEdit(selectedTodo.id),
          enabled: Boolean(selectedTodo),
        },
        {
          id: 'list-new',
          description: '新規タスクを作成',
          category: '一覧操作' as const,
          bindings: ['n'],
          action: handleNew,
        },
        {
          id: 'list-start',
          description: '選択中タスクを着手または中断',
          category: '一覧操作' as const,
          bindings: ['x'],
          action: () => selectedTodo && startTodo(selectedTodo.id),
          enabled: canStartSelected,
        },
        {
          id: 'list-complete',
          description: '選択中タスクを完了にする',
          category: '一覧操作' as const,
          bindings: ['c'],
          action: () => selectedTodo && handleComplete(selectedTodo.id),
          enabled: Boolean(selectedTodo && selectedTodo.status !== 'Completed'),
        },
        {
          id: 'list-delete',
          description: '選択中タスクを削除する',
          category: '一覧操作' as const,
          bindings: ['d'],
          action: () => selectedTodo && handleDelete(selectedTodo.id),
          enabled: Boolean(selectedTodo),
        },
        {
          id: 'list-export-open',
          description: 'エクスポートダイアログを開く',
          category: '一覧操作' as const,
          bindings: ['e'],
          action: handleExport,
        },
        {
          id: 'list-import-open',
          description: 'インポートダイアログを開く',
          category: '一覧操作' as const,
          bindings: ['i'],
          action: handleImport,
        },
        {
          id: 'list-view-list',
          description: 'リスト表示に切り替える',
          category: '一覧操作' as const,
          bindings: ['v l'],
          action: () => handleViewChange('list'),
          enabled: view !== 'list',
        },
        {
          id: 'list-view-card',
          description: 'カード表示に切り替える',
          category: '一覧操作' as const,
          bindings: ['v c'],
          action: () => handleViewChange('card'),
          enabled: view !== 'card',
        },
        ...filterButtons.map((button, index) => ({
          id: `list-filter-${button.key}`,
          description: `${button.label} フィルターに切り替える`,
          category: '一覧操作' as const,
          bindings: [`${index + 1}`],
          action: () => handleFilterChange(button.key),
        })),
        {
          id: 'dialog-confirm-modal',
          description: '確認ダイアログで実行する',
          category: 'ダイアログ' as const,
          bindings: ['enter', 'y'],
          action: () => modal?.onConfirm(),
          enabled: Boolean(modal),
          allowInDialog: true,
        },
        {
          id: 'dialog-close-modal',
          description: '確認ダイアログを閉じる',
          category: 'ダイアログ' as const,
          bindings: ['escape'],
          action: () => setModal(null),
          enabled: Boolean(modal),
          allowInDialog: true,
          allowInInput: true,
        },
        {
          id: 'dialog-export-file',
          description: 'エクスポートをファイル保存する',
          category: 'ダイアログ' as const,
          bindings: ['f'],
          action: () => {
            void handleFileExport();
          },
          enabled: isExportDialogOpen,
          allowInDialog: true,
        },
        {
          id: 'dialog-export-text',
          description: 'エクスポートテキストを表示する',
          category: 'ダイアログ' as const,
          bindings: ['t'],
          action: handleTextExport,
          enabled: isExportDialogOpen,
          allowInDialog: true,
        },
        {
          id: 'dialog-export-copy',
          description: 'エクスポートテキストをコピーする',
          category: 'ダイアログ' as const,
          bindings: ['y'],
          action: () => {
            void handleCopyExportText();
          },
          enabled: isExportDialogOpen && Boolean(exportText),
          allowInDialog: true,
        },
        {
          id: 'dialog-import-submit',
          description: 'インポートを実行する',
          category: 'ダイアログ' as const,
          bindings: ['enter'],
          action: () => {
            void handleTextImport();
          },
          enabled: isImportDialogOpen,
          allowInDialog: true,
          allowInInput: true,
        },
        {
          id: 'dialog-close-export',
          description: 'エクスポートダイアログを閉じる',
          category: 'ダイアログ' as const,
          bindings: ['escape'],
          action: closeExportDialog,
          enabled: isExportDialogOpen,
          allowInDialog: true,
          allowInInput: true,
        },
        {
          id: 'dialog-close-import',
          description: 'インポートダイアログを閉じる',
          category: 'ダイアログ' as const,
          bindings: ['escape'],
          action: closeImportDialog,
          enabled: isImportDialogOpen,
          allowInDialog: true,
          allowInInput: true,
        },
        {
          id: 'dialog-close-menu',
          description: 'メニューを閉じる',
          category: 'ダイアログ' as const,
          bindings: ['escape'],
          action: () => setMenuOpen(false),
          enabled: menuOpen,
          allowInDialog: true,
        },
      ],
    };
  }, [
    currentInProgressId,
    exportText,
    filteredTodos.length,
    handleDelete,
    handleComplete,
    isExportDialogOpen,
    isImportDialogOpen,
    isOverlayOpen,
    menuOpen,
    modal,
    selectedTodo,
    startTodo,
    view,
  ]);

  useRegisterShortcuts(shortcutRegistration);

  return (
    <>
      {modal && (
        <Modal
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}
      {isImportDialogOpen && (
        <ImportDialogPresenter
          importText={importText}
          onImportTextChange={setImportText}
          onFileSelected={handleFileSelected}
          onClose={closeImportDialog}
          onImport={handleTextImport}
        />
      )}
      {isExportDialogOpen && (
        <ExportDialogPresenter
          exportText={exportText}
          onFileExport={handleFileExport}
          onTextExport={handleTextExport}
          onCopyText={handleCopyExportText}
          onClose={closeExportDialog}
        />
      )}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <div className="text-left w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">タスク一覧</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            現在 {filteredTodos.length} 件のタスクがあります。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 sm:px-4 rounded-lg shadow-md transition-transform hover:scale-105 text-sm sm:text-base h-10 flex items-center justify-center"
            onClick={handleNew}
          >
            新規作成
          </button>
          <div className="relative">
            <button
              className="bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 px-3 sm:px-4 rounded-lg shadow-md transition-transform hover:scale-105 text-sm sm:text-base h-10 flex items-center justify-center"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 border-b border-slate-100 transition-colors"
                  onClick={() => {
                    handleExport();
                    setMenuOpen(false);
                  }}
                >
                  エクスポート
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  onClick={() => {
                    handleImport();
                    setMenuOpen(false);
                  }}
                >
                  インポート
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
        <div className="flex items-center flex-wrap gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm font-medium text-slate-600">フィルター:</span>
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
            {filterButtons.map((btn: import('@/features/todo/model/types').FilterButton) => (
              <button
                key={btn.key}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
                  filter === btn.key
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => handleFilterChange(btn.key)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
              view === 'card'
                ? 'bg-white text-blue-600 shadow'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
            onClick={() => handleViewChange('card')}
            aria-pressed={view === 'card'}
          >
            カード表示
          </button>
          <button
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
              view === 'list'
                ? 'bg-white text-blue-600 shadow'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
            onClick={() => handleViewChange('list')}
            aria-pressed={view === 'list'}
          >
            リスト表示
          </button>
        </div>
      </div>
      <main
        id="todo-list"
        role="listbox"
        aria-label="タスク一覧"
        className={view === 'card'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'
          : 'space-y-2'}
      >
        {filteredTodos.length > 0 ? (
          view === 'card' ? (
            filteredTodos.map(todo => (
              <TodoCard
                key={todo.id}
                todo={todo}
                dependentTodos={getDependencyIds(todo)
                  .map(getTodo)
                  .filter((t): t is Todo => Boolean(t))}
                filter={filter}
                selected={selectedTodo?.id === todo.id}
                currentInProgressId={currentInProgressId}
                onSelect={setSelectedTodoId}
                onEdit={handleEdit}
                onDelete={() => handleDelete(todo.id)}
                onComplete={() => handleComplete(todo.id)}
                onStartTodo={startTodo}
              />
            ))
          ) : (
            <TodoListRows
              todos={filteredTodos}
              filter={filter}
              selectedTodoId={selectedTodo?.id ?? null}
              currentInProgressId={currentInProgressId}
              onSelect={setSelectedTodoId}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onComplete={handleComplete}
              onStartTodo={startTodo}
            />
          )
        ) : (
          <p className="text-slate-500 col-span-full text-center py-10">タスクはありません。</p>
        )}
      </main>
    </>
  );
};
