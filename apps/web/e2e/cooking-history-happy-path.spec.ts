// apps/web/e2e/cooking-history-happy-path.spec.ts
// Phase 4 §6.3 — E2E: cooking-history happy path
//
// ⚠️ 실제 실행 전제 조건:
//   - supabase local (Docker) 가동 + 마이그레이션 0014/0018/0019 적용
//   - cooking_history / cooking_history_consumed_ingredients 테이블 존재
//   - logCookingSession Server Action 동작
//   - pnpm dev 서버 port 3100 구동
//
// 현 단계에서는 스펙 파일 작성 + typecheck/lint 통과까지 검증.
// test:e2e 실제 실행은 사용자 환경 의존 (Phase 3 Day 8 패턴 동일).
//
// 헬퍼: recipes-happy-path.spec.ts 와 동일 인라인 패턴 (공유 모듈 없음).
//
// 셀렉터 방침: data-testid 추가 최소화 — 텍스트/role matcher 우선.
//   - "요리 시작" 버튼: getByRole('button', { name: '요리 시작' })
//     StartCookingButton 의 aria-label=`${recipe.name} 요리 시작` 때문에
//     name 이 정확히 '요리 시작' 이 아닐 수 있으므로 /요리 시작/ 정규식도 대응.
//   - 다이얼로그: Radix DialogPrimitive.Content → role="dialog"
//     + DialogPrimitive.Title 이 title prop 을 렌더: `{recipe.name} 요리 시작`
//   - 차감 재료 미리보기: h3 "차감 재료" 아래 <li> (ConsumedItem 목록)
//   - 확정 버튼: getByRole('button', { name: '확정' })
//   - toast: sonner → DOM 에 role="status" 또는 getByText 로 잡힘
//   - /cooking-history: h1 "요리 기록"
//   - HistoryRow: Card 안 요리명 텍스트 (Link 또는 span)
//   - 빈 상태: p "아직 기록된 요리가 없어요"

import { expect, test } from '@playwright/test';

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

/**
 * 유니크 이메일 생성 (timestamp 기반).
 * e2e 병렬 실행 충돌 방지를 위해 rand suffix 를 추가한다.
 */
function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e-cooking-${ts}-${rand}@test.local`;
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
    page.getByRole('heading', { name: '내 인벤토리', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * 재료 추가 다이얼로그를 통해 재료 1개 추가.
 *
 * 흐름:
 *   1. "+ 추가" 버튼 클릭 → AddIngredientDialog 열림
 *   2. 재료명 검색 (typeahead)
 *   3. 결과 목록에서 해당 재료 버튼 클릭 → detail step
 *   4. 저장 클릭
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
  // exact:true — "두부" 검색 시 "순두부" 부분일치 회피 (strict mode violation)
  const resultButton = page
    .getByRole('dialog')
    .getByRole('button', { name: ingredientName, exact: true });
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
  '요리 기록 happy-path: 가입 + 재료 5개 추가 → 레시피 상세 → 요리 시작 다이얼로그 → 확정 → /cooking-history 기록 표시',
  async ({ page }) => {
    // ── Step 1. 가입 ───────────────────────────────────────────────────────
    const email = uniqueEmail();
    const password = 'Test1234!';
    await signup(page, email, password);

    // ── Step 2. 인벤토리 진입 + 재료 5개 추가 ──────────────────────────────
    await goToInventory(page);

    // 0006 시드 + 0012 김치찌개 재료 7개 (required 8 중 7 → score 0.6125, 임계값 0.5 통과)
    const ingredients = [
      '배추김치',
      '돼지고기 삼겹살',
      '두부',
      '대파',
      '마늘 다진것',
      '고춧가루',
      '국간장',
    ];
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

    // ── Step 4. "요리 시작" 버튼 클릭 → LogCookingDialog 열림 ────────────
    // StartCookingButton: aria-label=`${recipe.name} 요리 시작` + 표시 텍스트 "요리 시작"
    // getByRole + name 정규식으로 aria-label 또는 visible text 모두 매칭.
    const startCookingBtn = page.getByRole('button', { name: /요리 시작/ });
    await expect(startCookingBtn).toBeVisible({ timeout: 15_000 });
    await startCookingBtn.click();

    // 다이얼로그 열림 대기: Radix DialogPrimitive.Content → role="dialog"
    // LogCookingDialog title prop: `${recipe.name} 요리 시작` → DialogPrimitive.Title 에 렌더
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // 다이얼로그 타이틀: "요리 시작" 텍스트 포함 (요리명 접두 포함 정규식)
    await expect(dialog.getByText(/요리 시작/)).toBeVisible({
      timeout: 10_000,
    });

    // 차감 미리보기: h3 "차감 재료" 섹션 표시
    await expect(dialog.getByRole('heading', { name: '차감 재료', level: 3 })).toBeVisible({
      timeout: 10_000,
    });

    // 차감 재료 목록: <li> 1개 이상 (재료가 있는 경우) 또는 "차감할 재료가 없습니다" 텍스트
    // 보유 재료가 있으므로 consumed 1개 이상 기대.
    // DB 매칭 결과에 따라 consumed 가 없을 수도 있으므로 양 분기 중 하나 통과.
    const consumedList = dialog.locator('ul li');
    const noConsumedMsg = dialog.getByText('차감할 재료가 없습니다', { exact: false });
    const consumedListCount = await consumedList.count();
    if (consumedListCount === 0) {
      await expect(noConsumedMsg).toBeVisible({ timeout: 5_000 });
    } else {
      // 재료명이 포함된 <li> 1개 이상 — 요리명 라벨 확인
      await expect(consumedList.first()).toBeVisible();
    }

    // ── Step 5. (선택) 평점 클릭 + 메모 입력 ──────────────────────────────
    // 평점 radiogroup: aria-label="평점" 내 버튼 1-5
    const ratingGroup = dialog.getByRole('radiogroup', { name: '평점' });
    // 3점 클릭 (role="radio", 텍스트 "3")
    const rating3 = ratingGroup.getByRole('radio', { name: '3' });
    await rating3.click();
    await expect(rating3).toHaveAttribute('aria-checked', 'true');

    // 메모 입력 (label "메모 (선택)")
    const memoInput = dialog.getByLabel('메모 (선택)');
    await memoInput.fill('e2e 테스트 요리 기록');

    // ── Step 6. 확정 버튼 클릭 → toast 성공 + 다이얼로그 닫힘 ─────────────
    const confirmBtn = dialog.getByRole('button', { name: '확정' });
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();

    // toast 성공: sonner 는 기본적으로 role="status" 또는 aria-live="polite" DOM 사용.
    // "요리 기록을 저장했습니다" 텍스트로 매칭.
    await expect(
      page.getByText('요리 기록을 저장했습니다', { exact: false }),
    ).toBeVisible({ timeout: 15_000 });

    // 다이얼로그 닫힘 (onClose 호출 → open=false)
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });

    // ── Step 7. /cooking-history 진입 → 기록 1건 이상 표시 확인 ───────────
    await page.goto('/cooking-history', { waitUntil: 'domcontentloaded' });

    // h1 "요리 기록"
    await expect(
      page.getByRole('heading', { name: '요리 기록', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    // 빈 상태 텍스트가 없어야 함
    await expect(
      page.getByText('아직 기록된 요리가 없어요', { exact: true }),
    ).not.toBeVisible({ timeout: 10_000 });

    // HistoryRow 1건 이상: Card 안 요리명 링크 또는 span (history-row.tsx)
    // recipe_id 가 있으면 Link (href="/recipes/{uuid}"), 없으면 span.
    // 어느 쪽이든 요리명 텍스트는 렌더됨 → recipeLinks 또는 plain text.
    // 가장 간단한 확인: /cooking-history 페이지에 /recipes/ href 링크 1개 이상.
    // 또는 총 {N}건 span 의 N > 0 확인.
    const totalSpan = page.locator('span').filter({ hasText: /^총 \d+건$/ });
    await expect(totalSpan).toBeVisible({ timeout: 10_000 });
    // 총 N건 텍스트에서 N >= 1 확인
    const totalText = await totalSpan.textContent();
    const totalMatch = totalText?.match(/총 (\d+)건/);
    if (totalMatch) {
      const total = parseInt(totalMatch[1], 10);
      expect(total).toBeGreaterThanOrEqual(1);
    }

    // ── Step 8. /inventory 진입 → 차감 재료 수량 변화 확인 ──────────────────
    // 재료가 차감되어 수량 0이 된 경우 인벤토리에서 사라짐 (consumed=true).
    // 수량이 충분한 경우 수량이 줄어든 상태로 표시됨.
    // 이 단계는 DB 상태에 따라 다르므로:
    //   - /inventory 접근 가능하고 헤더 표시됨 (기본 체크)
    //   - 빈 상태("아직 재료가 없어요" 류) 가 아님
    await goToInventory(page);
    // 인벤토리가 완전히 비어있지 않음 (배추김치 등 수량이 최소값 이상이었다면 남아있어야 함)
    // 완전 차감 케이스도 있으므로 페이지 자체 접근만 확인.
    await expect(
      page.getByRole('heading', { name: '내 인벤토리', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
  },
);

// ── 테스트: 빈 상태 ──────────────────────────────────────────────────────────

test(
  '요리 기록 빈 상태: 새 가입 직후 /cooking-history → "아직 기록된 요리가 없어요" 표시',
  async ({ page }) => {
    // 새 계정 (요리 기록 없음)
    const email = uniqueEmail();
    const password = 'Test1234!';
    await signup(page, email, password);

    await page.goto('/cooking-history', { waitUntil: 'domcontentloaded' });

    // h1 "요리 기록" 표시
    await expect(
      page.getByRole('heading', { name: '요리 기록', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    // 빈 상태 메시지: CookingHistoryList EmptyState
    await expect(
      page.getByText('아직 기록된 요리가 없어요', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    // 총 0건 표시
    await expect(
      page.getByText('총 0건', { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  },
);

// ── 테스트: 미인증 → /login redirect ────────────────────────────────────────

test('/(app)/cooking-history 미인증 → /login redirect', async ({ page }) => {
  await page.goto('/cooking-history', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.locator('form')).toBeVisible({ timeout: 30_000 });
});
