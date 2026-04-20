import { test, expect } from '@playwright/test';

test('game loads and shows canvas', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Wait for canvas to appear
  await page.waitForSelector('canvas', { timeout: 10000 });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});

test('page title is VoidYield', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/VoidYield/i);
});
