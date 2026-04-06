import { Bell, BellRing, Settings2 } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTodoContext } from '@/app/providers/TodoContext';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';
import { useAppLocale } from '@/shared/i18n/useAppLocale';

export const NotificationsSettingsPage = () => {
  const { notificationEnabled, requestNotificationPermission } = useTodoContext();
  const browserSupportsNotifications = typeof Notification !== 'undefined';
  const { t } = useTranslation();
  const { locale, locales, setLocale } = useAppLocale();

  const shortcutRegistration = useMemo(
    () => ({
      pageLabel: t('notifications.pageLabel'),
      shortcuts: [
        {
          id: 'notifications-enable',
          description: t('notifications.enableShortcut'),
          category: 'ページ操作' as const,
          bindings: ['e'],
          action: requestNotificationPermission,
          enabled: browserSupportsNotifications && !notificationEnabled,
        },
      ],
    }),
    [browserSupportsNotifications, notificationEnabled, requestNotificationPermission, t],
  );

  useRegisterShortcuts(shortcutRegistration);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Settings</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('notifications.title')}
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
          {t('notifications.description')}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {notificationEnabled ? <BellRing size={16} /> : <Bell size={16} />}
              {notificationEnabled ? t('notifications.enabled') : t('notifications.disabled')}
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <p>{t('notifications.targetDescription')}</p>
              <p>{t('notifications.permissionDescription')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestNotificationPermission}
            disabled={!browserSupportsNotifications || notificationEnabled}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              browserSupportsNotifications && !notificationEnabled
                ? 'bg-sky-500 text-white hover:bg-sky-600'
                : 'cursor-not-allowed bg-slate-200 text-slate-500'
            }`}
          >
            <Settings2 size={16} />
            {notificationEnabled ? t('notifications.configured') : t('notifications.enable')}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t('notifications.languageSectionTitle')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {t('common.locale.description')}
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {locales.map(option => {
              const selected = option.value === locale;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    void setLocale(option.value);
                  }}
                  aria-pressed={selected}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    selected
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <p className="text-sm text-slate-500">
            {t('notifications.languageCurrent', {
              language: locales.find(option => option.value === locale)?.label ?? locale,
            })}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {t('notifications.prerequisites')}
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>{t('notifications.prerequisitesItems.browser')}</li>
          <li>{t('notifications.prerequisitesItems.interval')}</li>
          <li>{t('notifications.prerequisitesItems.dedupe')}</li>
        </ul>
      </section>
    </div>
  );
};
