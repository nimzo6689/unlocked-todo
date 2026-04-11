import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { todoDB } from '@/features/todo/model/db';
import type {
  RecurringTaskDefinition,
  RecurringTaskUnit,
  Todo,
  TodoTaskType,
} from '@/features/todo/model/types';
import {
  DEFAULT_EFFORT_MINUTES,
  formatDateForInput,
  getTodoTaskTypeLabel,
} from '@/features/todo/model/todo-utils';
import { useAppLocale } from '@/shared/i18n/useAppLocale';

type RecurringTaskDraft = {
  title: string;
  taskType: TodoTaskType;
  description: string;
  effortMinutes: number;
  startAt: string;
  endAt: string;
  interval: number;
  unit: RecurringTaskUnit;
  firstDueAt: string;
};

type RecurringSortKey = 'updatedAt' | 'createdAt';

type EditPrefillState = {
  sourceTodoId?: string;
  title?: string;
  taskType?: TodoTaskType;
  description?: string;
  effortMinutes?: number;
  startableAt?: string;
  dueDate?: string;
};

const createEmptyDraft = (): RecurringTaskDraft => ({
  title: '',
  taskType: 'Normal',
  description: '',
  effortMinutes: DEFAULT_EFFORT_MINUTES,
  startAt: '',
  endAt: '',
  interval: 1,
  unit: 'day',
  firstDueAt: '',
});

const toIsoFromInput = (value: string) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString();
};

const toInputDateTime = (value?: string) => {
  return formatDateForInput(value);
};

export const RecurringTaskPage = () => {
  const { t } = useTranslation();
  const { locale } = useAppLocale();
  const location = useLocation();
  const [draft, setDraft] = useState<RecurringTaskDraft>(createEmptyDraft);
  const [definitions, setDefinitions] = useState<RecurringTaskDefinition[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<RecurringSortKey>('updatedAt');
  const prefillAppliedRef = useRef(false);

  const prefill = (location.state || null) as EditPrefillState | null;

  const isMeeting = draft.taskType === 'Meeting';

  const toDraftFromDefinition = (definition: RecurringTaskDefinition): RecurringTaskDraft => ({
    title: definition.title,
    taskType: definition.taskType,
    description: definition.description,
    effortMinutes: definition.taskType === 'Meeting' ? 0 : definition.effortMinutes,
    startAt: toInputDateTime(definition.startAt),
    endAt: toInputDateTime(definition.endAt),
    interval: definition.interval,
    unit: definition.unit,
    firstDueAt: toInputDateTime(definition.firstDueAt),
  });

  const loadDefinitions = async () => {
    const rows = await todoDB.fetchRecurringTaskDefinitions();
    setDefinitions(rows);
  };

  useEffect(() => {
    void loadDefinitions();
  }, []);

  useEffect(() => {
    if (!prefill || prefillAppliedRef.current) {
      return;
    }

    prefillAppliedRef.current = true;

    setDraft(current => ({
      ...current,
      title: prefill.title || current.title,
      taskType: prefill.taskType || current.taskType,
      description: prefill.description || current.description,
      effortMinutes:
        typeof prefill.effortMinutes === 'number' && prefill.effortMinutes > 0
          ? Math.floor(prefill.effortMinutes)
          : current.effortMinutes,
      startAt: toInputDateTime(prefill.startableAt),
      firstDueAt: toInputDateTime(prefill.dueDate),
    }));
  }, [prefill]);

  const sourceTodoLabel = useMemo(() => {
    if (!prefill?.sourceTodoId) {
      return '';
    }

    return t('todo.recurring.prefilledFromEdit', { id: prefill.sourceTodoId });
  }, [prefill?.sourceTodoId, t]);

  const sortedDefinitions = useMemo(() => {
    return [...definitions].sort((a, b) => b[sortKey].localeCompare(a[sortKey]));
  }, [definitions, sortKey]);

  const handleSave = async () => {
    const startAtIso = toIsoFromInput(draft.startAt);
    const firstDueAtIso = toIsoFromInput(draft.firstDueAt);
    const endAtIso = toIsoFromInput(draft.endAt);

    if (!draft.title.trim()) {
      toast.error(t('todo.recurring.validation.titleRequired'));
      return;
    }

    if (!startAtIso) {
      toast.error(t('todo.recurring.validation.startRequired'));
      return;
    }

    if (!firstDueAtIso) {
      toast.error(t('todo.recurring.validation.firstDueRequired'));
      return;
    }

    if (new Date(firstDueAtIso).getTime() < new Date(startAtIso).getTime()) {
      toast.error(t('todo.recurring.validation.firstDueAfterStart'));
      return;
    }

    if (endAtIso && new Date(endAtIso).getTime() < new Date(startAtIso).getTime()) {
      toast.error(t('todo.recurring.validation.endAfterStart'));
      return;
    }

    if (!Number.isInteger(draft.interval) || draft.interval < 1) {
      toast.error(t('todo.recurring.validation.intervalPositive'));
      return;
    }

    const now = new Date().toISOString();
    const editingTarget = editingId
      ? definitions.find(definition => definition.id === editingId)
      : null;
    const nextDefinition: RecurringTaskDefinition = {
      id: editingTarget?.id || crypto.randomUUID(),
      title: draft.title.trim(),
      taskType: draft.taskType,
      description: draft.description,
      effortMinutes:
        draft.taskType === 'Meeting' ? 0 : Math.max(1, Math.floor(draft.effortMinutes)),
      startAt: startAtIso,
      endAt: endAtIso || undefined,
      firstDueAt: firstDueAtIso,
      interval: draft.interval,
      unit: draft.unit,
      createdAt: editingTarget?.createdAt || now,
      updatedAt: now,
    };

    try {
      await todoDB.putRecurringTaskDefinition(nextDefinition);
      toast.success(
        editingTarget ? t('todo.recurring.toast.updated') : t('todo.recurring.toast.saved'),
      );
      setDraft(createEmptyDraft());
      setEditingId(null);
      await loadDefinitions();
    } catch {
      toast.error(t('todo.toast.persistenceFailed'));
    }
  };

  const handleStartEdit = (definition: RecurringTaskDefinition) => {
    setEditingId(definition.id);
    setDraft(toDraftFromDefinition(definition));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDraft(createEmptyDraft());
  };

  const handleDelete = async (definition: RecurringTaskDefinition) => {
    const confirmed = window.confirm(
      t('todo.recurring.confirmDelete', {
        title: definition.title,
      }),
    );

    if (!confirmed) {
      return;
    }

    try {
      await todoDB.deleteRecurringTaskDefinition(definition.id);
      if (editingId === definition.id) {
        handleCancelEdit();
      }
      toast.success(t('todo.recurring.toast.deleted'));
      await loadDefinitions();
    } catch {
      toast.error(t('todo.toast.persistenceFailed'));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Settings</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('todo.recurring.title')}
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          {t('todo.recurring.description')}
        </p>
        {editingId && (
          <p className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            {t('todo.recurring.editingBadge')}
          </p>
        )}
        {sourceTodoLabel && (
          <p className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {sourceTodoLabel}
          </p>
        )}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700 sm:col-span-2">
            <span className="font-medium">{t('todo.form.title')}</span>
            <input
              type="text"
              value={draft.title}
              onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">{t('todo.form.taskType')}</span>
            <select
              value={draft.taskType}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  taskType: event.target.value as Todo['taskType'],
                  effortMinutes: event.target.value === 'Meeting' ? 0 : current.effortMinutes,
                }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="Normal">{getTodoTaskTypeLabel('Normal', locale)}</option>
              <option value="Meeting">{getTodoTaskTypeLabel('Meeting', locale)}</option>
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">{t('todo.form.effortMinutes')}</span>
            <input
              type="number"
              min={1}
              disabled={isMeeting}
              value={isMeeting ? 0 : draft.effortMinutes}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  effortMinutes: Math.max(
                    1,
                    Math.floor(Number(event.target.value) || DEFAULT_EFFORT_MINUTES),
                  ),
                }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700 sm:col-span-2">
            <span className="font-medium">{t('todo.form.description')}</span>
            <textarea
              rows={6}
              value={draft.description}
              onChange={event =>
                setDraft(current => ({ ...current, description: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">{t('todo.recurring.startAt')}</span>
            <input
              type="datetime-local"
              value={draft.startAt}
              onChange={event => setDraft(current => ({ ...current, startAt: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">{t('todo.recurring.firstDueAt')}</span>
            <input
              type="datetime-local"
              value={draft.firstDueAt}
              onChange={event =>
                setDraft(current => ({ ...current, firstDueAt: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">{t('todo.recurring.endAt')}</span>
            <input
              type="datetime-local"
              value={draft.endAt}
              onChange={event => setDraft(current => ({ ...current, endAt: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">{t('todo.recurring.interval')}</span>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="number"
                min={1}
                value={draft.interval}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    interval: Math.max(1, Math.floor(Number(event.target.value) || 1)),
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
              <select
                value={draft.unit}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    unit: event.target.value as RecurringTaskUnit,
                  }))
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="day">{t('todo.recurring.units.day')}</option>
                <option value="week">{t('todo.recurring.units.week')}</option>
                <option value="month">{t('todo.recurring.units.month')}</option>
              </select>
            </div>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              {t('todo.recurring.cancelEdit')}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            {editingId ? t('todo.recurring.update') : t('todo.recurring.save')}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t('todo.recurring.registered')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t('todo.recurring.registeredDescription')}
            </p>
          </div>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">{t('todo.recurring.sort.label')}</span>
            <select
              value={sortKey}
              onChange={event => setSortKey(event.target.value as RecurringSortKey)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="updatedAt">{t('todo.recurring.sort.updatedAt')}</option>
              <option value="createdAt">{t('todo.recurring.sort.createdAt')}</option>
            </select>
          </label>
        </div>
        <ul className="mt-4 space-y-2">
          {definitions.length === 0 && (
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {t('todo.recurring.empty')}
            </li>
          )}
          {sortedDefinitions.map(definition => (
            <li
              key={definition.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <p className="text-sm font-semibold text-slate-800">{definition.title}</p>
              <p className="mt-1 text-xs text-slate-600">
                {t('todo.recurring.ruleSummary', {
                  interval: definition.interval,
                  unit: t(`todo.recurring.units.${definition.unit}`),
                })}
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEdit(definition)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t('todo.recurring.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(definition)}
                  className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                >
                  {t('todo.recurring.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
