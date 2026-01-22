import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TodoForm } from './TodoForm';
import type { Todo } from '../common/db';
import { defaultForm } from '../common/utils';

export const FormRoute = ({
  todos,
  form,
  onChange,
  getTodo,
  onSaveSuccess,
}: {
  todos: Todo[];
  form: Partial<Todo>;
  onChange: (form: Partial<Todo>) => void;
  getTodo: (id: string) => Todo | undefined;
  onSaveSuccess: () => Promise<void>;
}) => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      onChange(getTodo(id) || defaultForm);
    } else {
      onChange(defaultForm);
    }
  }, [id, getTodo, onChange]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    let newTodos = [...todos];

    if (form.id) {
      newTodos = newTodos.map(todo =>
        todo.id === form.id ? ({ ...todo, ...form } as Todo) : todo,
      );
    } else {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        createdAt: now,
        startableAt: form.startableAt || now,
        title: form.title || '',
        description: form.description || '',
        dueDate: form.dueDate || '',
        status: (form.status as Todo['status']) || 'Unlocked',
        effort: form.effort || 0,
        assignee: (form.assignee as Todo['assignee']) || '自分',
        dependency: form.dependency || '',
      };
      newTodos.push(newTodo);
    }

    const { todoDB } = await import('../common/db');
    await todoDB.save(newTodos);
    await onSaveSuccess();
    onChange(defaultForm);
    navigate('/');
  }

  function handleCancel() {
    onChange(defaultForm);
    navigate('/');
  }

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-xl max-w-md sm:max-w-2xl md:max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">{id ? 'Todoの編集' : 'Todoの新規作成'}</h1>
      <TodoForm
        form={form}
        todos={todos}
        onChange={onChange}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};
