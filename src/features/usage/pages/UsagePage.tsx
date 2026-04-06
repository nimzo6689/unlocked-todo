import { BellRing, CalendarClock, CheckSquare, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const UsagePage = () => {
  const { t } = useTranslation();

  const steps = [
    {
      title: t('usage.steps.createTask.title'),
      description: t('usage.steps.createTask.description'),
      icon: ListChecks,
    },
    {
      title: t('usage.steps.checkReadyList.title'),
      description: t('usage.steps.checkReadyList.description'),
      icon: CheckSquare,
    },
    {
      title: t('usage.steps.checkAvailability.title'),
      description: t('usage.steps.checkAvailability.description'),
      icon: CalendarClock,
    },
    {
      title: t('usage.steps.enableNotifications.title'),
      description: t('usage.steps.enableNotifications.description'),
      icon: BellRing,
    },
  ];

  const shortcutCategories = [
    {
      title: t('usage.shortcutCategories.global'),
      items: [
        { keys: '?', description: t('usage.shortcutItems.globalHelp') },
        { keys: 'g → i', description: t('usage.shortcutItems.goTodoList') },
        { keys: 'g → n', description: t('usage.shortcutItems.goNewTodo') },
        {
          keys: 'g → a / p / t / w / u / b',
          description: t('usage.shortcutItems.quickNavigate'),
        },
      ],
    },
    {
      title: t('usage.shortcutCategories.todoList'),
      items: [
        { keys: 'j / k', description: t('usage.shortcutItems.moveSelection') },
        { keys: 'h / l', description: t('usage.shortcutItems.expandCollapse') },
        { keys: 'Enter / o', description: t('usage.shortcutItems.editSelected') },
        { keys: 'n / x / c / d', description: t('usage.shortcutItems.todoActions') },
        { keys: '1 - 5', description: t('usage.shortcutItems.switchFilter') },
        { keys: 'e / i', description: t('usage.shortcutItems.exportImport') },
      ],
    },
    {
      title: t('usage.shortcutCategories.formsAndSettings'),
      items: [
        { keys: 'Ctrl/Cmd+Enter', description: t('usage.shortcutItems.saveForm') },
        { keys: 'Ctrl/Cmd+Shift+Enter', description: t('usage.shortcutItems.saveAndBack') },
        { keys: 'Esc', description: t('usage.shortcutItems.closeDialog') },
        { keys: 'Alt+1 - Alt+5', description: t('usage.shortcutItems.quickEffort') },
        {
          keys: 'h / l / t',
          description: t('usage.shortcutItems.dateMove'),
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Help</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('usage.title')}</h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">{t('usage.description')}</p>
      </header>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <section
              key={step.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Icon size={18} />
                    <h2 className="text-lg font-semibold">{step.title}</h2>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('usage.shortcutTitle')}</h2>
            <p className="text-sm text-slate-600">{t('usage.shortcutDescription')}</p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {t('usage.shortcutBadge')}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {shortcutCategories.map(category => (
            <section
              key={category.title}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <h3 className="text-sm font-semibold text-slate-900">{category.title}</h3>
              <div className="mt-3 space-y-3">
                {category.items.map(item => (
                  <div
                    key={`${category.title}-${item.keys}`}
                    className="rounded-xl bg-slate-50 px-3 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.keys}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
};
