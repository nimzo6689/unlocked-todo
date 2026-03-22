import React, { useEffect, useState } from 'react';
import type { Todo } from '../common/types';
import { formatDate } from '../common/utils';
import { marked } from 'marked';

const statusClasses: Record<string, string> = {
  Unlocked: 'bg-blue-100 text-blue-800',
  Locked: 'bg-purple-100 text-purple-800',
  Completed: 'bg-green-100 text-green-800',
};

const assigneeClasses: Record<string, string> = {
  自分: 'bg-indigo-100 text-indigo-800',
  他人: 'bg-pink-100 text-pink-800',
};

export type TodoCardProps = {
  todo: Todo;
  dependentTodos?: Todo[];
  filter: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onEffortDecrement: (id: string) => void;
};

export const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  dependentTodos,
  filter,
  onEdit,
  onDelete,
  onComplete,
  onEffortDecrement,
}) => {
  const now = new Date();
  const dueDate = new Date(todo.dueDate);
  const startableAt = new Date(todo.startableAt || todo.createdAt);
  const isOverdue = new Date(dueDate.getTime() - (todo.effortMinutes || 0) * 60 * 1000) < now;
  const isDueToday = dueDate.toDateString() === now.toDateString();
  let cardBgClass = 'bg-white';
  if (todo.status !== 'Completed') {
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
  const isLockedOnTime = todo.status === 'Unlocked' && startableAt > now;
  let lockedReasonHtml = '';
  if (filter === 'locked' && (isDependencyIncomplete || isLockedOnTime)) {
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
  const [isWorking, setIsWorking] = useState(false);

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

  useEffect(() => {
    if (!isWorking) return;
    const interval = setInterval(() => {
      onEffortDecrement(todo.id);
    }, 60_000);

    return () => clearInterval(interval);
  }, [isWorking, onEffortDecrement, todo.id]);

  useEffect(() => {
    if (todo.status !== 'Unlocked' && isWorking) {
      setIsWorking(false);
    }
  }, [todo.status, isWorking]);

  return (
    <div
      className={`${cardBgClass} rounded-lg shadow-md p-3 sm:p-4 border flex flex-col justify-between transition-shadow hover:shadow-lg`}
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
            <strong>着手可能日時:</strong> {formatDate(todo.startableAt)}
          </div>
          <div>
            <strong>期限:</strong> {formatDate(todo.dueDate)}
          </div>
          <div>
            <strong>工数:</strong> {todo.effortMinutes || 0} 分
          </div>
          <div className="col-span-1 sm:col-span-2">
            <strong>担当:</strong>{' '}
            <span
              className={`font-semibold px-2 py-0.5 rounded-full ${assigneeClasses[todo.assignee]}`}
            >
              {todo.assignee}
            </span>
          </div>
          {dependencyList.length > 0 && (
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
          {filter === 'unlocked' && todo.status === 'Unlocked' && (
            <button
              onClick={() => setIsWorking((prev) => !prev)}
              className={`text-xs sm:text-sm ${
                isWorking
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white font-semibold py-1 px-2 sm:px-3 rounded-md`}
            >
              {isWorking ? '中断' : '着手'}
            </button>
          )}
          {todo.status !== 'Completed' && (
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
