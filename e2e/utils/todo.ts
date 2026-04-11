import { expect, type Locator, type Page } from '@playwright/test';

type CreateTodoOptions = {
  title: string;
  description?: string;
  dueDate?: string;
  startableAt?: string;
  effortMinutes?: number;
};

const toStartableAt = (dueDate: string, fallback: string): string => {
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  // Keep startableAt before dueDate so form validation can pass consistently.
  const startableAt = new Date(parsed.getTime() - 60 * 60 * 1000);
  const tzOffsetMs = startableAt.getTimezoneOffset() * 60 * 1000;
  return new Date(startableAt.getTime() - tzOffsetMs).toISOString().slice(0, 16);
};

export const createTodo = async (
  page: Page,
  {
    title,
    description = 'Playwright で作成したタスクです。',
    dueDate = '2026-04-10T10:00',
    startableAt,
    effortMinutes = 25,
  }: CreateTodoOptions,
) => {
  const resolvedStartableAt = startableAt ?? toStartableAt(dueDate, dueDate);

  await expect(page.getByRole('heading', { name: /タスクの新規作成|Create Task/ })).toBeVisible();
  await page.locator('#title').fill(title);
  await page.locator('#description').fill(description);
  await page.locator('#startableAt').fill(resolvedStartableAt);
  await page.locator('#dueDate').fill(dueDate);
  await page.locator('#effortMinutes').fill(`${effortMinutes}`);
  await page.getByRole('button', { name: /保存して閉じる|Save and Close/ }).click();
};

export const getTodoCard = (page: Page, title: string): Locator =>
  page.locator('[role="option"]').filter({
    has: page.getByRole('heading', { name: title }),
  });
