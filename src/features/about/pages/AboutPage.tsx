import { Info, ShieldCheck, Workflow } from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Help</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">アプリ情報</h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Hakaru Todo は、今すぐ着手できるタスクを見つけやすくするための Todo アプリです。
        </p>
        <p className="inline-flex items-center gap-2 text-sm text-slate-600">
          <span>ソースコード:</span>
          <a
            href="https://github.com/nimzo6689/hakaru-todo"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800"
          >
            github.com/nimzo6689/hakaru-todo
          </a>
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Info size={18} className="text-sky-600" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">何が違うか</h2>
          <p className="mt-2 text-sm text-slate-600">
            依存タスクや着手可能日時を考慮し、今取りかかれるタスクを中心に整理します。
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Workflow size={18} className="text-emerald-600" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">主要機能</h2>
          <p className="mt-2 text-sm text-slate-600">
            タスクの依存管理、空き状況の可視化、開始可能時の通知に対応しています。
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShieldCheck size={18} className="text-violet-600" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">データ保存</h2>
          <p className="mt-2 text-sm text-slate-600">
            データはブラウザ内の IndexedDB と LocalStorage
            に保存され、通常利用で外部通信は行いません。
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">このアプリで確認できること</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>今すぐ着手できるタスクと、まだ着手できないタスクの区別</li>
          <li>期限と工数をもとにした負荷の見える化</li>
          <li>タスク全体の空き状況の確認</li>
        </ul>
      </section>
    </div>
  );
};
