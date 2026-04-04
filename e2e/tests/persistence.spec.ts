import { createTodo, getTodoCard } from '../utils/todo';
import { expect, test } from '../fixtures/app.fixture';

test('作成した Todo がリロード後も保持される', async ({ page, gotoApp, waitForAppReady }) => {
  const title = `Playwright Persist ${Date.now()}`;

  await gotoApp('/new');
  await createTodo(page, { title, dueDate: '2026-04-11T15:30', effortMinutes: 55 });

  await waitForAppReady();
  await expect(getTodoCard(page, title)).toBeVisible();

  await page.reload();
  await waitForAppReady();

  await expect(getTodoCard(page, title)).toBeVisible();
});
