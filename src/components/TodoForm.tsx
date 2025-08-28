import React, { useEffect, useState } from 'react';
import type { Todo } from '../db';
import { formatDateForInput } from '../utils';
import { marked } from 'marked';

export type TodoFormProps = {
  form: Partial<Todo>;
  todos: Todo[];
  onChange: (form: Partial<Todo>) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export const TodoForm: React.FC<TodoFormProps> = ({ form, todos, onChange, onSave, onCancel }) => {
  const [previewHtml, setPreviewHtml] = useState('');
  useEffect(() => {
    const result = marked.parse(form.description || '');
    if (typeof result === 'string') {
      setPreviewHtml(result);
    } else if (result instanceof Promise) {
      result.then(html => setPreviewHtml(html));
    }
  }, [form.description]);

  return (
    <form onSubmit={onSave}>
      <input type="hidden" value={form.id || ''} />
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">タイトル <span className="text-red-500">*</span></label>
        <input type="text" id="title" required value={form.title || ''} onChange={e => onChange({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
      </div>
      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">説明 (Markdown対応)</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <textarea id="description" rows={8} value={form.description || ''} onChange={e => onChange({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
          <div id="markdown-preview-container" className="prose prose-sm p-3 border border-slate-200 rounded-md bg-slate-50 h-full min-h-[100px]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="startableAt" className="block text-sm font-medium text-slate-700 mb-1">着手可能日時</label>
          <input type="datetime-local" id="startableAt" value={formatDateForInput(form.startableAt)} onChange={e => onChange({ ...form, startableAt: new Date(e.target.value).toISOString() })} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 mb-1">期限日時 <span className="text-red-500">*</span></label>
          <input type="datetime-local" id="dueDate" required value={formatDateForInput(form.dueDate)} onChange={e => onChange({ ...form, dueDate: new Date(e.target.value).toISOString() })} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="effort" className="block text-sm font-medium text-slate-700 mb-1">工数 (時間)</label>
          <input type="number" id="effort" min={0} value={form.effort || 0} onChange={e => onChange({ ...form, effort: parseInt(e.target.value, 10) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
          <select id="status" value={form.status || 'Active'} onChange={e => onChange({ ...form, status: e.target.value as Todo['status'] })} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white">
            <option value="Active">Active</option>
            <option value="Waiting">Waiting</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div>
          <label htmlFor="assignee" className="block text-sm font-medium text-slate-700 mb-1">担当</label>
          <select id="assignee" value={form.assignee || '自分'} onChange={e => onChange({ ...form, assignee: e.target.value as Todo['assignee'] })} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white">
            <option value="自分">自分</option>
            <option value="他人">他人</option>
          </select>
        </div>
      </div>
      <div className="mb-6">
        <label htmlFor="dependency" className="block text-sm font-medium text-slate-700 mb-1">依存Todo</label>
        <select id="dependency" value={form.dependency || ''} onChange={e => onChange({ ...form, dependency: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white">
          <option value="">なし</option>
          {todos.filter(t => t.id !== form.id).map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end space-x-3">
        <button type="button" onClick={onCancel} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg">キャンセル</button>
        <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md">保存</button>
      </div>
    </form>
  );
};
