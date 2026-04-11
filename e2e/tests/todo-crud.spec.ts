import { createTodo, getTodoCard } from '../utils/todo';
import { expect, test } from '../fixtures/app.fixture';

test('タスクを作成して編集し、削除できる', async ({
  page,
  gotoApp,
  waitForAppReady,
  setLocale,
}) => {
  await setLocale('ja');
  const initialTitle = `Playwright CRUD ${Date.now()}`;
  const updatedTitle = `${initialTitle} Updated`;

  await gotoApp('/new');
  await createTodo(page, { title: initialTitle });

  await waitForAppReady();
  const createdCard = getTodoCard(page, initialTitle);
  await expect(createdCard).toBeVisible();

  await createdCard.getByRole('button', { name: /編集|Edit/ }).click();
  await expect(page.getByRole('heading', { name: 'タスクの編集' })).toBeVisible();
  await page.locator('#title').fill(updatedTitle);
  await page.getByRole('button', { name: /保存して閉じる|Save and Close/ }).click();

  await waitForAppReady();
  const updatedCard = getTodoCard(page, updatedTitle);
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByRole('button', { name: /削除|Delete/ }).click();
  await expect(page.getByText('本当に削除しますか？')).toBeVisible();
  await page.getByRole('button', { name: 'OK' }).click();

  await expect(page.getByRole('heading', { name: updatedTitle })).toHaveCount(0);
});
