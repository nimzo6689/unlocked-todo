import React from 'react';
import type { Todo } from '../common/types';
import { formatDateForInput } from '../common/utils';

export type TodoFormProps = {
  form: Partial<Todo>;
  todos: Todo[];
  onChange: (form: Partial<Todo>) => void;
  onSave: (e: React.FormEvent) => void;
  onComplete: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving?: boolean;
};

export const TodoForm: React.FC<TodoFormProps> = ({ form, todos, onChange, onSave, onComplete, onCancel, saving = false }) => {
  const hasDependency = form.dependency
    ? Array.isArray(form.dependency)
      ? form.dependency.length > 0
      : true
    : false;
  return (
    <form onSubmit={onSave} className="p-2 sm:p-4">
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
            着手可能日時
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
            期限 <span className="text-red-500">*</span>
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
            value={form.effortMinutes || 1}
            onChange={e => onChange({ ...form, effortMinutes: parseInt(e.target.value, 10) || 1 })}
            className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
          />
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
        </div>
      </div>
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
      <div className="mb-6">
        <label
          htmlFor="dependency"
          className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
        >
          依存Todo
        </label>
        <select
          id="dependency"
          multiple
          size={Math.min(6, todos.length)}
          className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-xs sm:text-sm"
        >
          {todos
            .filter(t => t.id !== form.id && t.status !== 'Completed')
            .map(t => (
              <option
                key={t.id}
                value={t.id}
                selected={
                  Array.isArray(form.dependency)
                    ? form.dependency.includes(t.id)
                    : form.dependency === t.id
                }
                onClick={e => {
                  e.preventDefault();
                  const currentDeps = Array.isArray(form.dependency)
                    ? form.dependency
                    : form.dependency
                    ? [form.dependency]
                    : [];
                  const isSelected = currentDeps.includes(t.id);
                  const newDeps = isSelected
                    ? currentDeps.filter(id => id !== t.id)
                    : [...currentDeps, t.id];
                  onChange({
                    ...form,
                    dependency: newDeps,
                    ...(newDeps.length > 0 ? { startableAt: '' } : {}),
                  });
                }}
              >
                {t.title}
              </option>
            ))}
        </select>
        <p className="text-xs text-slate-500 mt-1">
          複数選択するには Ctrl または Command キーを押しながら選択してください。
        </p>
      </div>
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
