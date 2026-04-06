import React from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Todo } from '@/features/todo/model/types';
import {
  DEFAULT_EFFORT_MINUTES,
  formatDateForInput,
  formatDurationFromSeconds,
  getTodoTaskTypeLabel,
  getTodoTitleFallback,
  getTodoStatusLabel,
  isMeetingTodo,
} from '@/features/todo/model/todo-utils';
import { useAppLocale } from '@/shared/i18n/useAppLocale';

export type TodoFormProps = {
  form: Partial<Todo>;
  todos: Todo[];
  onChange: (form: Partial<Todo>) => void;
  successorIds: string[];
  onSuccessorChange: (successorIds: string[]) => void;
  onApplyDueDateQuickAction: (quickAction: 'today' | 'tomorrow' | 'thisWeek') => void;
  onApplyStartableAtQuickAction: (quickAction: 'now' | 'tomorrow' | 'nextWeek') => void;
  onSave: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onOpenTodo: (id: string) => void;
  saving?: boolean;
};

export type TodoFormFocusHandle = {
  focusTitle: () => void;
  focusTaskType: () => void;
  focusDescription: () => void;
  focusStartableAt: () => void;
  focusDueDate: () => void;
  focusEffortMinutes: () => void;
  focusActualWorkMinutes: () => void;
  focusStatus: () => void;
  focusDependency: () => void;
};

export const TodoForm = React.forwardRef<TodoFormFocusHandle, TodoFormProps>(
  (
    {
      form,
      todos,
      onChange,
      successorIds,
      onSuccessorChange,
      onApplyDueDateQuickAction,
      onApplyStartableAtQuickAction,
      onSave,
      onComplete,
      onCancel,
      onOpenTodo,
      saving = false,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const { locale } = useAppLocale();
    const taskType = form.taskType || 'Normal';
    const isMeeting = isMeetingTodo({ taskType });
    const hasDependency = form.dependency
      ? Array.isArray(form.dependency)
        ? form.dependency.length > 0
        : true
      : false;
    const availableDependencyTodos = todos.filter(
      t => t.id !== form.id && t.status !== 'Completed',
    );
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
    const titleRef = React.useRef<HTMLInputElement>(null);
    const taskTypeRef = React.useRef<HTMLSelectElement>(null);
    const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
    const startableAtRef = React.useRef<HTMLInputElement>(null);
    const dueDateRef = React.useRef<HTMLInputElement>(null);
    const effortMinutesRef = React.useRef<HTMLInputElement>(null);
    const actualWorkMinutesRef = React.useRef<HTMLInputElement>(null);
    const statusRef = React.useRef<HTMLSelectElement>(null);
    const dependencyFirstCheckboxRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      setIsPredecessorExpanded(currentDeps.length > 0);
      setIsSuccessorExpanded(successorIds.length > 0);
    }, [form.id, currentDeps.length, successorIds.length]);

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

    React.useImperativeHandle(
      ref,
      () => ({
        focusTitle: () => titleRef.current?.focus(),
        focusTaskType: () => taskTypeRef.current?.focus(),
        focusDescription: () => descriptionRef.current?.focus(),
        focusStartableAt: () => {
          if (!hasDependency) {
            startableAtRef.current?.focus();
          }
        },
        focusDueDate: () => dueDateRef.current?.focus(),
        focusEffortMinutes: () => {
          if (!isMeeting) {
            effortMinutesRef.current?.focus();
          }
        },
        focusActualWorkMinutes: () => {
          if (!isMeeting) {
            actualWorkMinutesRef.current?.focus();
          }
        },
        focusStatus: () => {
          if (!isMeeting) {
            statusRef.current?.focus();
          }
        },
        focusDependency: () => {
          if (isMeeting || availableDependencyTodos.length === 0) {
            return;
          }
          setIsPredecessorExpanded(true);
          setTimeout(() => {
            dependencyFirstCheckboxRef.current?.focus();
          }, 0);
        },
      }),
      [availableDependencyTodos.length, hasDependency, isMeeting],
    );

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
        onSubmit={event => {
          event.preventDefault();
          onSave();
        }}
        className="p-2 sm:p-4"
      >
        <input type="hidden" value={form.id || ''} />
        <div className="mb-4">
          <label
            htmlFor="title"
            className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
          >
            {t('todo.form.title')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            ref={titleRef}
            required
            value={form.title || ''}
            onChange={e => onChange({ ...form, title: e.target.value })}
            className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="taskType"
            className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
          >
            {t('todo.form.taskType')}
          </label>
          <select
            id="taskType"
            ref={taskTypeRef}
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
            <option value="Normal">{getTodoTaskTypeLabel('Normal', locale)}</option>
            <option value="Meeting">{getTodoTaskTypeLabel('Meeting', locale)}</option>
          </select>
        </div>
        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
          >
            {t('todo.form.description')}
          </label>
          <textarea
            id="description"
            ref={descriptionRef}
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
              {isMeeting ? t('todo.form.meetingStart') : t('todo.form.startableAt')}
            </label>
            <input
              type="datetime-local"
              id="startableAt"
              ref={startableAtRef}
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
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={hasDependency}
                onClick={() => onApplyStartableAtQuickAction('now')}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {t('todo.form.quickActions.now')}
              </button>
              <button
                type="button"
                disabled={hasDependency}
                onClick={() => onApplyStartableAtQuickAction('tomorrow')}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {t('todo.form.quickActions.tomorrow')}
              </button>
              <button
                type="button"
                disabled={hasDependency}
                onClick={() => onApplyStartableAtQuickAction('nextWeek')}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {t('todo.form.quickActions.nextWeek')}
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor="dueDate"
              className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
            >
              {isMeeting ? t('todo.form.meetingEnd') : t('todo.form.dueDate')}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="dueDate"
              ref={dueDateRef}
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
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onApplyDueDateQuickAction('today')}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-700 hover:bg-slate-100"
              >
                {t('todo.form.quickActions.today')}
              </button>
              <button
                type="button"
                onClick={() => onApplyDueDateQuickAction('tomorrow')}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-700 hover:bg-slate-100"
              >
                {t('todo.form.quickActions.tomorrowDue')}
              </button>
              <button
                type="button"
                onClick={() => onApplyDueDateQuickAction('thisWeek')}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-700 hover:bg-slate-100"
              >
                {t('todo.form.quickActions.thisWeek')}
              </button>
            </div>
          </div>
          {!isMeeting && (
            <>
              <div>
                <label
                  htmlFor="effortMinutes"
                  className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
                >
                  {t('todo.form.effortMinutes')}
                </label>
                <input
                  type="number"
                  id="effortMinutes"
                  ref={effortMinutesRef}
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
              <div>
                <label
                  htmlFor="actualWorkMinutes"
                  className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
                >
                  {t('todo.form.actualWorkMinutes')}
                </label>
                <input
                  type="number"
                  id="actualWorkMinutes"
                  ref={actualWorkMinutesRef}
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
                <p className="mt-2 text-[11px] sm:text-xs text-slate-500">
                  {t('todo.form.actualWorkDisplay', {
                    duration: formatDurationFromSeconds(normalizedActualWorkSeconds),
                  })}
                </p>
              </div>
            </>
          )}
        </div>
        {!isMeeting && (
          <div className="mb-6">
            <div>
              <label
                htmlFor="status"
                className="block text-xs sm:text-sm font-medium text-slate-700 mb-1"
              >
                {t('todo.form.status')}
              </label>
              <select
                id="status"
                ref={statusRef}
                value={form.status || 'Unlocked'}
                onChange={e => onChange({ ...form, status: e.target.value as Todo['status'] })}
                className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-xs sm:text-sm"
              >
                <option value="Unlocked">{getTodoStatusLabel('Unlocked', locale)}</option>
                <option value="Locked">{getTodoStatusLabel('Locked', locale)}</option>
                <option value="Completed">{getTodoStatusLabel('Completed', locale)}</option>
              </select>
            </div>
          </div>
        )}
        {!isMeeting && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setIsPredecessorExpanded(prev => !prev)}
              className="mb-1 flex w-full items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-left text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100"
              aria-expanded={isPredecessorExpanded}
              aria-controls="predecessor"
            >
              <span>{t('todo.form.predecessor')}</span>
              {isPredecessorExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isPredecessorExpanded && (
              <div
                id="predecessor"
                className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-slate-300 bg-white p-2 shadow-sm"
              >
                {availableDependencyTodos.length > 0 ? (
                  availableDependencyTodos.map((todo, index) => {
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
                        <label
                          htmlFor={checkboxId}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                        >
                          <input
                            id={checkboxId}
                            ref={index === 0 ? dependencyFirstCheckboxRef : undefined}
                            type="checkbox"
                            checked={isSelected}
                            disabled={isBlockedBySuccessor}
                            onChange={() => toggleDependency(todo.id)}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate text-xs sm:text-sm text-slate-700">
                            {todo.title || getTodoTitleFallback(locale)}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenTodo(todo.id);
                          }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-600 hover:bg-slate-100"
                          aria-label={t('todo.form.openTodoAria', {
                            title: todo.title || getTodoTitleFallback(locale),
                          })}
                        >
                          <span>{t('todo.form.openTodo')}</span>
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="px-1 py-2 text-xs sm:text-sm text-slate-500">
                    {t('todo.form.noSelectableTodos')}
                  </p>
                )}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">{t('todo.form.predecessorHint')}</p>
          </div>
        )}
        {!isMeeting && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setIsSuccessorExpanded(prev => !prev)}
              className="mb-1 flex w-full items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-left text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100"
              aria-expanded={isSuccessorExpanded}
              aria-controls="successor"
            >
              <span>{t('todo.form.successor')}</span>
              {isSuccessorExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {!form.id ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-600">
                {t('todo.form.successorAfterSave')}
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
                          <span className="truncate text-xs sm:text-sm text-slate-700">
                            {todo.title || getTodoTitleFallback(locale)}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenTodo(todo.id);
                          }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs sm:text-sm text-slate-600 hover:bg-slate-100"
                          aria-label={t('todo.form.openTodoAria', {
                            title: todo.title || getTodoTitleFallback(locale),
                          })}
                        >
                          <span>{t('todo.form.openTodo')}</span>
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="px-1 py-2 text-xs sm:text-sm text-slate-500">
                    {t('todo.form.noSelectableTodos')}
                  </p>
                )}
              </div>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">{t('todo.form.successorHint')}</p>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm"
          >
            {t('todo.form.cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-2 px-3 sm:px-4 rounded-lg shadow-md text-xs sm:text-sm"
          >
            {t('todo.form.save')}
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-3 sm:px-4 rounded-lg shadow-md text-xs sm:text-sm"
          >
            {t('todo.form.complete')}
          </button>
        </div>
      </form>
    );
  },
);

TodoForm.displayName = 'TodoForm';
