import { expect, test as base } from '@playwright/test';

const APP_DB_NAME = 'hakaruTodoDB';
const LOCALE_STORAGE_KEY = 'hakaru-todo-locale';

type AppFixtures = {
  gotoApp: (path?: string) => Promise<void>;
  waitForAppReady: (heading?: string | RegExp) => Promise<void>;
  setLocale: (locale: 'ja' | 'en' | null) => Promise<void>;
  setBrowserLanguage: (language: string) => Promise<void>;
};
/* eslint-disable react-hooks/rules-of-hooks */ export const test = base.extend<AppFixtures>({
  context: async ({ context }, use) => {
    await context.addInitScript(
      ({ dbName }) => {
        const resetKey = '__playwright_app_reset__';

        if (!window.sessionStorage.getItem(resetKey)) {
          window.localStorage.clear();

          const deleteRequest = window.indexedDB.deleteDatabase(dbName);
          deleteRequest.onerror = () => undefined;
          deleteRequest.onblocked = () => undefined;

          window.sessionStorage.setItem(resetKey, '1');
        }

        if ('serviceWorker' in navigator) {
          const serviceWorkerContainer = navigator.serviceWorker;
          Object.defineProperty(serviceWorkerContainer, 'register', {
            configurable: true,
            value: async () => ({
              scope: window.location.origin,
              unregister: async () => true,
              update: async () => undefined,
            }),
          });
        }
      },
      { dbName: APP_DB_NAME },
    );

    await use(context);
  },

  gotoApp: async ({ page }, use) => {
    const gotoApp = async (path = '/') => {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      await page.goto(`/#${normalizedPath}`);
    };

    await use(gotoApp);
  },

  waitForAppReady: async ({ page }, use) => {
    const waitForAppReady = async (heading: string | RegExp = /タスク一覧|Todos/) => {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    };

    await use(waitForAppReady);
  },

  setLocale: async ({ page }, use) => {
    const setLocale = async (locale: 'ja' | 'en' | null) => {
      await page.addInitScript(
        ({ localeValue, key }) => {
          const markerKey = '__playwright_forced_locale__';
          if (window.sessionStorage.getItem(markerKey)) {
            return;
          }

          if (localeValue) {
            window.localStorage.setItem(key, localeValue);
          } else {
            window.localStorage.removeItem(key);
          }

          window.sessionStorage.setItem(markerKey, '1');
        },
        { localeValue: locale, key: LOCALE_STORAGE_KEY },
      );
    };

    await use(setLocale);
  },

  setBrowserLanguage: async ({ page }, use) => {
    const setBrowserLanguage = async (language: string) => {
      await page.addInitScript(
        ({ languageValue }) => {
          Object.defineProperty(window.navigator, 'language', {
            configurable: true,
            get: () => languageValue,
          });
          Object.defineProperty(window.navigator, 'languages', {
            configurable: true,
            get: () => [languageValue],
          });
        },
        { languageValue: language },
      );
    };

    await use(setBrowserLanguage);
  },
});

export { expect };
