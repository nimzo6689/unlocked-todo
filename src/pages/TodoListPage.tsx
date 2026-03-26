import { useNavigate, useSearchParams } from 'react-router-dom';
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
    requestNotificationPermission,
    notificationEnabled,
    handleDelete,
    handleComplete,
    decrementEffort,
    currentInProgressId,
    startTodo,
  } = useTodoContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'unlocked';
  const sortBy = (searchParams.get('sortBy') as 'dueDate' | 'createdAt') || 'dueDate';

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

  function handleSortChange(s: 'dueDate' | 'createdAt') {
    setSearchParams({
      ...Object.fromEntries(searchParams.entries()),
      sortBy: s,
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
      if (sortBy === 'dueDate' && a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <div className="text-left w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Unlocked Todo</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            現在 {filteredTodos.length} 件のタスクがあります。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
          <button
            className={`bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-3 sm:px-4 rounded-lg shadow-md transition-transform hover:scale-105 text-sm sm:text-base ${
              notificationEnabled ? 'bg-slate-400 cursor-not-allowed' : ''
            }`}
            disabled={notificationEnabled}
            onClick={requestNotificationPermission}
          >
            {notificationEnabled ? '通知は有効です' : '通知を有効にする'}
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 sm:px-4 rounded-lg shadow-md transition-transform hover:scale-105 text-sm sm:text-base"
            onClick={handleNew}
          >
            新規作成
          </button>
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
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm font-medium text-slate-600">ソート:</span>
          <select
            value={sortBy}
            onChange={e => handleSortChange(e.target.value as 'dueDate' | 'createdAt')}
            className="border border-slate-300 rounded-md text-xs sm:text-sm p-1 sm:p-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="dueDate">期限順</option>
            <option value="createdAt">作成日順</option>
          </select>
        </div>
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
              onEffortDecrement={() => decrementEffort(todo.id)}
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
