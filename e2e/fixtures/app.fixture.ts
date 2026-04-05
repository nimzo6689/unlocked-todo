import { expect, test as base } from '@playwright/test';

const APP_DB_NAME = 'hakaruTodoDB';

type AppFixtures = {
  gotoApp: (path?: string) => Promise<void>;
  waitForAppReady: (heading?: string | RegExp) => Promise<void>;
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
    const waitForAppReady = async (heading: string | RegExp = 'タスク一覧') => {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    };

    await use(waitForAppReady);
  },
});

export { expect };
