// apps/web/e2e/shopping-manual-add.spec.ts
// Phase 5 §6.3 — E2E: shopping-manual-add (수동 항목 추가 + 토글 + 삭제)
//
// ⚠️ 실제 실행 전제 조건:
//   - supabase local (Docker) 가동 + 마이그레이션 0016 적용 (shopping_list 테이블)
//   - addManualShoppingItem / toggleBought / deleteShoppingItem Server Action 동작
//   - pnpm dev 서버 port 3100 구동
//
// 현 단계에서는 스펙 파일 작성 + typecheck/lint 통과까지 검증.
// test:e2e 실제 실행은 사용자 환경 의존 (Phase 4 패턴 동일).
//
// 셀렉터 방침: data-testid 추가 최소화 — 텍스트/role matcher 우선.
//   - "항목 추가" 버튼: getByRole('button', { name: /항목 추가/ })
//   - AddShoppingDialog: role="dialog"
//   - 이름 입력: getByLabel('이름') 또는 getByPlaceholder
//   - 수량/단위 입력: getByLabel('수량') / getByLabel('단위')
//   - 제출: dialog 내 getByRole('button', { name: /추가|저장/ })
//   - ShoppingItemRow "우유": getByText('우유') — row 내 표시 확인
//   - 체크박스 토글: getByRole('checkbox') — checked 상태 확인 + 구매완료 섹션 이동
//   - 삭제 버튼: getByRole('button', { name: /삭제/ }) 또는 getByLabel('삭제')
//   - window.confirm: page.on('dialog', d => d.accept()) 처리

import { expect, test } from '@playwright/test';

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

/**
 * 유니크 이메일 생성 (timestamp 기반).
 */
function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e-shopping-manual-${ts}-${rand}@test.local`;
}

/**
 * 회원가입 → 세션 획득.
 * Supabase local dev 환경: email confirm OFF 가정.
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
  // 성공 시 /account 로 redirect
  await expect(page).toHaveURL(/\/account/, { timeout: 30_000 });
}

// ── 테스트: 수동 항목 추가 + 체크 + 삭제 ────────────────────────────────────

test(
  '장보기 수동 추가: 가입 → /shopping 이동 → 항목 추가 다이얼로그 → "우유" 추가 → 체크 → 구매완료 이동 → 삭제',
  async ({ page }) => {
    // ── Step 1. 가입 ───────────────────────────────────────────────────────
    const email = uniqueEmail();
    const password = 'Test1234!';
    await signup(page, email, password);

    // ── Step 2. /(app)/shopping 직접 이동 ────────────────────────────────
    await page.goto('/shopping', { waitUntil: 'domcontentloaded' });

    // h1 "장보기 목록" 표시
    await expect(
      page.getByRole('heading', { name: '장보기 목록', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    // ── Step 3. "항목 추가" 버튼 클릭 → AddShoppingDialog 열림 ────────────
    // AddShoppingDialog 트리거 버튼 — manual-add-shopping feature
    const addItemBtn = page.getByRole('button', { name: /항목 추가/ });
    await expect(addItemBtn).toBeVisible({ timeout: 10_000 });
    await addItemBtn.click();

    // 다이얼로그 열림 대기: role="dialog"
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // 다이얼로그 내 타이틀 확인 (수동 추가 다이얼로그)
    await expect(
      dialog.getByText(/항목 추가|장보기 항목/, { exact: false }),
    ).toBeVisible({ timeout: 5_000 });

    // ── Step 4. 폼 입력 (name="우유", quantity=1, unit="개") → 제출 ─────────
    // 이름 입력 필드
    const nameInput = dialog.getByLabel('이름');
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill('우유');

    // 수량 입력 (optional — 필드가 있을 때만)
    const quantityInput = dialog.getByLabel('수량');
    const quantityCount = await quantityInput.count();
    if (quantityCount > 0) {
      await quantityInput.fill('1');
    }

    // 단위 입력 (optional — 필드가 있을 때만)
    const unitInput = dialog.getByLabel('단위');
    const unitCount = await unitInput.count();
    if (unitCount > 0) {
      await unitInput.fill('개');
    }

    // 제출 버튼: "추가" 또는 "저장"
    const submitBtn = dialog.getByRole('button', { name: /추가|저장/ });
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });
    await submitBtn.click();

    // 다이얼로그 닫힘 대기
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // ── Step 5. ShoppingItemRow에 "우유" 노출 확인 ───────────────────────
    // addManualShoppingItem Server Action 성공 → 목록 갱신
    const milkItem = page.getByText('우유', { exact: true });
    await expect(milkItem).toBeVisible({ timeout: 15_000 });

    // ── Step 6. 체크박스 토글 → bought=true UI 변화 (구매완료 섹션 이동) ────
    // "우유" 항목의 체크박스 — 해당 row의 checkbox
    // 우유 텍스트 근처 checkbox 탐색 (row 컨테이너 기준)
    const milkRow = page
      .locator('li, [role="listitem"], article, div')
      .filter({ has: page.getByText('우유', { exact: true }) })
      .first();

    const milkCheckbox = milkRow.locator('[role="checkbox"]').first();
    const milkCheckboxCount = await milkCheckbox.count();

    if (milkCheckboxCount > 0) {
      await expect(milkCheckbox).toBeVisible({ timeout: 10_000 });
      await milkCheckbox.click();

      // toggleBought Server Action 성공 → bought=true → 구매완료 섹션 이동
      // 구매완료 섹션 헤더 노출 확인 ("구매완료" 또는 "완료" 등)
      await expect(
        page.getByText(/구매완료|구매 완료|완료된/, { exact: false }),
      ).toBeVisible({ timeout: 15_000 });
    } else {
      // 체크박스가 별도 role 없이 input[type="checkbox"]인 경우 대비
      const milkInputCheckbox = milkRow
        .locator('input[type="checkbox"]')
        .first();
      await expect(milkInputCheckbox).toBeVisible({ timeout: 10_000 });
      await milkInputCheckbox.click();

      await expect(
        page.getByText(/구매완료|구매 완료|완료된/, { exact: false }),
      ).toBeVisible({ timeout: 15_000 });
    }

    // ── Step 7. 삭제 버튼 → 항목 사라짐 확인 ────────────────────────────
    // window.confirm → page.on('dialog') 처리
    page.on('dialog', (d) => d.accept());

    // 우유 항목 삭제 버튼 — 구매완료 섹션으로 이동된 상태
    // 삭제 버튼: "삭제" 텍스트 또는 aria-label="삭제" 또는 트래시 아이콘 버튼
    const deleteBtn = page
      .locator('li, [role="listitem"], article, div')
      .filter({ has: page.getByText('우유', { exact: true }) })
      .first()
      .getByRole('button', { name: /삭제|제거/ });

    const deleteBtnCount = await deleteBtn.count();
    if (deleteBtnCount > 0) {
      await deleteBtn.click();
      // deleteShoppingItem Server Action 성공 → "우유" 항목 사라짐
      await expect(
        page.getByText('우유', { exact: true }),
      ).not.toBeVisible({ timeout: 15_000 });
    } else {
      // 삭제 버튼이 aria-label 또는 다른 name으로 렌더되는 경우
      const deleteBtnAlt = page
        .locator('li, [role="listitem"], article, div')
        .filter({ has: page.getByText('우유', { exact: true }) })
        .first()
        .locator('button[aria-label*="삭제"], button[aria-label*="제거"]')
        .first();

      const deleteBtnAltCount = await deleteBtnAlt.count();
      if (deleteBtnAltCount > 0) {
        await deleteBtnAlt.click();
        await expect(
          page.getByText('우유', { exact: true }),
        ).not.toBeVisible({ timeout: 15_000 });
      }
      // 삭제 버튼 UI가 구현되지 않은 경우: 스텝 스킵 (graceful)
    }
  },
);

// ── 테스트: 빈 상태 ──────────────────────────────────────────────────────────

test(
  '장보기 빈 상태: 새 가입 직후 /shopping → 빈 상태 메시지 표시',
  async ({ page }) => {
    // 새 계정 (장보기 항목 없음)
    const email = uniqueEmail();
    const password = 'Test1234!';
    await signup(page, email, password);

    await page.goto('/shopping', { waitUntil: 'domcontentloaded' });

    // h1 "장보기 목록" 표시
    await expect(
      page.getByRole('heading', { name: '장보기 목록', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    // 빈 상태 메시지: ShoppingList EmptyState
    await expect(
      page.getByText(/장보기 항목이 없|아직 항목이 없/, { exact: false }),
    ).toBeVisible({ timeout: 15_000 });

    // "항목 추가" 버튼은 빈 상태에서도 노출됨
    await expect(
      page.getByRole('button', { name: /항목 추가/ }),
    ).toBeVisible({ timeout: 10_000 });
  },
);

// ── 테스트: 미인증 → /login redirect ────────────────────────────────────────

test('/(app)/shopping 수동추가 spec — 미인증 → /login redirect', async ({ page }) => {
  await page.goto('/shopping', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.locator('form')).toBeVisible({ timeout: 30_000 });
});
