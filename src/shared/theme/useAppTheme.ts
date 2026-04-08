import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type AppTheme,
  applyDocumentTheme,
  normalizeTheme,
  persistTheme,
} from './index';

const getResolvedTheme = (): AppTheme => {
  if (typeof document === 'undefined') {
    return DEFAULT_THEME;
  }

  return normalizeTheme(document.documentElement.dataset.theme);
};

export const useAppTheme = () => {
  const { t } = useTranslation();
  const [theme, setThemeState] = useState<AppTheme>(() => getResolvedTheme());

  const setTheme = (nextTheme: AppTheme) => {
    persistTheme(nextTheme);
    applyDocumentTheme(nextTheme);
    setThemeState(nextTheme);
  };

  const themes = useMemo(
    () => [
      { value: 'light' as const, label: t('common.theme.light') },
      { value: 'dark' as const, label: t('common.theme.dark') },
    ],
    [t],
  );

  return {
    theme,
    themes,
    setTheme,
    defaultTheme: DEFAULT_THEME,
    storageKey: THEME_STORAGE_KEY,
  };
};
