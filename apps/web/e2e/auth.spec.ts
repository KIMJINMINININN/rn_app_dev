import { expect, test } from '@playwright/test';

test('/login 페이지 렌더', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // 로그인 폼 또는 로고 존재 확인 (회귀 방지)
  await expect(page.locator('form')).toBeVisible({ timeout: 30_000 });
});
