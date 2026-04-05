import { Bell, BellRing, Settings2 } from 'lucide-react';
import { useMemo } from 'react';
import { useTodoContext } from '@/app/providers/TodoContext';
import { useRegisterShortcuts } from '@/features/shortcuts/context/ShortcutContext';

export const NotificationsSettingsPage = () => {
  const { notificationEnabled, requestNotificationPermission } = useTodoContext();
  const browserSupportsNotifications = typeof Notification !== 'undefined';

  const shortcutRegistration = useMemo(() => ({
    pageLabel: '通知設定',
    shortcuts: [
      {
        id: 'notifications-enable',
        description: '通知を有効にする',
        category: 'ページ操作' as const,
        bindings: ['e'],
        action: requestNotificationPermission,
        enabled: browserSupportsNotifications && !notificationEnabled,
      },
    ],
  }), [browserSupportsNotifications, notificationEnabled, requestNotificationPermission]);

  useRegisterShortcuts(shortcutRegistration);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Settings</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">通知設定</h1>
        <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
          開始可能になったタスクの通知を管理します。通知はこのブラウザ内でのみ有効になり、Todo データは外部へ送信されません。
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {notificationEnabled ? <BellRing size={16} /> : <Bell size={16} />}
              {notificationEnabled ? '通知は有効です' : '通知はまだ有効ではありません'}
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <p>対象は「開始可能」になったタスクです。</p>
              <p>通知を無効にしたい場合は、ブラウザのサイト権限設定から変更してください。</p>
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
            {notificationEnabled ? '設定済み' : '通知を有効にする'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">動作の前提</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>ブラウザが通知 API と Service Worker をサポートしている必要があります。</li>
          <li>通知は 30 秒ごとに開始可能なタスクを確認して送信されます。</li>
          <li>一度通知したタスクは、同じブラウザでは重複通知されません。</li>
        </ul>
      </section>
    </div>
  );
};
