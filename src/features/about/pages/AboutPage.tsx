import { Info, ShieldCheck, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AboutPage = () => {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Help</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('about.title')}</h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">{t('about.description')}</p>
        <p className="inline-flex items-center gap-2 text-sm text-slate-600">
          <span>{t('about.sourceCode')}</span>
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
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            {t('about.cards.whatIsDifferent.title')}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {t('about.cards.whatIsDifferent.description')}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Workflow size={18} className="text-emerald-600" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            {t('about.cards.coreFeatures.title')}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{t('about.cards.coreFeatures.description')}</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShieldCheck size={18} className="text-violet-600" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            {t('about.cards.dataStorage.title')}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{t('about.cards.dataStorage.description')}</p>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">{t('about.checklistTitle')}</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>{t('about.checklist.readyVsLocked')}</li>
          <li>{t('about.checklist.loadVisualization')}</li>
          <li>{t('about.checklist.overallAvailability')}</li>
        </ul>
      </section>
    </div>
  );
};
