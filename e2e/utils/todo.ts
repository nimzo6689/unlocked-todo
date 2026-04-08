import { expect, type Locator, type Page } from '@playwright/test';

type CreateTodoOptions = {
  title: string;
  description?: string;
  dueDate?: string;
  effortMinutes?: number;
};

export const createTodo = async (
  page: Page,
  {
    title,
    description = 'Playwright で作成した Todo です。',
    dueDate = '2026-04-10T10:00',
    effortMinutes = 25,
  }: CreateTodoOptions,
) => {
  await expect(page.getByRole('heading', { name: /タスクの新規作成|Create Task/ })).toBeVisible();
  await page.locator('#title').fill(title);
  await page.locator('#description').fill(description);
  await page.locator('#dueDate').fill(dueDate);
  await page.locator('#effortMinutes').fill(`${effortMinutes}`);
  await page.getByRole('button', { name: /完了|Done/ }).click();
};

export const getTodoCard = (page: Page, title: string): Locator =>
  page.locator('[role="option"]').filter({
    has: page.getByRole('heading', { name: title }),
  });
