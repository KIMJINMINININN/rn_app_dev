import { expect, test } from '@playwright/test';

test('/(app)/inventory 미인증 상태에서 정렬/필터 라우트 접근 불가', async ({
  page,
}) => {
  await page.goto('/inventory', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
});
