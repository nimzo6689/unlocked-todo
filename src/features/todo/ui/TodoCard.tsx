import React, { useEffect, useState } from 'react';
import type { Todo } from '@/features/todo/model/types';
import { useTranslation } from 'react-i18next';
import {
  formatDate,
  formatDurationFromSeconds,
  getTodoStatusLabel,
  getTodoTitleFallback,
  isMeetingTodo,
} from '@/features/todo/model/todo-utils';
import { marked } from 'marked';
import { useAppLocale } from '@/shared/i18n/useAppLocale';

const statusClasses: Record<string, string> = {
  Unlocked: 'bg-blue-100 text-blue-800',
  Locked: 'bg-purple-100 text-purple-800',
  Completed: 'bg-green-100 text-green-800',
};

export type TodoCardProps = {
  todo: Todo;
  dependentTodos?: Todo[];
  filter: string;
  selected: boolean;
  isExpanded: boolean;
  currentInProgressId: string | null;
  onSelect: (id: string) => void;
  onExpandedChange: (id: string, expanded: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onStartTodo: (id: string) => void;
};

export const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  dependentTodos,
  filter,
  selected,
  isExpanded,
  currentInProgressId,
  onSelect,
  onExpandedChange,
  onEdit,
  onDelete,
  onComplete,
  onStartTodo,
}) => {
  const { t } = useTranslation();
  const { locale } = useAppLocale();
  const isMeeting = isMeetingTodo(todo);
  const now = new Date();
  const dueDate = new Date(todo.dueDate);
  const startableAt = new Date(todo.startableAt || todo.createdAt);
  const isOverdue = isMeeting
    ? dueDate < now
    : new Date(dueDate.getTime() - (todo.effortMinutes || 0) * 60 * 1000) < now;
  const isDueToday = dueDate.toDateString() === now.toDateString();
  const isInProgress = todo.id === currentInProgressId;
  const isMeetingInProgress =
    isMeeting && todo.status !== 'Completed' && startableAt <= now && dueDate > now;
  let cardBgClass = 'bg-white';
  if (isInProgress || isMeetingInProgress) {
    cardBgClass = 'bg-blue-50 border-blue-500 border-2 shadow-blue-200';
  } else if (todo.status !== 'Completed') {
    if (isOverdue) {
      cardBgClass = 'bg-red-100 border-red-300';
    } else if (isDueToday) {
      cardBgClass = 'bg-yellow-100 border-yellow-300';
    }
  } else {
    cardBgClass = 'bg-slate-50 opacity-70';
  }
  const dependencyList = dependentTodos ?? [];
  const incompleteDependencies = dependencyList.filter((t: Todo) => t.status !== 'Completed');
  const isDependencyIncomplete = incompleteDependencies.length > 0;
  const isLockedOnTime = !isMeeting && todo.status === 'Unlocked' && startableAt > now;
  let lockedReasonHtml = '';
  if (!isMeeting && filter === 'locked' && (isDependencyIncomplete || isLockedOnTime)) {
    if (isDependencyIncomplete) {
      const separator = locale === 'ja' ? '、' : ', ';
      const titles = incompleteDependencies
        .map((dep: Todo) => dep.title || getTodoTitleFallback(locale))
        .join(separator);
      lockedReasonHtml = `<div class='col-span-2 mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md text-purple-700 text-xs'>${t('todo.card.lockedByDependency', { titles })}</div>`;
    } else if (isLockedOnTime) {
      lockedReasonHtml = `<div class='col-span-2 mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md text-purple-700 text-xs'>${t(
        'todo.card.lockedByStartableAt',
        {
          date: formatDate(todo.startableAt, locale),
        },
      )}</div>`;
    }
  }

  const [previewHtml, setPreviewHtml] = useState('');
  const [truncatedHtml, setTruncatedHtml] = useState('');

  const isLongDescription = (todo.description || '').length > 100;

  useEffect(() => {
    const desc = todo.description || '';
    const fullResult = marked.parse(desc);
    if (typeof fullResult === 'string') {
      setPreviewHtml(fullResult);
    } else if (fullResult instanceof Promise) {
      fullResult.then(html => setPreviewHtml(html));
    }

    if (isLongDescription) {
      const truncatedDesc = desc.substring(0, 100) + '...';
      const truncatedResult = marked.parse(truncatedDesc);
      if (typeof truncatedResult === 'string') {
        setTruncatedHtml(truncatedResult);
      } else if (truncatedResult instanceof Promise) {
        truncatedResult.then(html => setTruncatedHtml(html));
      }
    }
  }, [todo.description, isLongDescription]);

  return (
    <div
      id={`todo-card-${todo.id}`}
      role="option"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(todo.id)}
      onFocus={() => onSelect(todo.id)}
      className={`${cardBgClass} ${selected ? 'ring-2 ring-slate-400 ring-offset-2' : ''} rounded-lg shadow-md p-3 sm:p-4 border flex flex-col justify-between transition-shadow hover:shadow-lg`}
    >
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-1 sm:gap-0">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
            {todo.title || getTodoTitleFallback(locale)}
          </h3>
          <div className="flex-shrink-0 ml-2 mt-1 sm:mt-0">
            <span
              className={`text-xs sm:text-sm font-semibold px-2 py-1 rounded-full ${
                statusClasses[todo.status]
              }`}
            >
              {getTodoStatusLabel(todo.status, locale)}
            </span>
          </div>
        </div>
        <div
          className="text-xs sm:text-sm text-slate-600 mb-3 markdown-preview"
          dangerouslySetInnerHTML={{
            __html: isLongDescription && !isExpanded ? truncatedHtml : previewHtml,
          }}
        />
        {isLongDescription && (
          <button
            onClick={() => onExpandedChange(todo.id, !isExpanded)}
            className="todo-list-action-button todo-list-button-link text-xs text-blue-500 hover:text-blue-700 mb-3"
          >
            {isExpanded ? t('todo.card.collapse') : t('todo.card.expand')}
          </button>
        )}
      </div>
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-500 mt-4 pt-4 border-t">
          <div>
            <strong>{isMeeting ? t('todo.form.meetingStart') : t('todo.form.startableAt')}:</strong>{' '}
            {formatDate(todo.startableAt, locale)}
          </div>
          <div>
            <strong>{isMeeting ? t('todo.form.meetingEnd') : t('todo.form.dueDate')}:</strong>{' '}
            {formatDate(todo.dueDate, locale)}
          </div>
          {!isMeeting && (
            <div>
              <strong>{t('todo.form.effortMinutes')}:</strong> {todo.effortMinutes || 0} 分
            </div>
          )}
          {!isMeeting && (
            <div>
              <strong>{t('todo.form.actualWorkMinutes')}:</strong>{' '}
              {formatDurationFromSeconds(todo.actualWorkSeconds)}
            </div>
          )}
          {!isMeeting && dependencyList.length > 0 && (
            <div className="col-span-1 sm:col-span-2">
              <strong>{t('todo.card.dependencyLabel')}:</strong>
              <div className="mt-1 space-y-1">
                {dependencyList.map((dep: Todo) => {
                  const displayStatus = dep.status === 'Completed' ? 'Unlocked' : 'Locked';
                  return (
                    <div key={dep.id} className="flex items-center gap-2">
                      <span className="text-slate-700">
                        {dep.title || getTodoTitleFallback(locale)}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-full ${
                          statusClasses[displayStatus]
                        }`}
                      >
                        {getTodoStatusLabel(displayStatus, locale)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {lockedReasonHtml && (
            <div
              className="col-span-1 sm:col-span-2"
              dangerouslySetInnerHTML={{ __html: lockedReasonHtml }}
            />
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2 mt-4">
          {!isMeeting && filter === 'unlocked' && todo.status === 'Unlocked' && (
            <button
              onClick={() => onStartTodo(todo.id)}
              className={`todo-list-action-button ${
                currentInProgressId === todo.id
                  ? 'todo-list-button-warning'
                  : 'todo-list-button-primary'
              } text-xs sm:text-sm ${
                currentInProgressId === todo.id
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white font-semibold py-1 px-2 sm:px-3 rounded-md`}
            >
              {currentInProgressId === todo.id ? t('todo.card.pause') : t('todo.card.start')}
            </button>
          )}
          {!isMeeting && todo.status !== 'Completed' && (
            <button
              onClick={() => onComplete(todo.id)}
              className="todo-list-action-button todo-list-button-success text-xs sm:text-sm bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 sm:px-3 rounded-md"
            >
              {t('todo.card.complete')}
            </button>
          )}
          <button
            onClick={() => onEdit(todo.id)}
            className="todo-list-action-button todo-list-button-neutral text-xs sm:text-sm bg-slate-500 hover:bg-slate-600 text-white font-semibold py-1 px-2 sm:px-3 rounded-md"
          >
            {t('todo.card.edit')}
          </button>
          <button
            onClick={() => onDelete(todo.id)}
            className="todo-list-action-button todo-list-button-danger text-xs sm:text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 sm:px-3 rounded-md"
          >
            {t('todo.card.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};
