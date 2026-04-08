import { useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TodoForm, type TodoFormFocusHandle } from '@/features/todo/ui/TodoForm';
import { DEFAULT_TASK_TYPE, isMeetingTodo } from '@/features/todo/model/todo-utils';
import { useTodoContext } from '@/app/providers/TodoContext';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { useTodoForm } from '../hooks/useTodoForm';

const QUICK_EFFORT_VALUES = [5, 10, 25, 55, 115];

export const TodoFormPage = () => {
  const { t } = useTranslation();
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
    handleSaveAndClose,
    handleMarkCompletedAndClose,
    handleMarkIncompleteAndClose,
    handleCancel,
    handleOpenTodo,
  } = useTodoForm({ todos, form, setForm, getTodo, fetchTodos, id, workSchedule });

  const shortcutRegistration = useMemo(() => {
    const isMeeting = isMeetingTodo({ taskType: form.taskType || DEFAULT_TASK_TYPE });
    const availableDependencyTodos = todos.filter(
      todo => todo.id !== form.id && todo.status !== 'Completed',
    );

    return {
      pageLabel: id ? t('todo.formPage.editPageLabel') : t('todo.formPage.newPageLabel'),
      shortcuts: [
        {
          id: 'form-focus-title',
          description: t('todo.form.shortcuts.focusTitle'),
          category: 'フォーム操作' as const,
          bindings: ['alt+1'],
          action: () => formFocusRef.current?.focusTitle(),
          allowInInput: true,
        },
        {
          id: 'form-focus-task-type',
          description: t('todo.form.shortcuts.focusTaskType'),
          category: 'フォーム操作' as const,
          bindings: ['alt+2'],
          action: () => formFocusRef.current?.focusTaskType(),
          allowInInput: true,
        },
        {
          id: 'form-focus-description',
          description: t('todo.form.shortcuts.focusDescription'),
          category: 'フォーム操作' as const,
          bindings: ['alt+3'],
          action: () => formFocusRef.current?.focusDescription(),
          allowInInput: true,
        },
        {
          id: 'form-focus-startable-at',
          description: t('todo.form.shortcuts.focusStartableAt'),
          category: 'フォーム操作' as const,
          bindings: ['alt+4'],
          action: () => formFocusRef.current?.focusStartableAt(),
          allowInInput: true,
        },
        {
          id: 'form-focus-due-date',
          description: t('todo.form.shortcuts.focusDueDate'),
          category: 'フォーム操作' as const,
          bindings: ['alt+5'],
          action: () => formFocusRef.current?.focusDueDate(),
          allowInInput: true,
        },
        {
          id: 'form-focus-effort',
          description: t('todo.form.shortcuts.focusEffort'),
          category: 'フォーム操作' as const,
          bindings: ['alt+6'],
          action: () => formFocusRef.current?.focusEffortMinutes(),
          allowInInput: true,
          enabled: !isMeeting,
        },
        {
          id: 'form-focus-actual-work',
          description: t('todo.form.shortcuts.focusActualWork'),
          category: 'フォーム操作' as const,
          bindings: ['alt+7'],
          action: () => formFocusRef.current?.focusActualWorkMinutes(),
          allowInInput: true,
          enabled: !isMeeting,
        },
        {
          id: 'form-focus-dependency',
          description: t('todo.form.shortcuts.focusDependency'),
          category: 'フォーム操作' as const,
          bindings: ['alt+9'],
          action: () => formFocusRef.current?.focusDependency(),
          allowInInput: true,
          enabled: !isMeeting && availableDependencyTodos.length > 0,
        },
        {
          id: 'form-save',
          description: t('todo.form.shortcuts.save'),
          category: 'フォーム操作' as const,
          bindings: ['mod+enter'],
          action: () => {
            void handleSave();
          },
          allowInInput: true,
        },
        {
          id: 'form-complete',
          description: t('todo.form.shortcuts.complete'),
          category: 'フォーム操作' as const,
          bindings: ['mod+shift+enter'],
          action: () => {
            void handleSaveAndClose();
          },
          allowInInput: true,
        },
        {
          id: 'form-cancel',
          description: t('todo.form.shortcuts.cancel'),
          category: 'フォーム操作' as const,
          bindings: ['escape'],
          action: handleCancel,
          allowInInput: true,
        },
        ...QUICK_EFFORT_VALUES.map((value, index) => ({
          id: `form-effort-${value}`,
          description: t('todo.form.shortcuts.setEffort', { value }),
          category: 'ページ操作' as const,
          bindings: [`alt+shift+${index + 1}`],
          action: () => setForm({ ...form, effortMinutes: value }),
          enabled: !isMeeting,
          allowInInput: true,
        })),
      ],
    };
  }, [form, handleCancel, handleSave, handleSaveAndClose, id, setForm, t, todos]);

  useRegisterShortcuts(shortcutRegistration);

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-xl max-w-md sm:max-w-2xl md:max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">
        {id ? t('todo.formPage.editTitle') : t('todo.formPage.newTitle')}
      </h1>
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
        onSaveAndClose={handleSaveAndClose}
        onMarkCompletedAndClose={handleMarkCompletedAndClose}
        onMarkIncompleteAndClose={handleMarkIncompleteAndClose}
        onCancel={handleCancel}
        onOpenTodo={handleOpenTodo}
        saving={saving}
      />
    </div>
  );
};
