import React from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { Todo } from '@/features/todo/model/types';
import {
  DEFAULT_EFFORT_MINUTES,
  formatDateForInput,
  formatDurationFromSeconds,
  isMeetingTodo,
} from '@/features/todo/model/todo-utils';

export type TodoFormProps = {
  form: Partial<Todo>;
  todos: Todo[];
  onChange: (form: Partial<Todo>) => void;
  successorIds: string[];
  onSuccessorChange: (successorIds: string[]) => void;
  onSave: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onOpenTodo: (id: string) => void;
  saving?: boolean;
};

export const TodoForm: React.FC<TodoFormProps> = ({
  form,
  todos,
  onChange,
  successorIds,
  onSuccessorChange,
  onSave,
  onComplete,
  onCancel,
  onOpenTodo,
  saving = false,
}) => {
  const taskType = form.taskType || 'Normal';
  const isMeeting = isMeetingTodo({ taskType });
  const hasDependency = form.dependency
    ? Array.isArray(form.dependency)
      ? form.dependency.length > 0
      : true
    : false;
  const availableDependencyTodos = todos.filter(t => t.id !== form.id && t.status !== 'Completed');
  const currentDeps = Array.isArray(form.dependency)
    ? form.dependency
    : form.dependency
    ? [form.dependency]
    : [];

  const [isPredecessorExpanded, setIsPredecessorExpanded] = React.useState(false);
  const [isSuccessorExpanded, setIsSuccessorExpanded] = React.useState(false);
  const normalizedActualWorkSeconds = Number.isFinite(Number(form.actualWorkSeconds))
    ? Math.max(0, Math.floor(Number(form.actualWorkSeconds)))
    : 0;
  const actualWorkMinutes = Math.floor(normalizedActualWorkSeconds / 60);

  React.useEffect(() => {
    setIsPredecessorExpanded(currentDeps.length > 0);
    setIsSuccessorExpanded(successorIds.length > 0);
  }, [form.id]);

  React.useEffect(() => {
    if (currentDeps.length > 0) {
      setIsPredecessorExpanded(true);
    }
  }, [currentDeps.length]);

  React.useEffect(() => {
    if (successorIds.length > 0) {
      setIsSuccessorExpanded(true);
    }
  }, [successorIds.length]);

  function toggleDependency(todoId: string) {
    const isSelected = currentDeps.includes(todoId);
    const newDeps = isSelected
      ? currentDeps.filter(id => id !== todoId)
      : [...currentDeps, todoId];

    onChange({
      ...form,
      dependency: newDeps,
      ...(newDeps.length > 0 ? { startableAt: '' } : {}),
    });
  }

  function toggleSuccessor(todoId: string) {
    const isSelected = successorIds.includes(todoId);
    const newSuccessors = isSelected
      ? successorIds.filter(id => id !== todoId)
      : [...successorIds, todoId];

    onSuccessorChange(newSuccessors);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      className="p-2 sm:p-4"
    >
      <input type="hidden" value={form.id || ''} />
      <div className="mb-4">
        <label htmlFor="title" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          required
          value={form.title || ''}
          onChange={e => onChange({ ...form, title: e.target.value })}
          className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="taskType" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
          タスク種別
        </label>
        <select
          id="taskType"
          value={taskType}
          onChange={e =>
            onChange({
              ...form,
              taskType: e.target.value as Todo['taskType'],
              ...(e.target.value === 'Meeting'
                ? {
                    effortMinutes: 0,
                    actualWorkSeconds: 0,
                    dependency: [],
                  }
                : {}),
            })
          }
          className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-xs sm:text-sm"
        >
          <option value="Normal">Normal</option>
          <option value="Meeting">Meeting</option>
        </select>
      </div>
      <div className="mb-4">
        <label
          htmlFor="description"
          className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
        >
          説明
        </label>
        <textarea
          id="description"
          rows={8}
          value={form.description || ''}
          onChange={e => onChange({ ...form, description: e.target.value })}
          className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4">
        <div>
          <label
            htmlFor="startableAt"
            className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
          >
            {isMeeting ? '開始日時' : '着手可能日時'}
          </label>
          <input
            type="datetime-local"
            id="startableAt"
            disabled={hasDependency}
            value={formatDateForInput(form.startableAt)}
            onChange={e =>
              onChange({
                ...form,
                startableAt: new Date(e.target.value).toISOString(),
              })
            }
            className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label
            htmlFor="dueDate"
            className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
          >
            {isMeeting ? '終了日時' : '期限'} <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="dueDate"
            required
            value={formatDateForInput(form.dueDate)}
            onChange={e =>
              onChange({
                ...form,
                dueDate: new Date(e.target.value).toISOString(),
              })
            }
            className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
          />
        </div>
        {!isMeeting && (
          <>
            <div>
              <label
                htmlFor="effortMinutes"
                className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
              >
                工数 (分)
              </label>
              <input
                type="number"
                id="effortMinutes"
                min={1}
                value={form.effortMinutes || DEFAULT_EFFORT_MINUTES}
                onChange={e =>
                  onChange({
                    ...form,
                    effortMinutes: parseInt(e.target.value, 10) || DEFAULT_EFFORT_MINUTES,
                  })
                }
                className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="actualWorkMinutes"
                className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
              >
                実作業時間 (分)
              </label>
              <input
                type="number"
                id="actualWorkMinutes"
                min={0}
                value={actualWorkMinutes}
                onChange={e => {
                  const inputMinutes = Number(e.target.value);
                  const nextMinutes = Number.isFinite(inputMinutes)
                    ? Math.max(0, Math.floor(inputMinutes))
                    : 0;
                  onChange({
                    ...form,
                    actualWorkSeconds: nextMinutes * 60,
                  });
                }}
                className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="mt-2 flex flex-wrap gap-2">
                {[5, 10, 25, 55, 115].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ ...form, effortMinutes: value })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-700 hover:bg-slate-100"
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] sm:text-xs text-slate-500">
                実作業時間表示: {formatDurationFromSeconds(normalizedActualWorkSeconds)}
              </p>
            </div>
          </>
        )}
      </div>
      {!isMeeting && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-6">
          <div>
            <label
              htmlFor="status"
              className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
            >
              ステータス
            </label>
            <select
              id="status"
              value={form.status || 'Unlocked'}
              onChange={e => onChange({ ...form, status: e.target.value as Todo['status'] })}
              className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-xs sm:text-sm"
            >
              <option value="Unlocked">Unlocked</option>
              <option value="Locked">Locked</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="assignee"
              className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
            >
              担当
            </label>
            <select
              id="assignee"
              value={form.assignee || '自分'}
              onChange={e =>
                onChange({
                  ...form,
                  assignee: e.target.value as Todo['assignee'],
                })
              }
              className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-xs sm:text-sm"
            >
              <option value="自分">自分</option>
              <option value="他人">他人</option>
            </select>
          </div>
        </div>
      )}
      {!isMeeting && <div className="mb-6">
        <button
          type="button"
          onClick={() => setIsPredecessorExpanded(prev => !prev)}
          className="mb-1 flex w-full items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-left text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100"
          aria-expanded={isPredecessorExpanded}
          aria-controls="predecessor"
        >
          <span>先行タスク</span>
          {isPredecessorExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {isPredecessorExpanded && (
          <div
            id="predecessor"
            className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-slate-300 bg-white p-2 shadow-sm"
          >
            {availableDependencyTodos.length > 0 ? (
              availableDependencyTodos.map(todo => {
                const isSelected = currentDeps.includes(todo.id);
                const checkboxId = `predecessor-${todo.id}`;
                const isBlockedBySuccessor = successorIds.includes(todo.id);

                return (
                  <div
                    key={todo.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <label htmlFor={checkboxId} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        id={checkboxId}
                        type="checkbox"
                        checked={isSelected}
                        disabled={isBlockedBySuccessor}
                        onChange={() => toggleDependency(todo.id)}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate text-xs sm:text-sm text-slate-700">{todo.title}</span>
                    </label>
                    <button
                      type="button"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenTodo(todo.id);
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-600 hover:bg-slate-100"
                      aria-label={`${todo.title} のTodoフォームを開く`}
                    >
                      <span>開く</span>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="px-1 py-2 text-xs sm:text-sm text-slate-500">選択可能なTodoはありません。</p>
            )}
          </div>
        )}
        <p className="mt-1 text-xs text-slate-500">行を押すと先行タスクを複数選択できます。</p>
      </div>}
      {!isMeeting && <div className="mb-6">
        <button
          type="button"
          onClick={() => setIsSuccessorExpanded(prev => !prev)}
          className="mb-1 flex w-full items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-left text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100"
          aria-expanded={isSuccessorExpanded}
          aria-controls="successor"
        >
          <span>後続タスク</span>
          {isSuccessorExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {!form.id ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-600">
            後続タスクは保存後に設定できます。
          </div>
        ) : isSuccessorExpanded ? (
          <div
            id="successor"
            className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-slate-300 bg-white p-2 shadow-sm"
          >
            {availableDependencyTodos.length > 0 ? (
              availableDependencyTodos.map(todo => {
                const isSelected = successorIds.includes(todo.id);
                const checkboxId = `successor-${todo.id}`;
                const isBlockedByDependency = currentDeps.includes(todo.id);

                return (
                  <div
                    key={todo.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <label
                      htmlFor={checkboxId}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                    >
                      <input
                        id={checkboxId}
                        type="checkbox"
                        checked={isSelected}
                        disabled={isBlockedByDependency}
                        onChange={() => toggleSuccessor(todo.id)}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="truncate text-xs sm:text-sm text-slate-700">{todo.title}</span>
                    </label>
                    <button
                      type="button"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenTodo(todo.id);
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-600 hover:bg-slate-100"
                      aria-label={`${todo.title} のTodoフォームを開く`}
                    >
                      <span>開く</span>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="px-1 py-2 text-xs sm:text-sm text-slate-500">選択可能なTodoはありません。</p>
            )}
          </div>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">行を押すと後続タスクを複数選択できます。</p>
      </div>}
      <div className="flex flex-wrap justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-2 px-3 sm:px-4 rounded-lg shadow-md text-xs sm:text-sm"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={saving}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-3 sm:px-4 rounded-lg shadow-md text-xs sm:text-sm"
        >
          完了
        </button>
      </div>
    </form>
  );
};
