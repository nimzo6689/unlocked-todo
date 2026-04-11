import type { FC } from 'react';
import { Check, Pencil, Play, Square, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Todo } from '@/features/todo/model/types';
import {
  formatDate,
  getTodoStatusLabel,
  getTodoTaskTypeLabel,
  getTodoTitleFallback,
  isMeetingTodo,
} from '@/features/todo/model/todo-utils';
import { useAppLocale } from '@/shared/i18n/useAppLocale';

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
  const { t } = useTranslation();
  const { locale } = useAppLocale();

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm text-left text-slate-700">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">{t('todo.rows.headers.title')}</th>
            <th className="px-3 py-2">{t('todo.rows.headers.status')}</th>
            <th className="hidden md:table-cell px-3 py-2">{t('todo.rows.headers.type')}</th>
            <th className="hidden sm:table-cell px-3 py-2">{t('todo.rows.headers.dueDate')}</th>
            <th className="hidden md:table-cell px-3 py-2">{t('todo.rows.headers.effort')}</th>
            <th className="px-3 py-2 text-right w-40 sm:w-auto">
              {t('todo.rows.headers.actions')}
            </th>
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
                className={`${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : ''} ${isInProgress ? 'bg-blue-50/60' : ''} border-t border-slate-100 hover:bg-slate-50`}
              >
                <td className="px-3 py-3 align-top">
                  <div className="font-medium text-slate-900 break-words">
                    {todo.title || getTodoTitleFallback(locale)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 sm:hidden space-y-0.5">
                    <div>
                      {t('todo.form.dueDate')}: {formatDate(todo.dueDate, locale)}
                    </div>
                    <div>
                      {t('todo.rows.headers.type')}:{' '}
                      {getTodoTaskTypeLabel(isMeeting ? 'Meeting' : 'Normal', locale)}
                    </div>
                    {!isMeeting && (
                      <div>
                        {t('todo.form.effortMinutes')}: {todo.effortMinutes || 0} 分
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${statusClasses[todo.status]}`}
                  >
                    {getTodoStatusLabel(todo.status, locale)}
                  </span>
                </td>
                <td className="hidden md:table-cell px-3 py-3">
                  {getTodoTaskTypeLabel(isMeeting ? 'Meeting' : 'Normal', locale)}
                </td>
                <td className="hidden sm:table-cell px-3 py-3 whitespace-nowrap">
                  {formatDate(todo.dueDate, locale)}
                </td>
                <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap">
                  {isMeeting ? '-' : `${todo.effortMinutes || 0} 分`}
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex justify-end sm:justify-end flex-wrap gap-1">
                    {!isMeeting && filter === 'unlocked' && todo.status === 'Unlocked' && (
                      <button
                        className={`todo-list-action-button ${
                          isInProgress ? 'todo-list-button-warning' : 'todo-list-button-primary'
                        } text-xs ${
                          isInProgress
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        } text-white font-semibold py-1 px-2 rounded-md inline-flex items-center justify-center`}
                        aria-label={isInProgress ? t('todo.card.pause') : t('todo.card.start')}
                        onClick={event => {
                          event.stopPropagation();
                          onStartTodo(todo.id);
                        }}
                      >
                        <span className="sm:hidden">
                          {isInProgress ? <Square size={14} /> : <Play size={14} />}
                        </span>
                        <span className="hidden sm:inline">
                          {isInProgress ? t('todo.card.pause') : t('todo.card.start')}
                        </span>
                      </button>
                    )}
                    {!isMeeting && todo.status !== 'Completed' && (
                      <button
                        className="todo-list-action-button todo-list-button-success text-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded-md inline-flex items-center justify-center"
                        aria-label={t('todo.card.complete')}
                        onClick={event => {
                          event.stopPropagation();
                          onComplete(todo.id);
                        }}
                      >
                        <span className="sm:hidden">
                          <Check size={14} />
                        </span>
                        <span className="hidden sm:inline">{t('todo.card.complete')}</span>
                      </button>
                    )}
                    <button
                      className="todo-list-action-button todo-list-button-neutral text-xs bg-slate-500 hover:bg-slate-600 text-white font-semibold py-1 px-2 rounded-md inline-flex items-center justify-center"
                      aria-label={t('todo.card.edit')}
                      onClick={event => {
                        event.stopPropagation();
                        onEdit(todo.id);
                      }}
                    >
                      <span className="sm:hidden">
                        <Pencil size={14} />
                      </span>
                      <span className="hidden sm:inline">{t('todo.card.edit')}</span>
                    </button>
                    <button
                      className="todo-list-action-button todo-list-button-danger text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded-md inline-flex items-center justify-center"
                      aria-label={t('todo.card.delete')}
                      onClick={event => {
                        event.stopPropagation();
                        onDelete(todo.id);
                      }}
                    >
                      <span className="sm:hidden">
                        <Trash2 size={14} />
                      </span>
                      <span className="hidden sm:inline">{t('todo.card.delete')}</span>
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
