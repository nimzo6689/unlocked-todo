export const THEME_STORAGE_KEY = 'hakaru-todo-theme';
export const SUPPORTED_THEMES = ['light', 'dark'] as const;

export type AppTheme = (typeof SUPPORTED_THEMES)[number];

export const DEFAULT_THEME: AppTheme = 'light';

export const normalizeTheme = (value: string | null | undefined): AppTheme => {
  if (!value) {
    return DEFAULT_THEME;
  }

  const lowered = value.toLowerCase();
  if (SUPPORTED_THEMES.includes(lowered as AppTheme)) {
    return lowered as AppTheme;
  }

  return DEFAULT_THEME;
};

export const resolveInitialTheme = (): AppTheme => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored) {
    return normalizeTheme(stored);
  }

  return DEFAULT_THEME;
};

export const persistTheme = (theme: AppTheme) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const applyDocumentTheme = (theme: AppTheme) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
};

export const initializeTheme = () => {
  const initialTheme = resolveInitialTheme();
  applyDocumentTheme(initialTheme);
  return initialTheme;
};
