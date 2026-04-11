import { test } from '../fixtures/app.fixture';

test('初回起動時はブラウザ言語から英語が選択される', async ({
  gotoApp,
  setLocale,
  setBrowserLanguage,
  waitForAppReady,
}) => {
  await setLocale(null);
  await setBrowserLanguage('en-US');

  await gotoApp('/');
  await waitForAppReady('Todos');
});

test('日本語ブラウザでは初回起動時に日本語になる', async ({
  gotoApp,
  setLocale,
  setBrowserLanguage,
  waitForAppReady,
}) => {
  await setLocale(null);
  await setBrowserLanguage('ja-JP');

  await gotoApp('/');
  await waitForAppReady('タスク一覧');
});
