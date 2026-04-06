import { expect, test } from '../fixtures/app.fixture';

test('サイドバーから主要ページへ遷移できる', async ({
  page,
  gotoApp,
  waitForAppReady,
  setLocale,
}) => {
  await setLocale('ja');
  await gotoApp('/');
  await waitForAppReady('タスク一覧');

  await page.getByRole('button', { name: 'サイドバーを展開' }).click();

  await page.getByRole('button', { name: '空き状況' }).click();
  await waitForAppReady('空き状況');

  await page.getByRole('button', { name: '予実管理' }).click();
  await waitForAppReady('予実管理');

  await page.getByRole('button', { name: '設定とヘルプ' }).click();

  await page.getByRole('button', { name: '通知と言語' }).click();
  await waitForAppReady('通知と言語');

  await page.getByRole('button', { name: '稼働設定' }).click();
  await waitForAppReady('稼働設定');

  await page.getByRole('button', { name: '使い方' }).click();
  await waitForAppReady('使い方');

  await page.getByRole('button', { name: 'アプリ情報' }).click();
  await waitForAppReady('アプリ情報');

  await page.getByRole('button', { name: 'タスク一覧' }).click();
  await expect(page.getByRole('heading', { name: 'タスク一覧' })).toBeVisible();
});
