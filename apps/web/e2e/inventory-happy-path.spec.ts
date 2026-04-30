import { expect, test } from '@playwright/test';

test('/(app)/inventory 미인증 → /login redirect', async ({ page }) => {
  await page.goto('/inventory', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.locator('form')).toBeVisible({ timeout: 30_000 });
});
