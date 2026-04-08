import { createTodo, getTodoCard } from '../utils/todo';
import { expect, test } from '../fixtures/app.fixture';

test('作成したタスクがリロード後も保持される', async ({
  page,
  gotoApp,
  waitForAppReady,
  setLocale,
}) => {
  await setLocale('ja');
  const title = `Playwright Persist ${Date.now()}`;

  await gotoApp('/new');
  await createTodo(page, { title, dueDate: '2026-04-11T15:30', effortMinutes: 55 });

  await waitForAppReady();
  await expect(getTodoCard(page, title)).toBeVisible();

  await page.reload();
  await waitForAppReady();

  await expect(getTodoCard(page, title)).toBeVisible();
});

test('言語設定がリロード後も保持される', async ({ page, gotoApp, setLocale }) => {
  await setLocale('ja');
  await gotoApp('/settings/general');

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.getByText('Current: English')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.getByText('Current: English')).toBeVisible();
});
