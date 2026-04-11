import { useTranslation } from 'react-i18next';
import type { ShortcutHelpSection } from '@/shared/config/shortcuts';

type ShortcutHelpModalProps = {
  open: boolean;
  onClose: () => void;
  pageLabel?: string;
  globalSections: Array<ShortcutHelpSection & { categoryLabel?: string }>;
  pageSections: Array<ShortcutHelpSection & { categoryLabel?: string }>;
};

export const ShortcutHelpModal = ({
  open,
  onClose,
  pageLabel,
  globalSections,
  pageSections,
}: ShortcutHelpModalProps) => {
  const { t } = useTranslation();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              {t('shortcuts.heading')}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{t('shortcuts.title')}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {pageLabel
                ? t('shortcuts.modalDescriptionWithPage', { pageLabel })
                : t('shortcuts.modalDescriptionWithoutPage')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            {t('common.close')}
          </button>
        </div>

        <div className="grid max-h-[calc(90vh-88px)] gap-6 overflow-y-auto p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {t('shortcuts.currentScreen')}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {t('shortcuts.currentScreenDescription')}
              </p>
            </div>
            {pageSections.length > 0 ? (
              pageSections.map(section => (
                <section
                  key={section.category}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <h4 className="text-sm font-semibold text-slate-900">
                    {section.categoryLabel || section.category}
                  </h4>
                  <div className="mt-3 space-y-2">
                    {section.items.map(item => (
                      <div
                        key={item.id}
                        className="grid gap-2 rounded-xl bg-slate-50 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center"
                      >
                        <p className="text-sm text-slate-700">{item.description}</p>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {item.keys.map(keyLabel => (
                            <span
                              key={keyLabel}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                            >
                              {keyLabel}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                {t('shortcuts.noPageShortcuts')}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t('shortcuts.global')}</h3>
              <p className="mt-1 text-sm text-slate-500">{t('shortcuts.globalDescription')}</p>
            </div>
            {globalSections.map(section => (
              <section
                key={section.category}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
              >
                <h4 className="text-sm font-semibold text-slate-900">
                  {section.categoryLabel || section.category}
                </h4>
                <div className="mt-3 space-y-2">
                  {section.items.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-slate-700">{item.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {item.keys.map(keyLabel => (
                            <span
                              key={keyLabel}
                              className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              {keyLabel}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
};
