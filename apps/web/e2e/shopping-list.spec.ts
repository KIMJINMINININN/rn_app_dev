// apps/web/e2e/shopping-list.spec.ts
// Phase 5 §6.3 — E2E: shopping-list happy path
//
// ⚠️ 실제 실행 전제 조건:
//   - supabase local (Docker) 가동 + 마이그레이션 0016 적용 (shopping_list 테이블)
//   - extractRecipeGap Server Action 동작
//   - NEXT_PUBLIC_COUPANG_ENABLED=true (기본값)
//   - pnpm dev 서버 port 3100 구동
//
// 현 단계에서는 스펙 파일 작성 + typecheck/lint 통과까지 검증.
// test:e2e 실제 실행은 사용자 환경 의존 (Phase 4 패턴 동일).
//
// 헬퍼: cooking-history-happy-path.spec.ts 인라인 패턴 적용.
//
// 셀렉터 방침: data-testid 추가 최소화 — 텍스트/role matcher 우선.
//   - ExtractGapButton: getByRole('button', { name: /부족 재료 장바구니에 담기/ })
//   - toast: sonner → getByText로 성공 메시지 매칭
//   - /(app)/shopping: h1 "장보기 목록"
//   - ShoppingItemRow: 재료명 텍스트 (link 또는 span)
//   - 커머스 deeplink: getByRole('link', { name: /쿠팡/ }) 또는 text 매칭
//     새 탭 열림: page.context().waitForEvent('page')

import { expect, test } from '@playwright/test';

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

/**
 * 유니크 이메일 생성 (timestamp 기반).
 * e2e 병렬 실행 충돌 방지를 위해 rand suffix 추가.
 */
function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e-shopping-${ts}-${rand}@test.local`;
}

/**
 * 회원가입 → 세션 획득.
 * Supabase local dev 환경: email confirm OFF 가정 (signUp 즉시 session 발급).
 */
async function signup(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/signup', { waitUntil: 'domcontentloaded' });
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.locator('button[type="submit"]').click();
  // 성공 시 /account 로 redirect (signupAction → redirect('/account'))
  await expect(page).toHaveURL(/\/account/, { timeout: 30_000 });
}

/**
 * 인벤토리 페이지 진입 확인.
 */
async function goToInventory(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.goto('/inventory', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: '냉장고 재고', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * 재료 추가 다이얼로그를 통해 재료 1개 추가.
 */
async function addIngredient(
  page: import('@playwright/test').Page,
  ingredientName: string,
): Promise<void> {
  // "+ 추가" 버튼 — inventory-actions.tsx
  await page.getByRole('button', { name: '+ 추가' }).click();

  // 다이얼로그 열림 대기: "식재료 추가" 타이틀
  await expect(
    page.getByRole('dialog').getByText('식재료 추가'),
  ).toBeVisible({ timeout: 10_000 });

  // 검색 입력
  await page.getByLabel('이름').fill(ingredientName);

  // 타입어헤드 결과 대기: 재료명 버튼 등장
  const resultButton = page
    .getByRole('dialog')
    .getByRole('button', { name: ingredientName });
  await expect(resultButton).toBeVisible({ timeout: 10_000 });
  await resultButton.click();

  // detail step: "저장" 버튼
  await page.getByRole('button', { name: '저장' }).click();

  // 다이얼로그 닫힘 대기
  await expect(
    page.getByRole('dialog').getByText('식재료 추가'),
  ).not.toBeVisible({ timeout: 10_000 });
}

// ── 테스트: happy path ───────────────────────────────────────────────────────

test(
  '장보기 happy-path: 가입 + 재료 추가 → 레시피 상세 → 부족 재료 담기 → /shopping 이동 → ShoppingItemRow 노출 → deeplink 새 탭',
  async ({ page }) => {
    // ── Step 1. 가입 ───────────────────────────────────────────────────────
    const email = uniqueEmail();
    const password = 'Test1234!';
    await signup(page, email, password);

    // ── Step 2. 인벤토리 진입 + 재료 일부 추가 (김치찌개 재료 중 일부만 — 부족 재료 발생 목적) ──
    await goToInventory(page);

    // 0006 시드 기반 김치찌개 재료 세트 중 일부만 추가 (부족 재료가 생기도록)
    const ingredients = ['배추김치', '돼지고기 삼겹살'];
    for (const name of ingredients) {
      await addIngredient(page, name);
    }

    // ── Step 3. /recipes 진입 → 첫 카드 클릭 → 상세 진입 ─────────────────
    await page.goto('/recipes', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: '레시피 추천', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    // 레시피 카드 링크: href="/recipes/{uuid}" 패턴
    const recipeLinks = page.locator('a[href^="/recipes/"]');
    await expect(recipeLinks.first()).toBeVisible({ timeout: 30_000 });

    // 첫 번째 카드 클릭 → 상세 진입
    await recipeLinks.first().click();
    await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}/, {
      timeout: 30_000,
    });

    // 상세 페이지: article h1 (요리명) 표시 확인
    const recipeNameH1 = page.locator('article h1');
    await expect(recipeNameH1).toBeVisible({ timeout: 30_000 });

    // ── Step 4. "부족 재료 장바구니에 담기" 버튼 클릭 ──────────────────────
    // ExtractGapButton: getByRole('button', { name: /부족 재료 장바구니에 담기/ })
    const extractGapBtn = page.getByRole('button', {
      name: /부족 재료 장바구니에 담기/,
    });
    await expect(extractGapBtn).toBeVisible({ timeout: 15_000 });
    await extractGapBtn.click();

    // toast 또는 안내 메시지 노출 확인
    // extractRecipeGap Server Action 성공 → sonner toast (role="status" 또는 aria-live)
    // "장바구니에 담았습니다" 또는 "추가했습니다" 등 성공 메시지
    await expect(
      page.getByText(/장바구니|추가|담았/, { exact: false }),
    ).toBeVisible({ timeout: 15_000 });

    // ── Step 5. /(app)/shopping 이동 ─────────────────────────────────────
    await page.goto('/shopping', { waitUntil: 'domcontentloaded' });

    // h1 "장보기 목록"
    await expect(
      page.getByRole('heading', { name: '장보기 목록', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    // ── Step 6. ShoppingItemRow 노출 검증 (적어도 1개) ────────────────────
    // ShoppingItemRow: 재료명 텍스트 포함 row
    // 빈 상태 메시지가 없어야 함
    const emptyMsg = page.getByText(/장보기 항목이 없|아직 항목이 없/, {
      exact: false,
    });
    // 빈 상태가 아님을 확인 (있다면 타임아웃으로 통과)
    const emptyCount = await emptyMsg.count();
    expect(emptyCount).toBe(0);

    // 장보기 item row 1개 이상: checkbox role 또는 listitem
    // ShoppingItemRow는 체크박스(role="checkbox")를 포함하는 row
    const shoppingItems = page.locator('[role="listitem"], li').filter({
      has: page.locator('[role="checkbox"]'),
    });
    // 체크박스가 없는 경우 대비 — 텍스트 기반으로도 확인
    const checkboxes = page.locator('[role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    // 장보기 row가 1개 이상 있어야 함
    if (checkboxCount > 0) {
      await expect(checkboxes.first()).toBeVisible({ timeout: 10_000 });
    } else {
      // 최소한 ShoppingItemRow가 article/div로 렌더되는 경우
      await expect(shoppingItems.first()).toBeVisible({ timeout: 10_000 });
    }

    // ── Step 7. 커머스 deeplink 클릭 → 새 탭 열림 검증 ─────────────────────
    // CommerceLinkMenu: NEXT_PUBLIC_COUPANG_ENABLED=true → 쿠팡 링크 버튼 노출
    // target="_blank" → 새 탭 열림
    // Playwright: page.context().waitForEvent('page') 로 새 탭 캡처
    const coupangLink = page
      .locator('a[target="_blank"]')
      .filter({ hasText: /쿠팡/ })
      .first();

    const coupangLinkCount = await coupangLink.count();
    if (coupangLinkCount > 0) {
      // 새 탭 이벤트 대기 + 링크 클릭
      const newPagePromise = page.context().waitForEvent('page');
      await coupangLink.click();
      const newPage = await newPagePromise;

      // 새 탭 URL이 coupang.com 검색 URL인지 검증
      await newPage.waitForLoadState('domcontentloaded');
      expect(newPage.url()).toContain('coupang.com');

      await newPage.close();
    } else {
      // NEXT_PUBLIC_COUPANG_ENABLED=false 환경 또는 링크 텍스트 다른 경우 — 링크 자체 존재 확인
      // 최소한 target="_blank" rel="noopener" 링크 1개 이상 있어야 함
      const anyDeeplink = page.locator(
        'a[target="_blank"][rel*="noopener"]',
      );
      const deeplinkCount = await anyDeeplink.count();
      expect(deeplinkCount).toBeGreaterThan(0);
    }
  },
);

// ── 테스트: 미인증 → /login redirect ────────────────────────────────────────

test('/(app)/shopping 미인증 → /login redirect', async ({ page }) => {
  await page.goto('/shopping', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.locator('form')).toBeVisible({ timeout: 30_000 });
});
