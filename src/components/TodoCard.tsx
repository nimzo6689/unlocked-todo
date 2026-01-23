import React, { useEffect, useState } from 'react';
import type { Todo } from '../common/db';
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
  dependentTodo?: Todo | null;
  filter: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  dependentTodo,
  filter,
  onEdit,
  onDelete,
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
  const isDependencyIncomplete = dependentTodo && dependentTodo.status !== 'Completed';
  const isLockedOnTime = todo.status === 'Unlocked' && startableAt > now;
  let lockedReasonHtml = '';
  if (filter === 'locked' && (isDependencyIncomplete || isLockedOnTime)) {
    if (isDependencyIncomplete) {
      lockedReasonHtml = `<div class='col-span-2 mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md text-purple-700 text-xs'>依存タスク「${dependentTodo?.title}」が未完了です。</div>`;
    } else if (isLockedOnTime) {
      lockedReasonHtml = `<div class='col-span-2 mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md text-purple-700 text-xs'>着手可能日時 (${formatDate(
        todo.startableAt,
      )}) になっていません。</div>`;
    }
  }

  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    const result = marked.parse(todo.description || '');
    if (typeof result === 'string') {
      setPreviewHtml(result);
    } else if (result instanceof Promise) {
      result.then(html => setPreviewHtml(html));
    }
  }, [todo.description]);

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
            __html: previewHtml,
          }}
        />
      </div>
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-500 mt-4 pt-4 border-t">
          <div>
            <strong>作成日:</strong> {formatDate(todo.createdAt)}
          </div>
          <div>
            <strong>着手可能日:</strong> {formatDate(todo.startableAt)}
          </div>
          <div>
            <strong>期限日:</strong> {formatDate(todo.dueDate)}
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
          {dependentTodo && (
            <div className="col-span-1 sm:col-span-2">
              <strong>依存Todo:</strong>
              <span className="text-slate-700">{dependentTodo.title}</span>
              <span
                className={`text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-full ${
                  statusClasses[dependentTodo.status]
                }`}
              >
                {dependentTodo.status}
              </span>
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
