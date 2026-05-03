// apps/web/e2e/recipes-happy-path.spec.ts
// Phase 3 §6.3 — E2E: recipes happy path
//
// ⚠️ 실제 실행 전제 조건:
//   - supabase local (Docker) 가동 + 마이그레이션 0011/0012/0013 적용
//   - recommend_recipes RPC 존재
//   - pnpm dev 서버 port 3100 구동
//
// 현 단계에서는 스펙 파일 작성 + typecheck/lint 통과까지 검증.
// test:e2e 실제 실행은 사용자 환경 의존 (Phase 1/2 §6.3 deferred 패턴 동일).
//
// 헬퍼 재사용 결정: 기존 e2e 파일 (auth.spec.ts, inventory-happy-path.spec.ts)은
// 각자 단일 케이스로 헬퍼가 없어 인라인으로 구현.
//
// 셀렉터 방침: data-testid 추가 최소화 — 텍스트/role matcher 우선.
//   - 섹션 헤더: text matcher ("지금 만들 수 있는 요리", "재료 1-2개 부족", "재료가 부족해요")
//   - RecipeCard: <article> 내 Link+Card 구조 → role="link" + heading 텍스트로 충분
//   - 레시피 상세: h1 (recipe.name), h2 텍스트 ("재료", "조리법")
//   - 보유/부족 섹션: h3 텍스트 ("보유 재료", "필수 부족", "선택 부족")

import { expect, test } from '@playwright/test';

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

/**
 * 유니크 이메일 생성 (timestamp 기반).
 * e2e 병렬 실행 충돌 방지를 위해 uuid suffix를 추가한다.
 */
function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e-recipe-${ts}-${rand}@test.local`;
}

/**
 * 회원가입 → 세션 획득.
 * Supabase local dev 환경: email confirm OFF 가정 (signUp 즉시 session 발급).
 * confirm이 ON인 경우 signIn 후 /account redirect가 발생하지 않아 테스트가 실패한다.
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
  // 인벤토리 페이지 헤더 확인 (회귀 방지 — 인증 통과 여부 가드)
  await expect(
    page.getByRole('heading', { name: '냉장고 재고', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * 재료 추가 다이얼로그를 통해 재료 1개 추가.
 *
 * 흐름:
 *   1. "+ 추가" 버튼 클릭 → AddIngredientDialog 열림
 *   2. 재료명 검색 (typeahead)
 *   3. 결과 목록에서 첫 번째 항목 클릭 → detail step
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
  const resultButton = page
    .getByRole('dialog')
    .getByRole('button', { name: ingredientName });
  await expect(resultButton).toBeVisible({ timeout: 10_000 });
  await resultButton.click();

  // detail step: "저장" 버튼
  await page.getByRole('button', { name: '저장' }).click();

  // 다이얼로그 닫힘 대기 (토스트 표시 후 onOpenChange(false))
  await expect(
    page.getByRole('dialog').getByText('식재료 추가'),
  ).not.toBeVisible({ timeout: 10_000 });
}

// ── 테스트: 재료 5개 → 레시피 추천 → 상세 ──────────────────────────────────

test(
  '레시피 happy-path: 가입 + 재료 5개 추가 → /recipes 진입 → 카드 클릭 → 상세 확인',
  async ({ page }) => {
    // ── Step 1. 가입 ───────────────────────────────────────────────────────
    const email = uniqueEmail();
    const password = 'Test1234!';
    await signup(page, email, password);

    // ── Step 2. 인벤토리 진입 + 재료 5개 추가 (김치찌개 매칭 재료 세트) ────
    await goToInventory(page);

    // 0006 시드 기반 김치찌개 재료 5개
    const ingredients = [
      '배추김치',
      '돼지고기 삼겹살',
      '두부',
      '대파',
      '마늘 다진것',
    ];
    for (const name of ingredients) {
      await addIngredient(page, name);
    }

    // ── Step 3. /recipes 진입 ─────────────────────────────────────────────
    await page.goto('/recipes', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: '레시피 추천', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    // 섹션 헤더: "지금 만들 수 있는 요리" 또는 "재료 1-2개 부족" 중 하나 이상 표시.
    // 재료 5개로 정확히 어느 섹션에 매칭되는지는 DB 데이터에 따라 다르므로
    // 두 헤더 중 하나라도 보이면 통과.
    const readySectionHeader = page.getByRole('heading', {
      name: '지금 만들 수 있는 요리',
      level: 2,
    });
    const partialSectionHeader = page.getByRole('heading', {
      name: '재료 1-2개 부족',
      level: 2,
    });

    // 어느 한 섹션이라도 있으면 통과 (둘 다 없으면 실패)
    await expect(
      readySectionHeader.or(partialSectionHeader),
    ).toBeVisible({ timeout: 30_000 });

    // 추천 카드 1개 이상: RecipeCard는 Link > Card 구조로 레시피명 텍스트를 포함한다.
    // role="link" 중 href가 /recipes/{uuid} 패턴인 것 1개 이상 확인.
    const recipeLinks = page.locator('a[href^="/recipes/"]');
    await expect(recipeLinks.first()).toBeVisible({ timeout: 30_000 });

    // ── Step 4. 첫 번째 카드 클릭 → 상세 페이지 진입 ───────────────────────
    await recipeLinks.first().click();

    // URL: /recipes/{uuid}
    await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}/, {
      timeout: 30_000,
    });

    // 레시피 이름 h1 표시
    const recipeNameH1 = page.locator('article h1');
    await expect(recipeNameH1).toBeVisible({ timeout: 30_000 });

    // 메타 배지: cook_minutes/difficulty/servings — recipe-detail.tsx <Badge> 렌더
    // difficulty는 반드시 표시됨 (null 가드 없음). "쉬움" / "보통" / "어려움" 중 하나.
    const difficultyBadge = page
      .locator('article header')
      .getByText(/쉬움|보통|어려움/);
    await expect(difficultyBadge.first()).toBeVisible({ timeout: 15_000 });

    // IngredientMatchBreakdown 섹션 헤더 3개 (h3)
    const haveSection = page.getByRole('heading', {
      name: '보유 재료',
      level: 3,
    });
    const requiredMissingSection = page.getByRole('heading', {
      name: '필수 부족',
      level: 3,
    });
    const optionalMissingSection = page.getByRole('heading', {
      name: '선택 부족',
      level: 3,
    });

    await expect(haveSection).toBeVisible({ timeout: 15_000 });
    await expect(requiredMissingSection).toBeVisible({ timeout: 15_000 });
    await expect(optionalMissingSection).toBeVisible({ timeout: 15_000 });

    // 조리법 섹션 h2 (instructions_md 있을 때만 렌더 — 시드 레시피는 있다고 가정)
    // 없으면 스킵되므로 soft check: 있으면 보여야 함, 없으면 없어도 무방.
    const instructionsSection = page.getByRole('heading', {
      name: '조리법',
      level: 2,
    });
    // count()가 0이면 시드 레시피에 instructions_md가 없는 것 → graceful
    const instructionsCount = await instructionsSection.count();
    if (instructionsCount > 0) {
      await expect(instructionsSection).toBeVisible({ timeout: 10_000 });
    }

    // ── Step 5. YouTube 처리: cache miss / API key 없음 환경에서 graceful ──
    // YouTube embed 섹션은 youtubeVideoId가 있을 때만 렌더 (recipe-detail.tsx).
    // cache miss / YOUTUBE_API_KEY 미설정 → youtubeVideoId undefined → 섹션 없음.
    // 섹션이 있더라도 thumbnail + play 버튼 placeholder가 표시되어야 하고
    // 페이지가 깨지면 안 된다 (article 존재 = 기본 확인).
    await expect(page.locator('article')).toBeVisible({ timeout: 10_000 });

    // YouTube 섹션이 있을 경우 → iframe 또는 placeholder(thumbnail img) 표시 확인
    const youtubeSection = page.getByRole('heading', {
      name: '관련 영상',
      level: 2,
    });
    const youtubeSectionCount = await youtubeSection.count();
    if (youtubeSectionCount > 0) {
      // 섹션이 있으면 내부에 img(thumbnail) 또는 iframe이 있어야 한다
      const youtubeContainer = page.locator(
        'section:has(h2:text("관련 영상"))',
      );
      const hasMedia = await youtubeContainer
        .locator('img, iframe')
        .count();
      expect(hasMedia).toBeGreaterThan(0);
    }
  },
);

// ── 테스트: 재료 0개 사용자 → empty state ───────────────────────────────────

test(
  '레시피 empty state: 새 가입 + 재료 미추가 → /recipes 진입 → "재료가 부족해요" 안내',
  async ({ page }) => {
    // 새 계정 (인벤토리 비어 있음)
    const email = uniqueEmail();
    const password = 'Test1234!';
    await signup(page, email, password);

    // /recipes 직접 진입
    await page.goto('/recipes', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: '레시피 추천', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    // RecipeRecommendations EmptyState: "재료가 부족해요" 텍스트
    // EmptyState 컴포넌트는 <p> 태그 사용 (heading 아님) → getByText 사용
    await expect(
      page.getByText('재료가 부족해요', { exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // 인벤토리 이동 링크 표시 확인 (EmptyState → Link /inventory)
    await expect(
      page.getByRole('link', { name: '인벤토리로 이동' }),
    ).toBeVisible({ timeout: 10_000 });
  },
);

// ── 테스트: 미인증 → /login redirect ────────────────────────────────────────

test('/(app)/recipes 미인증 → /login redirect', async ({ page }) => {
  await page.goto('/recipes', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.locator('form')).toBeVisible({ timeout: 30_000 });
});
