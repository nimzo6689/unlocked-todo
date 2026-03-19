import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TodoForm } from '../components/TodoForm';
import type { Todo } from '../common/types';
import { defaultForm } from '../common/utils';
import { useTodoContext } from '../contexts/TodoContext';

export const TodoFormPage = () => {
  const { todos, form, setForm, getTodo, fetchTodos } = useTodoContext();
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      setForm(getTodo(id) || defaultForm);
    } else {
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0);
      if (dueDate <= now) {
        dueDate.setDate(dueDate.getDate() + 1);
      }
      setForm({
        ...defaultForm,
        startableAt: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
      });
    }
  }, [id, getTodo, setForm]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    let newTodos = [...todos];

    const hasDependency = form.dependency
      ? Array.isArray(form.dependency)
        ? form.dependency.length > 0
        : true
      : false;

    if (form.id) {
      newTodos = newTodos.map(todo =>
        todo.id === form.id ? ({ ...todo, ...form } as Todo) : todo,
      );
    } else {
      const dependency = Array.isArray(form.dependency)
        ? form.dependency
        : form.dependency
        ? [form.dependency]
        : [];

      const newTodo: Todo = {
        id: crypto.randomUUID(),
        createdAt: now,
        startableAt: hasDependency ? (form.startableAt || '') : (form.startableAt || now),
        title: form.title || '',
        description: form.description || '',
        dueDate: form.dueDate || '',
        status: (form.status as Todo['status']) || 'Unlocked',
        effortMinutes: form.effortMinutes || 0,
        assignee: (form.assignee as Todo['assignee']) || '自分',
        dependency,
      };
      newTodos.push(newTodo);
    }

    const { todoDB } = await import('../common/db');
    await todoDB.save(newTodos);
    await fetchTodos();
    setForm(defaultForm);
    navigate('/');
  }

  function handleCancel() {
    setForm(defaultForm);
    navigate('/');
  }

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-xl max-w-md sm:max-w-2xl md:max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">{id ? 'Todoの編集' : 'Todoの新規作成'}</h1>
      <TodoForm
        form={form}
        todos={todos}
        onChange={setForm}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};
