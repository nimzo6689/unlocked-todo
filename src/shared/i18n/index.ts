import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

export const LOCALE_STORAGE_KEY = 'hakaru-todo-locale';
export const SUPPORTED_LOCALES = ['ja', 'en'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'ja';

export const normalizeLocale = (value: string | null | undefined): AppLocale => {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  const lowered = value.toLowerCase();
  if (lowered.startsWith('ja')) {
    return 'ja';
  }

  if (lowered.startsWith('en')) {
    return 'en';
  }

  return DEFAULT_LOCALE;
};

export const resolveInitialLocale = (): AppLocale => {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored) {
    return normalizeLocale(stored);
  }

  return normalizeLocale(window.navigator.language);
};

export const persistLocale = (locale: AppLocale) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
};

export const applyDocumentLocale = (locale: AppLocale) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = locale;
};

export const getIntlLocale = (locale: AppLocale = normalizeLocale(i18n.resolvedLanguage)) =>
  locale === 'ja' ? 'ja-JP' : 'en-US';

if (!i18n.isInitialized) {
  const initialLocale = resolveInitialLocale();

  void i18n.use(initReactI18next).init({
    resources,
    lng: initialLocale,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false,
    },
  });

  applyDocumentLocale(initialLocale);
}

export default i18n;
