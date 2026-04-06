import type { FC } from 'react';
import { Check, Pencil, Play, Square, Trash2 } from 'lucide-react';
import type { Todo } from '@/features/todo/model/types';
import { formatDate, isMeetingTodo } from '@/features/todo/model/todo-utils';

type TodoListRowsProps = {
  todos: Todo[];
  filter: string;
  selectedTodoId: string | null;
  currentInProgressId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onStartTodo: (id: string) => void;
};

const statusClasses: Record<Todo['status'], string> = {
  Unlocked: 'bg-blue-100 text-blue-800',
  Locked: 'bg-purple-100 text-purple-800',
  Completed: 'bg-green-100 text-green-800',
};

export const TodoListRows: FC<TodoListRowsProps> = ({
  todos,
  filter,
  selectedTodoId,
  currentInProgressId,
  onSelect,
  onEdit,
  onDelete,
  onComplete,
  onStartTodo,
}) => {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm text-left text-slate-700">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">タイトル</th>
            <th className="px-3 py-2">状態</th>
            <th className="hidden md:table-cell px-3 py-2">種別</th>
            <th className="hidden sm:table-cell px-3 py-2">期限</th>
            <th className="hidden md:table-cell px-3 py-2">工数</th>
            <th className="px-3 py-2 text-right w-40 sm:w-auto">操作</th>
          </tr>
        </thead>
        <tbody>
          {todos.map(todo => {
            const isMeeting = isMeetingTodo(todo);
            const isSelected = selectedTodoId === todo.id;
            const isInProgress = currentInProgressId === todo.id;

            return (
              <tr
                key={todo.id}
                id={`todo-row-${todo.id}`}
                role="option"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelect(todo.id)}
                onFocus={() => onSelect(todo.id)}
                className={`${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : ''} ${isInProgress ? 'bg-blue-50/60' : ''} border-t border-slate-100 hover:bg-slate-50 cursor-pointer`}
              >
                <td className="px-3 py-3 align-top">
                  <div className="font-medium text-slate-900 break-words">{todo.title}</div>
                  <div className="mt-1 text-xs text-slate-500 sm:hidden space-y-0.5">
                    <div>期限: {formatDate(todo.dueDate)}</div>
                    <div>種別: {isMeeting ? 'Meeting' : 'Normal'}</div>
                    {!isMeeting && <div>工数: {todo.effortMinutes || 0} 分</div>}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${statusClasses[todo.status]}`}
                  >
                    {todo.status}
                  </span>
                </td>
                <td className="hidden md:table-cell px-3 py-3">
                  {isMeeting ? 'Meeting' : 'Normal'}
                </td>
                <td className="hidden sm:table-cell px-3 py-3 whitespace-nowrap">
                  {formatDate(todo.dueDate)}
                </td>
                <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap">
                  {isMeeting ? '-' : `${todo.effortMinutes || 0} 分`}
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex justify-end sm:justify-end flex-wrap gap-1">
                    {!isMeeting && filter === 'unlocked' && todo.status === 'Unlocked' && (
                      <button
                        className={`text-xs ${
                          isInProgress
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        } text-white font-semibold py-1 px-2 rounded-md inline-flex items-center justify-center`}
                        aria-label={isInProgress ? '中断' : '着手'}
                        onClick={event => {
                          event.stopPropagation();
                          onStartTodo(todo.id);
                        }}
                      >
                        <span className="sm:hidden">
                          {isInProgress ? <Square size={14} /> : <Play size={14} />}
                        </span>
                        <span className="hidden sm:inline">{isInProgress ? '中断' : '着手'}</span>
                      </button>
                    )}
                    {!isMeeting && todo.status !== 'Completed' && (
                      <button
                        className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded-md inline-flex items-center justify-center"
                        aria-label="完了"
                        onClick={event => {
                          event.stopPropagation();
                          onComplete(todo.id);
                        }}
                      >
                        <span className="sm:hidden">
                          <Check size={14} />
                        </span>
                        <span className="hidden sm:inline">完了</span>
                      </button>
                    )}
                    <button
                      className="text-xs bg-slate-500 hover:bg-slate-600 text-white font-semibold py-1 px-2 rounded-md inline-flex items-center justify-center"
                      aria-label="編集"
                      onClick={event => {
                        event.stopPropagation();
                        onEdit(todo.id);
                      }}
                    >
                      <span className="sm:hidden">
                        <Pencil size={14} />
                      </span>
                      <span className="hidden sm:inline">編集</span>
                    </button>
                    <button
                      className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded-md inline-flex items-center justify-center"
                      aria-label="削除"
                      onClick={event => {
                        event.stopPropagation();
                        onDelete(todo.id);
                      }}
                    >
                      <span className="sm:hidden">
                        <Trash2 size={14} />
                      </span>
                      <span className="hidden sm:inline">削除</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
