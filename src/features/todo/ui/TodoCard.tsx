import React, { useEffect, useState } from 'react';
import type { Todo } from '@/features/todo/model/types';
import {
  formatDate,
  formatDurationFromSeconds,
  isMeetingTodo,
} from '@/features/todo/model/todo-utils';
import { marked } from 'marked';

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
  currentInProgressId: string | null;
  onSelect: (id: string) => void;
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
  currentInProgressId,
  onSelect,
  onEdit,
  onDelete,
  onComplete,
  onStartTodo,
}) => {
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
      const titles = incompleteDependencies.map((t: Todo) => t.title).join('、');
      lockedReasonHtml = `<div class='col-span-2 mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md text-purple-700 text-xs'>依存タスク「${titles}」が未完了です。</div>`;
    } else if (isLockedOnTime) {
      lockedReasonHtml = `<div class='col-span-2 mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md text-purple-700 text-xs'>着手可能日時 (${formatDate(
        todo.startableAt,
      )}) になっていません。</div>`;
    }
  }

  const [previewHtml, setPreviewHtml] = useState('');
  const [truncatedHtml, setTruncatedHtml] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

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
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">{todo.title}</h3>
          <div className="flex-shrink-0 ml-2 mt-1 sm:mt-0">
            <span
              className={`text-xs sm:text-sm font-semibold px-2 py-1 rounded-full ${
                statusClasses[todo.status]
              }`}
            >
              {todo.status}
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
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-500 hover:text-blue-700 mb-3"
          >
            {isExpanded ? '折りたたむ' : '展開'}
          </button>
        )}
      </div>
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-500 mt-4 pt-4 border-t">
          <div>
            <strong>{isMeeting ? '開始日時' : '着手可能日時'}:</strong>{' '}
            {formatDate(todo.startableAt)}
          </div>
          <div>
            <strong>{isMeeting ? '終了日時' : '期限'}:</strong> {formatDate(todo.dueDate)}
          </div>
          {!isMeeting && (
            <div>
              <strong>工数:</strong> {todo.effortMinutes || 0} 分
            </div>
          )}
          {!isMeeting && (
            <div>
              <strong>実作業時間:</strong> {formatDurationFromSeconds(todo.actualWorkSeconds)}
            </div>
          )}
          {!isMeeting && dependencyList.length > 0 && (
            <div className="col-span-1 sm:col-span-2">
              <strong>依存Todo:</strong>
              <div className="mt-1 space-y-1">
                {dependencyList.map((dep: Todo) => {
                  const displayStatus = dep.status === 'Completed' ? 'Unlocked' : 'Locked';
                  return (
                    <div key={dep.id} className="flex items-center gap-2">
                      <span className="text-slate-700">{dep.title}</span>
                      <span
                        className={`text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-full ${
                          statusClasses[displayStatus]
                        }`}
                      >
                        {displayStatus}
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
              className={`text-xs sm:text-sm ${
                currentInProgressId === todo.id
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white font-semibold py-1 px-2 sm:px-3 rounded-md`}
            >
              {currentInProgressId === todo.id ? '中断' : '着手'}
            </button>
          )}
          {!isMeeting && todo.status !== 'Completed' && (
            <button
              onClick={() => onComplete(todo.id)}
              className="text-xs sm:text-sm bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 sm:px-3 rounded-md"
            >
              完了
            </button>
          )}
          <button
            onClick={() => onEdit(todo.id)}
            className="text-xs sm:text-sm bg-slate-500 hover:bg-slate-600 text-white font-semibold py-1 px-2 sm:px-3 rounded-md"
          >
            編集
          </button>
          <button
            onClick={() => onDelete(todo.id)}
            className="text-xs sm:text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 sm:px-3 rounded-md"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
};
