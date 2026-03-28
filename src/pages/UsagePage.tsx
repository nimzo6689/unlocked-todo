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
    </div>
  );
};
