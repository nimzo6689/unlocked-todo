import { BellRing, CalendarClock, CheckSquare, ListChecks } from 'lucide-react';

const steps = [
  {
    title: 'タスクを作成する',
    description: 'タイトル、期限、工数、担当者を入力して、必要であれば依存タスクも設定します。',
    icon: ListChecks,
  },
  {
    title: '着手可能な一覧を見る',
    description: 'タスク一覧では、開始可能なタスクを優先的に確認できます。フィルターで Locked や Completed に切り替えられます。',
    icon: CheckSquare,
  },
  {
    title: '空き状況を確認する',
    description: '空き状況ページでは、自分担当タスクの負荷を時間帯ごとに確認できます。設定した勤務時間が使われます。',
    icon: CalendarClock,
  },
  {
    title: '通知を有効にする',
    description: '設定とヘルプ > 通知設定から、開始可能になったタスクの通知をオンにできます。',
    icon: BellRing,
  },
];

const shortcutCategories = [
  {
    title: '全体共通',
    items: [
      { keys: '?', description: 'ショートカットヘルプを表示します。' },
      { keys: 'g → i', description: 'タスク一覧へ移動します。' },
      { keys: 'g → n', description: '新規タスク作成へ移動します。' },
      { keys: 'g → a / p / t / w / u / b', description: '各画面へ素早く移動します。' },
    ],
  },
  {
    title: 'タスク一覧',
    items: [
      { keys: 'j / k', description: '選択中タスクを上下に移動します。' },
      { keys: 'Enter / o', description: '選択中タスクを編集します。' },
      { keys: 'n / x / c / d', description: '新規作成、着手、中断、完了、削除を行います。' },
      { keys: '1 - 5', description: 'フィルターを切り替えます。' },
      { keys: 'e / i', description: 'エクスポートまたはインポートを開きます。' },
    ],
  },
  {
    title: 'フォームと設定',
    items: [
      { keys: 'Ctrl/Cmd+Enter', description: 'フォームや設定を保存します。' },
      { keys: 'Ctrl/Cmd+Shift+Enter', description: 'フォームを保存して一覧に戻ります。' },
      { keys: 'Esc', description: 'ダイアログやフォーム編集を閉じます。' },
      { keys: 'Alt+1 - Alt+5', description: 'Todo フォームの工数をクイック設定します。' },
      { keys: 'h / l / t', description: '空き状況・予実管理の日付を前日、翌日、今日へ切り替えます。' },
    ],
  },
];

export const UsagePage = () => {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Help</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">使い方</h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          日々の運用で迷わないように、基本的な使い方を短くまとめています。
        </p>
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
            <h2 className="text-lg font-semibold text-slate-900">ショートカット早見表</h2>
            <p className="text-sm text-slate-600">
              デスクトップと外付けキーボード利用時に使える主要ショートカットです。入力欄にフォーカス中は、保存系以外の単キーは無効になります。
            </p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            ヘルプは ? でいつでも表示
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {shortcutCategories.map((category) => (
            <section key={category.title} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">{category.title}</h3>
              <div className="mt-3 space-y-3">
                {category.items.map((item) => (
                  <div key={`${category.title}-${item.keys}`} className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.keys}</p>
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
