import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Todo } from '@/features/todo/model/types';
import { TodoCard } from '@/features/todo/ui/TodoCard';
import { TodoListRows } from '@/features/todo/ui/TodoListRows';
import { Modal } from '@/shared/ui/Modal';
import {
  getDependencyIds,
  getFilterButtons,
  isMeetingTodo,
} from '@/features/todo/model/todo-utils';
import { useTodoContext } from '@/app/providers/TodoContext';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { useTodoListFilter } from '../hooks/useTodoListFilter';
import { useTodoSelection } from '../hooks/useTodoSelection';
import { useExportImport } from '../hooks/useExportImport';
import { ExportDialogPresenter, ImportDialogPresenter } from './TodoListPagePresenters';
import { useAppLocale } from '@/shared/i18n/useAppLocale';

const TODO_LIST_VIEW_STORAGE_KEY = 'todo-list-view';

type TodoListView = 'card' | 'list';

const parseTodoListView = (value: string | null): TodoListView =>
  value === 'list' ? 'list' : 'card';

export const TodoListPage = () => {
  const { t } = useTranslation();
  const { locale } = useAppLocale();
  const isTodoExpandable = (todo: Todo | null | undefined) =>
    Boolean(todo && (todo.description || '').length > 100);

  const {
    todos,
    getTodo,
    modal,
    setModal,
    handleDelete,
    handleComplete,
    currentInProgressId,
    hasMoreTodos,
    loadMoreTodos,
    startTodo,
    exportTodos,
    exportTodosToText,
    importTodos,
    importTodosFromText,
  } = useTodoContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedTodoIds, setExpandedTodoIds] = useState<string[]>([]);
  const [savedView] = useState<TodoListView>(() => {
    if (typeof window === 'undefined') {
      return 'card';
    }
    return parseTodoListView(localStorage.getItem(TODO_LIST_VIEW_STORAGE_KEY));
  });
  const [, setTick] = useState(0);
  const filter = searchParams.get('filter') || 'unlocked';
  const view = parseTodoListView(searchParams.get('view'));
  const effectiveView = searchParams.has('view') ? view : savedView;
  const filterButtons = useMemo(() => getFilterButtons(locale), [locale]);

  // 時刻経過による Locked→Unlocked / Meeting→Unlocked 等の遷移を自動反映するため定期再レンダリング
  useEffect(() => {
    const interval = window.setInterval(() => setTick(t => t + 1), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredTodos = useTodoListFilter(todos, filter, getTodo);
  const { setSelectedTodoId, selectedTodo, selectRelativeTodo } = useTodoSelection(filteredTodos);
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
  const canExpandSelected = effectiveView === 'card' && isTodoExpandable(selectedTodo);

  useEffect(() => {
    const visibleTodoIds = new Set(filteredTodos.map(todo => todo.id));
    setExpandedTodoIds(current => current.filter(id => visibleTodoIds.has(id)));
  }, [filteredTodos]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(TODO_LIST_VIEW_STORAGE_KEY, effectiveView);
  }, [effectiveView]);

  function handleExpandedChange(id: string, expanded: boolean) {
    setExpandedTodoIds(current => {
      if (expanded) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter(currentId => currentId !== id);
    });
  }

  const handleEdit = useCallback(
    (id: string) => {
      navigate(`/edit/${id}`);
    },
    [navigate],
  );

  const handleNew = useCallback(() => {
    navigate('/new');
  }, [navigate]);

  const handleFilterChange = useCallback(
    (f: string) => {
      setSearchParams({
        ...Object.fromEntries(searchParams.entries()),
        filter: f,
      });
    },
    [searchParams, setSearchParams],
  );

  const handleViewChange = useCallback(
    (nextView: 'card' | 'list') => {
      setSearchParams({
        ...Object.fromEntries(searchParams.entries()),
        view: nextView,
      });
    },
    [searchParams, setSearchParams],
  );

  const shortcutRegistration = useMemo(() => {
    const canStartSelected = Boolean(
      selectedTodo &&
      !isMeetingTodo(selectedTodo) &&
      (currentInProgressId === selectedTodo.id || selectedTodo.status === 'Unlocked'),
    );

    return {
      pageLabel: t('todo.list.pageLabel'),
      overlayOpen: isOverlayOpen,
      shortcuts: [
        {
          id: 'list-next',
          description: t('todo.list.shortcuts.next'),
          category: '一覧操作' as const,
          bindings: ['j'],
          action: () => selectRelativeTodo(1),
          enabled: filteredTodos.length > 0,
        },
        {
          id: 'list-previous',
          description: t('todo.list.shortcuts.previous'),
          category: '一覧操作' as const,
          bindings: ['k'],
          action: () => selectRelativeTodo(-1),
          enabled: filteredTodos.length > 0,
        },
        {
          id: 'list-edit-enter',
          description: t('todo.list.shortcuts.open'),
          category: '一覧操作' as const,
          bindings: ['enter', 'o'],
          action: () => selectedTodo && handleEdit(selectedTodo.id),
          enabled: Boolean(selectedTodo),
        },
        {
          id: 'list-new',
          description: t('todo.list.shortcuts.create'),
          category: '一覧操作' as const,
          bindings: ['n'],
          action: handleNew,
        },
        {
          id: 'list-start',
          description: t('todo.list.shortcuts.startOrPause'),
          category: '一覧操作' as const,
          bindings: ['x'],
          action: () => selectedTodo && startTodo(selectedTodo.id),
          enabled: canStartSelected,
        },
        {
          id: 'list-expand-selected',
          description: t('todo.list.shortcuts.expand'),
          category: '一覧操作' as const,
          bindings: ['l'],
          action: () => selectedTodo && handleExpandedChange(selectedTodo.id, true),
          enabled: canExpandSelected && !expandedTodoIds.includes(selectedTodo!.id),
        },
        {
          id: 'list-collapse-selected',
          description: t('todo.list.shortcuts.collapse'),
          category: '一覧操作' as const,
          bindings: ['h'],
          action: () => selectedTodo && handleExpandedChange(selectedTodo.id, false),
          enabled: canExpandSelected && expandedTodoIds.includes(selectedTodo!.id),
        },
        {
          id: 'list-complete',
          description: t('todo.list.shortcuts.complete'),
          category: '一覧操作' as const,
          bindings: ['c'],
          action: () => selectedTodo && handleComplete(selectedTodo.id),
          enabled: Boolean(selectedTodo && selectedTodo.status !== 'Completed'),
        },
        {
          id: 'list-delete',
          description: t('todo.list.shortcuts.delete'),
          category: '一覧操作' as const,
          bindings: ['d'],
          action: () => selectedTodo && handleDelete(selectedTodo.id),
          enabled: Boolean(selectedTodo),
        },
        {
          id: 'list-export-open',
          description: t('todo.list.shortcuts.openExport'),
          category: '一覧操作' as const,
          bindings: ['e'],
          action: handleExport,
        },
        {
          id: 'list-import-open',
          description: t('todo.list.shortcuts.openImport'),
          category: '一覧操作' as const,
          bindings: ['i'],
          action: handleImport,
        },
        {
          id: 'list-view-list',
          description: t('todo.list.shortcuts.switchList'),
          category: '一覧操作' as const,
          bindings: ['v l'],
          action: () => handleViewChange('list'),
          enabled: effectiveView !== 'list',
        },
        {
          id: 'list-view-card',
          description: t('todo.list.shortcuts.switchCard'),
          category: '一覧操作' as const,
          bindings: ['v c'],
          action: () => handleViewChange('card'),
          enabled: effectiveView !== 'card',
        },
        ...filterButtons.map((button, index) => ({
          id: `list-filter-${button.key}`,
          description: t('todo.list.shortcuts.switchFilter', { label: button.label }),
          category: '一覧操作' as const,
          bindings: [`${index + 1}`],
          action: () => handleFilterChange(button.key),
        })),
        {
          id: 'dialog-confirm-modal',
          description: t('todo.list.shortcuts.confirmModal'),
          category: 'ダイアログ' as const,
          bindings: ['enter', 'y'],
          action: () => modal?.onConfirm(),
          enabled: Boolean(modal),
          allowInDialog: true,
        },
        {
          id: 'dialog-close-modal',
          description: t('todo.list.shortcuts.closeModal'),
          category: 'ダイアログ' as const,
          bindings: ['escape'],
          action: () => setModal(null),
          enabled: Boolean(modal),
          allowInDialog: true,
          allowInInput: true,
        },
        {
          id: 'dialog-export-file',
          description: t('todo.list.shortcuts.exportFile'),
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
          description: t('todo.list.shortcuts.exportText'),
          category: 'ダイアログ' as const,
          bindings: ['t'],
          action: () => {
            void handleTextExport();
          },
          enabled: isExportDialogOpen,
          allowInDialog: true,
        },
        {
          id: 'dialog-export-copy',
          description: t('todo.list.shortcuts.exportCopy'),
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
          description: t('todo.list.shortcuts.importSubmit'),
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
          description: t('todo.list.shortcuts.closeExport'),
          category: 'ダイアログ' as const,
          bindings: ['escape'],
          action: closeExportDialog,
          enabled: isExportDialogOpen,
          allowInDialog: true,
          allowInInput: true,
        },
        {
          id: 'dialog-close-import',
          description: t('todo.list.shortcuts.closeImport'),
          category: 'ダイアログ' as const,
          bindings: ['escape'],
          action: closeImportDialog,
          enabled: isImportDialogOpen,
          allowInDialog: true,
          allowInInput: true,
        },
        {
          id: 'dialog-close-menu',
          description: t('todo.list.shortcuts.closeMenu'),
          category: 'ダイアログ' as const,
          bindings: ['escape'],
          action: () => setMenuOpen(false),
          enabled: menuOpen,
          allowInDialog: true,
        },
      ],
    };
  }, [
    canExpandSelected,
    closeExportDialog,
    closeImportDialog,
    currentInProgressId,
    expandedTodoIds,
    exportText,
    filterButtons,
    filteredTodos.length,
    handleCopyExportText,
    handleDelete,
    handleComplete,
    handleEdit,
    handleExport,
    handleFileExport,
    handleFilterChange,
    handleImport,
    handleNew,
    handleTextExport,
    handleTextImport,
    handleViewChange,
    isExportDialogOpen,
    isImportDialogOpen,
    isOverlayOpen,
    menuOpen,
    modal,
    selectRelativeTodo,
    setModal,
    selectedTodo,
    startTodo,
    t,
    effectiveView,
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('todo.list.title')}</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            {t('todo.list.count', { count: filteredTodos.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 sm:px-4 rounded-lg shadow-md transition-transform hover:scale-105 text-sm sm:text-base h-10 flex items-center justify-center"
            onClick={handleNew}
          >
            {t('todo.list.new')}
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
                  {t('todo.list.export')}
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  onClick={() => {
                    handleImport();
                    setMenuOpen(false);
                  }}
                >
                  {t('todo.list.import')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
        <div className="flex items-center flex-wrap gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm font-medium text-slate-600">
            {t('todo.list.filter')}
          </span>
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
              effectiveView === 'card'
                ? 'bg-white text-blue-600 shadow'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
            onClick={() => handleViewChange('card')}
            aria-pressed={effectiveView === 'card'}
          >
            {t('todo.list.cardView')}
          </button>
          <button
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
              effectiveView === 'list'
                ? 'bg-white text-blue-600 shadow'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
            onClick={() => handleViewChange('list')}
            aria-pressed={effectiveView === 'list'}
          >
            {t('todo.list.listView')}
          </button>
        </div>
      </div>
      <main
        id="todo-list"
        role="listbox"
        aria-label={t('todo.list.ariaLabel')}
        className={
          effectiveView === 'card'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'
            : 'space-y-2'
        }
      >
        {filteredTodos.length > 0 ? (
          effectiveView === 'card' ? (
            filteredTodos.map(todo => (
              <TodoCard
                key={todo.id}
                todo={todo}
                dependentTodos={getDependencyIds(todo)
                  .map(getTodo)
                  .filter((t): t is Todo => Boolean(t))}
                filter={filter}
                selected={selectedTodo?.id === todo.id}
                isExpanded={expandedTodoIds.includes(todo.id)}
                currentInProgressId={currentInProgressId}
                onSelect={setSelectedTodoId}
                onExpandedChange={handleExpandedChange}
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
          <p className="text-slate-500 col-span-full text-center py-10">{t('todo.list.empty')}</p>
        )}
      </main>
      {hasMoreTodos && (
        <div className="mt-6 flex justify-center">
          <button
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-5 rounded-lg border border-slate-300 transition-colors"
            onClick={() => {
              void loadMoreTodos();
            }}
          >
            {t('todo.list.loadMore')}
          </button>
        </div>
      )}
    </>
  );
};
