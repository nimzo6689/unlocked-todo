import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Todo } from '../common/types';
import { TodoCard } from '../components/TodoCard';
import { Modal } from '../components/Modal';
import { filterButtons, getDependencyIds } from '../common/utils';
import { useTodoContext } from '../contexts/TodoContext';

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
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const filter = searchParams.get('filter') || 'unlocked';

  function handleEdit(id: string) {
    navigate(`/edit/${id}`);
  }

  function handleNew() {
    navigate('/new');
  }

  function handleExport() {
    setIsExportDialogOpen(true);
  }

  async function handleFileExport() {
    try {
      await exportTodos();
      toast.success('タスクをエクスポートしました');
      setIsExportDialogOpen(false);
    } catch (err) {
      toast.error('エクスポートに失敗しました');
    }
  }

  function handleTextExport() {
    setExportText(exportTodosToText());
  }

  async function handleCopyExportText() {
    if (!exportText) {
      toast.error('出力するテキストがありません');
      return;
    }

    try {
      await navigator.clipboard.writeText(exportText);
      toast.success('エクスポートテキストをコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  }

  function handleImport() {
    setIsImportDialogOpen(true);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importTodos(file);
    if (result.success) {
      if (result.addedCount === 0 && result.updatedCount === 0) {
        toast.success('ファイルを読み込みましたが、取り込むタスクはありませんでした');
      } else {
        toast.success(`${result.addedCount}件追加、${result.updatedCount}件更新しました`);
      }
      setIsImportDialogOpen(false);
      setImportText('');
    } else {
      toast.error(`インポートに失敗しました: ${result.message}`);
    }

    // 同じファイルを再選択できるよう value をクリア
    e.target.value = '';
  }

  async function handleTextImport() {
    if (!importText.trim()) {
      toast.error('インポートするJSONテキストを入力してください');
      return;
    }

    const result = await importTodosFromText(importText);
    if (result.success) {
      if (result.addedCount === 0 && result.updatedCount === 0) {
        toast.success('テキストを読み込みましたが、取り込むタスクはありませんでした');
      } else {
        toast.success(`${result.addedCount}件追加、${result.updatedCount}件更新しました`);
      }
      setImportText('');
      setIsImportDialogOpen(false);
    } else {
      toast.error(`インポートに失敗しました: ${result.message}`);
    }
  }

  function handleFilterChange(f: string) {
    setSearchParams({
      ...Object.fromEntries(searchParams.entries()),
      filter: f,
    });
  }

  const filteredTodos = todos
    .filter(todo => {
      const now = new Date();
      const startableAt = new Date(todo.startableAt || todo.createdAt);
      const dependentTodos = getDependencyIds(todo)
        .map(getTodo)
        .filter((t): t is Todo => Boolean(t));
      const isDependencyIncomplete = dependentTodos.some(t => t.status !== 'Completed');
      if (filter === 'all') return true;
      if (filter === 'completed') return todo.status === 'Completed';
      if (filter === 'unlocked') {
        return todo.status === 'Unlocked' && startableAt <= now && !isDependencyIncomplete;
      }
      if (filter === 'locked') {
        return (
          todo.status === 'Locked' ||
          (todo.status === 'Unlocked' && (startableAt > now || isDependencyIncomplete))
        );
      }
      return false;
    })
    .sort((a, b) => {
      const dueDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dueDiff !== 0) return dueDiff;
      return (a.effortMinutes ?? 0) - (b.effortMinutes ?? 0);
    });

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-xl mx-4">
            <h2 className="text-lg font-bold text-slate-900 mb-3">インポート</h2>
            <p className="text-sm text-slate-600 mb-4">
              JSONファイルを選択するか、JSONテキストを貼り付けて取り込めます。
            </p>

            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">ファイルからインポート</p>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">テキストからインポート</p>
              <p className="text-xs text-slate-500 mb-2">
                エクスポート済みJSONをそのまま貼り付けてください。
              </p>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder='[{"id":"...","title":"..."}]'
                className="w-full h-56 border border-slate-300 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm"
                onClick={() => setIsImportDialogOpen(false)}
              >
                キャンセル
              </button>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                onClick={handleTextImport}
              >
                インポート
              </button>
            </div>
          </div>
        </div>
      )}
      {isExportDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-xl mx-4">
            <h2 className="text-lg font-bold text-slate-900 mb-3">エクスポート</h2>
            <p className="text-sm text-slate-600 mb-4">
              出力方法を選択してください。ファイル出力またはテキスト出力が利用できます。
            </p>

            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">ファイル出力</p>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                onClick={handleFileExport}
              >
                JSONファイルとして保存
              </button>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">テキスト出力</p>
              <p className="text-xs text-slate-500 mb-2">
                ボタンを押すとJSONテキストを表示します。必要に応じてコピーしてください。
              </p>
              <div className="flex gap-2 mb-2">
                <button
                  className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                  onClick={handleTextExport}
                >
                  テキストを表示
                </button>
                <button
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm"
                  onClick={handleCopyExportText}
                  disabled={!exportText}
                >
                  コピー
                </button>
              </div>
              <textarea
                value={exportText}
                readOnly
                placeholder='ここにエクスポート用JSONが表示されます'
                className="w-full h-56 border border-slate-300 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm"
                onClick={() => {
                  setIsExportDialogOpen(false);
                  setExportText('');
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
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
            {filterButtons.map((btn: import('../common/types').FilterButton) => (
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
        <p className="text-xs text-slate-500">
          並び順: 期限（昇順）→ 工数（昇順）
        </p>
      </div>
      <main
        id="todo-list"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
      >
        {filteredTodos.length > 0 ? (
          filteredTodos.map(todo => (
            <TodoCard
              key={todo.id}
              todo={todo}
              dependentTodos={getDependencyIds(todo)
                .map(getTodo)
                .filter((t): t is Todo => Boolean(t))}
              filter={filter}
              currentInProgressId={currentInProgressId}
              onEdit={handleEdit}
              onDelete={() => handleDelete(todo.id)}
              onComplete={() => handleComplete(todo.id)}
              onStartTodo={startTodo}
            />
          ))
        ) : (
          <p className="text-slate-500 col-span-full text-center py-10">タスクはありません。</p>
        )}
      </main>
    </>
  );
};
