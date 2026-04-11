import { useTranslation } from 'react-i18next';
import {
  DEFAULT_LOCALE,
  type AppLocale,
  LOCALE_STORAGE_KEY,
  applyDocumentLocale,
  normalizeLocale,
  persistLocale,
} from './index';

export const useAppLocale = () => {
  const { i18n, t } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage);

  const setLocale = async (nextLocale: AppLocale) => {
    persistLocale(nextLocale);
    applyDocumentLocale(nextLocale);
    await i18n.changeLanguage(nextLocale);
  };

  return {
    locale,
    setLocale,
    locales: [
      { value: 'en' as const, label: t('common.locale.en') },
      { value: 'ja' as const, label: t('common.locale.ja') },
    ],
    defaultLocale: DEFAULT_LOCALE,
    storageKey: LOCALE_STORAGE_KEY,
  };
};
