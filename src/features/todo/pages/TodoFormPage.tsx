import { useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { TodoForm, type TodoFormFocusHandle } from '@/features/todo/ui/TodoForm';
import { DEFAULT_TASK_TYPE, isMeetingTodo } from '@/features/todo/model/todo-utils';
import { useTodoContext } from '@/app/providers/TodoContext';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { useTodoForm } from '../hooks/useTodoForm';

const QUICK_EFFORT_VALUES = [5, 10, 25, 55, 115];

export const TodoFormPage = () => {
  const { todos, form, setForm, getTodo, fetchTodos, workSchedule } = useTodoContext();
  const { id } = useParams();
  const formFocusRef = useRef<TodoFormFocusHandle>(null);
  const {
    saving,
    successorIds,
    setSuccessorIds,
    applyDueDateQuickAction,
    applyStartableAtQuickAction,
    handleSave,
    handleComplete,
    handleCancel,
    handleOpenTodo,
  } = useTodoForm({ todos, form, setForm, getTodo, fetchTodos, id, workSchedule });

  const shortcutRegistration = useMemo(() => {
    const isMeeting = isMeetingTodo({ taskType: form.taskType || DEFAULT_TASK_TYPE });
    const availableDependencyTodos = todos.filter(
      todo => todo.id !== form.id && todo.status !== 'Completed',
    );

    return {
      pageLabel: id ? 'Todo 編集' : 'Todo 新規作成',
      shortcuts: [
        {
          id: 'form-focus-title',
          description: 'タイトルへフォーカスする',
          category: 'フォーム操作' as const,
          bindings: ['alt+1'],
          action: () => formFocusRef.current?.focusTitle(),
          allowInInput: true,
        },
        {
          id: 'form-focus-task-type',
          description: 'タスク種別へフォーカスする',
          category: 'フォーム操作' as const,
          bindings: ['alt+2'],
          action: () => formFocusRef.current?.focusTaskType(),
          allowInInput: true,
        },
        {
          id: 'form-focus-description',
          description: '説明へフォーカスする',
          category: 'フォーム操作' as const,
          bindings: ['alt+3'],
          action: () => formFocusRef.current?.focusDescription(),
          allowInInput: true,
        },
        {
          id: 'form-focus-startable-at',
          description: '着手可能日時へフォーカスする',
          category: 'フォーム操作' as const,
          bindings: ['alt+4'],
          action: () => formFocusRef.current?.focusStartableAt(),
          allowInInput: true,
        },
        {
          id: 'form-focus-due-date',
          description: '期限へフォーカスする',
          category: 'フォーム操作' as const,
          bindings: ['alt+5'],
          action: () => formFocusRef.current?.focusDueDate(),
          allowInInput: true,
        },
        {
          id: 'form-focus-effort',
          description: '工数へフォーカスする',
          category: 'フォーム操作' as const,
          bindings: ['alt+6'],
          action: () => formFocusRef.current?.focusEffortMinutes(),
          allowInInput: true,
          enabled: !isMeeting,
        },
        {
          id: 'form-focus-actual-work',
          description: '実作業時間へフォーカスする',
          category: 'フォーム操作' as const,
          bindings: ['alt+7'],
          action: () => formFocusRef.current?.focusActualWorkMinutes(),
          allowInInput: true,
          enabled: !isMeeting,
        },
        {
          id: 'form-focus-status',
          description: 'ステータスへフォーカスする',
          category: 'フォーム操作' as const,
          bindings: ['alt+8'],
          action: () => formFocusRef.current?.focusStatus(),
          allowInInput: true,
          enabled: !isMeeting,
        },
        {
          id: 'form-focus-dependency',
          description: '依存タスクへフォーカスする',
          category: 'フォーム操作' as const,
          bindings: ['alt+9'],
          action: () => formFocusRef.current?.focusDependency(),
          allowInInput: true,
          enabled: !isMeeting && availableDependencyTodos.length > 0,
        },
        {
          id: 'form-save',
          description: 'フォームを保存する',
          category: 'フォーム操作' as const,
          bindings: ['mod+enter'],
          action: () => {
            void handleSave();
          },
          allowInInput: true,
        },
        {
          id: 'form-complete',
          description: '保存して一覧へ戻る',
          category: 'フォーム操作' as const,
          bindings: ['mod+shift+enter'],
          action: () => {
            void handleComplete();
          },
          allowInInput: true,
        },
        {
          id: 'form-cancel',
          description: '編集をキャンセルする',
          category: 'フォーム操作' as const,
          bindings: ['escape'],
          action: handleCancel,
          allowInInput: true,
        },
        ...QUICK_EFFORT_VALUES.map((value, index) => ({
          id: `form-effort-${value}`,
          description: `工数を ${value} 分に設定する`,
          category: 'ページ操作' as const,
          bindings: [`alt+shift+${index + 1}`],
          action: () => setForm({ ...form, effortMinutes: value }),
          enabled: !isMeeting,
          allowInInput: true,
        })),
      ],
    };
  }, [form, handleCancel, handleComplete, handleSave, id, setForm, todos]);

  useRegisterShortcuts(shortcutRegistration);

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-xl max-w-md sm:max-w-2xl md:max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">{id ? 'Todoの編集' : 'Todoの新規作成'}</h1>
      <TodoForm
        ref={formFocusRef}
        form={form}
        todos={todos}
        onChange={setForm}
        successorIds={successorIds}
        onSuccessorChange={setSuccessorIds}
        onApplyDueDateQuickAction={applyDueDateQuickAction}
        onApplyStartableAtQuickAction={applyStartableAtQuickAction}
        onSave={handleSave}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onOpenTodo={handleOpenTodo}
        saving={saving}
      />
    </div>
  );
};
