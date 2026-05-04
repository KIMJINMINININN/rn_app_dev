# Changelog

본 프로젝트의 모든 주요 변경 사항은 phase 단위로 본 파일에 기록한다. 형식: [Keep a Changelog](https://keepachangelog.com/) 약식.

## [Unreleased] (Phase 5) — 장보기 브릿지 (진행 중, 2026-05-04~)

### Day 0 — Pre-flight URL 검증 (chrome-devtools MCP 헤드리스)

| 사이트 | 결과 | URL 패턴 | env 디폴트 |
|---|---|---|---|
| 쿠팡 | ⚠️ 헤드리스에서 anti-bot 차단 (`{"rCode":"RET9999"}`). URL 패턴은 표준 검색 endpoint이므로 실 사용자 브라우저에서는 정상 동작 가정 | `https://www.coupang.com/np/search?q={encoded}` | `NEXT_PUBLIC_COUPANG_ENABLED=true` |
| 마켓컬리 | ✓ 검증 완료. "양파" 90 상품 / "삼겹살" 96 상품 노출. 자동 redirect `&page=1` 추가됨 | `https://www.kurly.com/search?sword={encoded}` | `NEXT_PUBLIC_KURLY_ENABLED=true` |
| B마트 | ✗ 웹 검색 미지원. `https://www.baemin.com/search?query=양파` → 404. 본질적으로 앱 전용 서비스 (위치 기반) | (없음) | `NEXT_PUBLIC_BAEMIN_ENABLED=false` |

→ `apps/web/.env.local` + `apps/web/.env.example`에 토글 3개 추가. `buildCommerceUrl.ts`는 토글 false 시 빈 문자열 반환 → UI에서 해당 deeplink 버튼 숨김.

→ 사용자 액션: 실 브라우저(데스크톱/모바일)에서 쿠팡 URL 1회 직접 확인 권장. 차단되면 `NEXT_PUBLIC_COUPANG_ENABLED=false`로 토글.

---

## v0.4.0 (Phase 4) — 요리 히스토리 + 듀얼 추천 (2026-05-04)

> Phase 4 (Day 1-7) 통합 마일스톤. 7 commits 반영. PRD §2.4 핵심 가치 ("재료 클릭 → 과거/신규 레시피 병렬 표시") 충족.

### Phase 4 종합
- DB: 0014 (cooking_history + cooking_history_consumed_ingredients + RLS 4정책 + 인덱스 2) + 0015a (recommend_for_ingredient RPC, sql stable, past+new 듀얼 jsonb) + 0015b (log_cooking_session plpgsql 원자 트랜잭션 RPC, security invoker, FOR UPDATE 락, expires_at asc 우선 차감)
- entities/cooking-history 슬라이스: model/types.ts (CookingHistoryRow / CookingHistoryConsumedRow / CookingSession), ui/history-row.tsx (Server Component, 평점/메모/consumed 재료 표시)
- features 2종: log-cooking-session (Server Action + Dialog + build-consumed-payload + 9 단위 테스트), dual-recommendation (TanStack hook + DualList Server Component)
- widgets 2종: cooking-history-list (Server Component, 빈 상태), recipe-detail에 StartCookingButton client wrapper 통합 (RSC 표면 보존)
- pages: /(app)/cooking-history (RSC, 4 sequential fetch + 50 LIMIT), /(app)/inventory/[ingredientId] (RSC, recommend_for_ingredient 직접 호출 + ingredient_master 이름 + DualList)
- entities/ingredient/ui/ingredient-row.tsx 수정: Link 부분 wrap (이름+수량만, button-in-anchor invalid HTML 회피) → /inventory/[ingredient_master_id]

### log_cooking_session 원자성 (★ 핵심)
- auth.uid() ≠ p_user → raise exception 'unauthorized: auth.uid() mismatch' (자동 rollback, Server Action 한국어 변환)
- cooking_history INSERT + 각 consumed item에 대해 cooking_history_consumed_ingredients INSERT + user_ingredients FOR UPDATE 부분 차감 (expires_at asc nulls last, created_at asc — 임박 재료 우선)
- 분기: row.qty ≤ remaining → quantity=0+consumed=true (전체 소진), 그 외 → quantity = quantity - remaining (부분 차감)
- 0009 트리거 double-write idempotent: 트리거가 quantity=0 시 consumed=true 자동 처리, RPC도 명시 update → 동일 값 set 안전

### recommend_for_ingredient (★ 핵심)
- past CTE: cooking_history join recipe_master + recipe_ingredients (master_id 필터) → max(cooked_at) desc
- new_candidates CTE: recommend_recipes(p_user, 0.5, 100) RPC (Phase 3) join recipe_ingredients + master_id + cooking_history NOT EXISTS → score desc, cook_minutes asc
- 빈 결과 graceful coalesce(jsonb_agg, '[]'::jsonb)

### 가시적 변화 (사용자 관점)
- 레시피 상세에 "요리 시작" CTA 버튼 → 다이얼로그 (수량 차감 미리보기 + 평점 1-5 + 메모) → 확정 → 기록 + 인벤토리 자동 차감
- /(app)/cooking-history 페이지 — 과거 요리 기록 리스트 (cooked_at desc, 50 LIMIT)
- 인벤토리 재료 클릭 → /(app)/inventory/[ingredientId] — 좌(과거 요리) / 우(신규 추천) 듀얼 레시피 그리드
- 빈 상태 처리 (요리 기록 없음 / 추천 없음)

### Spec deviations
- 0014 RLS DDL을 §2.2 SOURCE 블록 안으로 통합 (Phase 3 0011 패턴 일관 — phase-4.md + db-schema.md 동시 spec patch)
- DB types 미재생성 (cooking_history/cooking_history_consumed_ingredients/log_cooking_session/recommend_for_ingredient 4개 RPC) — 사용자 db:push 후 db:types 갱신 가능
- BottomNav "히스토리" 탭 그대로 disabled (phase-4.md 명시 없음 — 진입 동선은 후속 PRD 결정)
- cooking-history page 4 sequential fetch — Phase 5+ 통합 RPC 검토 (현 50 LIMIT + 인덱스 충분)

### Day 7 회귀 검증
- pnpm web typecheck → 0 errors
- pnpm web lint → 0 errors  
- pnpm web test → 9 file / 54 PASS / 1 skip (Day 4 신규 9 fixture 추가)
- pnpm web db:check-drift → matched, 0 mismatches (0014/0015a/0015b 신규 추가 후 검증)
- pnpm web build → ✓ Compiled, /cooking-history + /inventory/[ingredientId] dynamic 등록

### 사용자 환경 deferred (Phase 1+2+3 패턴 동일)
- 0014/0015a/0015b 마이그레이션 실제 DB 적용 (`pnpm web db:push --linked` 또는 db:reset)
- DB types 재생성 (cast 제거)
- §6.2 supabase local Docker → 0015b log_cooking_session 트랜잭션 통합 테스트 (rollback 시뮬레이션 + double-write idempotent 검증)
- §6.3 E2E 실행 (`pnpm web test:e2e`) — cooking-history-happy-path.spec.ts (요리 시작 → 기록 → 인벤토리 차감)
- 모바일 웹뷰 스모크 (Vercel preview + EAS build, conventions §7)

### Commits (Phase 4)
- 8070c09 Day 1 — 0014_cooking_history + RLS 4정책 + spec sync (phase-4.md/db-schema.md byte 일치)
- 0435362 Day 2 — 0015a_recommend_for_ingredient RPC (듀얼 추천)
- 36ff643 Day 3 — 0015b_log_cooking_session plpgsql 원자 트랜잭션 RPC
- e93ca05 Day 4 — features/log-cooking-session (Server Action + Dialog + util + 9 단위 테스트)
- 4eb33cf Day 5 — features/dual-recommendation + /(app)/inventory/[ingredientId] + ingredient-row 클릭 핸들러
- d564cec Day 6 — entities/cooking-history + widgets/cooking-history-list + cooking-history page + "요리 시작" 통합
- (Day 7) — E2E + 회귀 + 본 entry + tag v0.4.0

## v0.3.0 (Phase 3) — 레시피 큐레이션 + YouTube ★ 데모 가능 MVP (2026-05-04)

> Phase 3 (Day 1-10) 통합 마일스톤. 8 commits 반영. PRD §2.3 핵심 가치 ("재료 보고 메뉴 정함") 충족.

### Phase 3 종합
- DB: 0011 (recipe_master + recipe_ingredients + recipe_difficulty enum + recommend_recipes RPC + RLS) + 0012 (시드 100선 / 707 재료 매핑) + 0013 (youtube_cache + RLS read-only)
- entities/recipe 슬라이스: model/types.ts (Recommendation/RecipeMaster/RecipeIngredientRow/RecipeWithMatch/RecipeDifficulty), lib/scoring-constants.ts ★ 단일 출처 (WEIGHT_REQUIRED 0.7 / WEIGHT_OPTIONAL 0.2 / WEIGHT_URGENT 0.1 / MIN_SCORE 0.5 / SCORE_READY_THRESHOLD 0.95), lib/computeRecipeMatch.ts (TS mirror), ui 4종 (RecipeCard / MatchScore / MissingIngredientsList / RecipeYoutubeEmbed nocookie+IO)
- features 3종: list-recommendations (TanStack queryKey ['recipes','recommendations',userId] staleTime 5분), youtube-embed Route Handler (server-only, helpers 분리, env guard graceful), view-recipe-match (보유/필수 부족/선택 부족 3섹션)
- widgets 2종: recipe-recommendations (섹션 분리 readability 0.95↑ / 0.5≤s<0.95), recipe-detail (메타 + breakdown + instructions_md + YouTube)
- pages: /(app)/recipes (RSC + recommend_recipes 직접 호출) + /[id]/page.tsx (RSC + computeRecipeMatch + ingredient_master id→name Map + cache lookup-only YouTube) + loading.tsx
- BottomNav 레시피 탭 활성화 (히스토리는 Phase 4 그대로)
- 시드 큐레이션 1회용 스크립트 (apps/web/supabase/seeds/recipes_to_sql.mjs, byte-idempotent, stdlib only, validation throw)

### 매칭 공식 (★ 단일 출처)
score = 0.7 * (필수보유/필수전체) + 0.2 * (선택보유/max(선택전체,1)) + 0.1 * (임박보유/필수전체)
임계값: ≥ 0.95 "지금 만들 수 있음" / 0.5 ~ 0.95 "재료 1-2개 부족" / < 0.5 추천 제외

### 가시적 변화 (사용자 관점)
- /(app)/recipes — 보유 재료 기반 추천 레시피 그리드 (점수 ≥ 0.5, 섹션 분리)
- 카드: 이름 + score 배지(N/M) + 부족 재료 N개 + 임박 활용 배지 + 메타(cook/difficulty/servings)
- 레시피 상세: 보유/필수 부족/선택 부족 분리 + instructions_md + YouTube 임베드 (캐시 hit 시)
- BottomNav "레시피" 탭 활성

### Spec deviations
- 0011 SQL urgent 조건 `<= 2` → `between 0 and 2` 정정 (Day 4) — TS computeRecipeMatch isUrgent와 정합 + 0010 패턴 일관 (architect Day 3 minor)
- 0012 SOURCE → SOURCE-EXEMPT 마커 (auto-generated 75KB seed; 마이그레이션 자체가 SSoT, db:check-drift 제외)
- DB 타입 자동 생성 보류 (recipe_master/youtube_cache/recommend_recipes RPC) — 사용자 db:push 후 `pnpm web db:types`로 cast 제거 가능
- YouTube 서버사이드 cache lookup만 (실제 fetch는 Route Handler client-side) — quota 보호

### Day 10 회귀 검증
- pnpm web typecheck → 0 errors
- pnpm web lint → 0 errors  
- pnpm web test → 21 PASS (entities/recipe) / 1 skip (SUPABASE_LOCAL_URL conditional)
- pnpm web db:check-drift → 26/26 matched, 0 mismatches
- pnpm web build → ✓ Compiled successfully (1.5s), /recipes + /recipes/[id] dynamic 등록

### 사용자 환경 deferred (Phase 1/2 §6 패턴 동일)
- 0011/0012/0013 마이그레이션 실제 DB 적용 (`pnpm web db:push --linked` 또는 db:reset)
- §6.2 supabase local Docker + SUPABASE_LOCAL_URL → equivalence.spec RPC 정합성 (TS↔SQL score < 0.0001)
- §6.3 E2E 실행 (`pnpm web test:e2e`) — recipes-happy-path.spec.ts 3 케이스
- 모바일 웹뷰 스모크 (Vercel preview + EAS build, conventions §7)
- YouTube Data API v3 키 발급 시 Route Handler 실제 fetch 검증 (현재 graceful empty)

### Commits (Phase 3)
- 77effda Day 1-2 — 레시피 100선 큐레이션 + 0012_recipes_seed
- 60bc036 Day 3 — 0011 recommend_recipes RPC + scoring SSoT + TS mirror + 단위 테스트
- 8f3d0aa Day 4 — 0013_youtube_cache + 0011 urgent fix + TS↔SQL 동치성 테스트
- 474b9d4 Day 5 — entities/recipe/ui 4개 컴포넌트
- bc5b980 Day 6 — features/list-recommendations + youtube-embed Route Handler + view-recipe-match
- 2259367 Day 7 — pages /(app)/recipes + [id] + widgets + BottomNav 활성화 ★ 데모 MVP
- aebf509 Day 8 — E2E recipes-happy-path.spec.ts (3 케이스)
- (Day 9-10) — 본 entry 추가 + 회귀 검증 + tag v0.3.0

## v0.1.1 (Phase 2) — 인벤토리 고도화 (2026-04-30)

> Phase 2 (Day 1-7) 통합 마일스톤. 일별 세부 entry는 아래 v0.1.1-day{1..6} 참조.

### Phase 2 종합
- DB: 0009 (auto-consume 트리거) + 0010 (`get_inventory_summary` RPC) + `URGENT_THRESHOLD_DAYS=2` 단일 출처 동치성
- entities/ingredient 확장: sort.ts/test, filter.ts/test, useInventorySummary, useIngredientCategories, IngredientWithMaster Pick 확장
- features 5종: inventory-summary (Day 3), inventory-filter (Day 3-4 sort/category), move-ingredient (Day 5), consume-ingredient 확장 (Day 6 partial), manage-storage (Day 6 CRUD)
- widgets/inventory-list 통합 (Day 6): Summary + SortToggle + CategoryFilter + Move + Consume + categoryByMasterId Map
- Zustand `useFilterStore` (sort + categoryIds + storageId, 인메모리 only)
- conventions §17 queryKey + §18 Zustand vs Query + §3 디자인 토큰 + §19 단일 출처 상수 모두 준수
- FSD 준수 (Day 3 violation fix Option A 적용)

### 가시적 변화 (사용자 관점)
- 인벤토리 헤더에 (전체 N개 / 임박 M개 / 만료 K개) 카운트 배지
- 정렬 토글 (임박순/최근/이름)
- 카테고리 multi-select 필터
- 보관 장소 간 이동 빠른 메뉴 (native select)
- 부분 소진 (25/50/75/100% quick buttons) → 0 도달 시 자동 consumed (0009 트리거)
- 사용자 정의 보관 장소 추가/이름변경/삭제 (kind='custom')

### Day 7 회귀 검증
- typecheck / lint / drift 0 errors
- vitest 24 PASS
- E2E 3 PASS (auth + inventory-happy-path + inventory-advanced)
- 토큰 grep 0 forbidden

### 사용자 환경 액션 (Phase 2 종료 후 별도 처리)
1. 0009 트리거 manual SQL 검증 (insert + quantity=0 update → consumed=true 자동) — Phase 1 액션 1과 묶음 처리
2. RLS 정책 추가 마이그레이션 (storage_locations INSERT — addStorage admin 우회 제거 위해, Phase 3+ 별도)
3. §6.2 통합 테스트 (Vitest + supabase local, Docker)
4. §6.3 E2E happy-path 본문 (가입 → 추가 → 정렬 → 필터 → 이동 → 부분 소진) — 인증 fixture 셋업 후
5. (선택) `git tag v0.1.1`

### Spec deviations (Phase 2 종합)
- Day 3 FSD 위반 (entities → features 역방향) → Option A fix: `IngredientWithMaster`를 entities SSoT, `useInventorySummary`를 entities/lib로 이동
- addStorage admin client 우회 — 0003 RLS INSERT 정책 부재. Phase 3+ RLS 정책 마이그레이션으로 정리
- Day 6 nit cleanup: manage-storage-sheet의 dead `['storage-locations']` invalidate 제거 (revalidatePath SSR로 갱신)

## v0.1.1-day6 (Phase 2 Day 6) — ConsumeIngredientSheet (부분 소진) + manage-storage CRUD + widgets 통합 (2026-04-30)

### Added
- `features/consume-ingredient/ui/consume-ingredient-sheet.tsx` — `'use client'` Dialog (25/50/75/100% quick buttons, currentQuantity 비례 차감, 'use client')
- `features/manage-storage/api/manageStorage.ts` — `addStorage` / `renameStorage` / `deleteStorage` Server Actions (zod 검증, addStorage는 admin client 우회 — 0003 RLS INSERT 정책 미존재 회피, deleteStorage는 user_ingredients 비어있어야 명시 가드)
- `features/manage-storage/ui/manage-storage-sheet.tsx` — `'use client'` Dialog (추가/이름변경/삭제, kind='custom', window.confirm)

### Changed
- `features/consume-ingredient/api/consumeIngredient.ts` — 시그니처 확장 (BREAKING): `{ id }` → `{ id, newQuantity }`. UPDATE quantity (0 도달 시 0009 트리거가 consumed=true 자동 마킹)
- `entities/ingredient/model/types.ts` — `IngredientWithMaster` master Pick 확장 (`'name'` → `'name' | 'category_id'`)
- `features/list-inventory/lib/useInventoryList.ts` — select 보강 (`ingredient_master(name, category_id)`)
- `widgets/inventory-list/ui/inventory-list.tsx` — InventorySummaryHeader + SortToggle + CategoryFilter + applyFilters/applySort 파이프라인 + MoveIngredientButton 인라인 + ConsumeIngredientSheet 통합 (categoryByMasterId Map memoize)
- `widgets/inventory-list/ui/inventory-actions.tsx` — ManageStorageSheet 트리거 추가 (보관 장소 버튼)

### Verified
- typecheck/lint/drift 0 errors
- vitest 24 PASS 회귀
- 토큰 grep 0 forbidden

## v0.1.1-day5 (Phase 2 Day 5) — features/move-ingredient (Server Action + UI) (2026-04-30)

### Added
- `features/move-ingredient/api/moveIngredient.ts` — `'use server'` Action, zod 검증, 새 storage 본인 소유 명시 가드 (storage_locations.user_id check) + RLS-respecting UPDATE `storage_location_id`, `Result<UserIngredient, string>` 반환, `revalidatePath('/inventory')`
- `features/move-ingredient/ui/move-ingredient-button.tsx` — `'use client'` native select (storageLocations 옵션) + useMutation + invalidate `['ingredients']` + `['inventory-summary']` + Toast 피드백

### Verified
- typecheck/lint/drift 0 errors
- vitest 24 PASS 회귀
- 토큰 grep 0 forbidden

## v0.1.1-day4 (Phase 2 Day 4) — 카테고리/storage 필터 + 카테고리 query (2026-04-30)

### Added
- `entities/ingredient/lib/filter.ts` — `filterByStorage` / `filterByCategories` / `applyFilters` (categoryByMasterId Map 인자로 N+1 회피)
- `entities/ingredient/lib/filter.test.ts` — 5 단위 테스트 (storage/categories/combined)
- `entities/ingredient/lib/useIngredientCategories.ts` — useQuery hook (queryKey `['ingredient-categories']`, 1시간 staleTime — conventions §17.2 master cache)
- `features/inventory-filter/ui/category-filter.tsx` — `'use client'` 멀티 선택 칩 UI (icon + name, active=primary-50/border-primary-200)

### Verified
- typecheck/lint/drift 0 errors
- vitest 24 PASS (Phase 1 9 + Day 2 6 + Day 3 4 + Day 4 5)
- 토큰 grep 0 forbidden

## v0.1.1-day3 (Phase 2 Day 3) — InventorySummaryHeader + sort + Zustand filter store (2026-04-30)

### Added
- `entities/ingredient/lib/sort.ts` — 3 정렬 함수 (sortByExpiring / sortByRecent / sortByName) + applySort 디스패처. 한국어 `localeCompare`. expires_at null 마지막 처리.
- `entities/ingredient/lib/sort.test.ts` — 4 단위 테스트 (3 모드 + 디스패치, 양파/대파/쌀 fixture)
- `features/inventory-summary/lib/useInventorySummary.ts` — useQuery hook (queryKey `['inventory-summary']`, 30s staleTime, `get_inventory_summary` RPC 호출, InventorySummary 타입 export)
- `entities/ingredient/ui/inventory-summary-header.tsx` — `'use client'` header (Badge tone default/warning/danger + Skeleton loading)
- `features/inventory-filter/lib/use-filter-store.ts` — Zustand store (sort + categoryIds + storageId, 인메모리 only — phase-2.md §1.5 결정, no localStorage persist)
- `features/inventory-filter/ui/sort-toggle.tsx` — 3-option 토글 UI (임박순/최근/이름)

### Verified
- typecheck / lint / drift 0 errors
- vitest 19 PASS (Phase 1 9 + Day 2 동치성 6 + Day 3 sort 4)
- 토큰 grep 0 forbidden

## v0.1.1-day2 (Phase 2 Day 2) — 0010 인벤토리 요약 RPC + D-Day 동치성 검증 (2026-04-30)

### Added
- `0010_dashboard_stats_function.sql` — `get_inventory_summary(p_user uuid)` RPC (returns total / expiring_soon / expired). `consumed=false + quantity > 0` 필터. expiring_soon = `expires_at - current_date BETWEEN 0 AND 2` (URGENT_THRESHOLD_DAYS=2 단일 출처 반영). security invoker. authenticated grant.
- `entities/ingredient/lib/computeDDay.equivalence.test.ts` — SQL 분류식 ↔ TS `computeDDay` bucket 동치성 6 fixture (D-0/-1/-2/-3 + 만료 -1/-3)

### Changed
- `apps/web/src/shared/api/supabase/types.ts` 재생성 — `Database['public']['Functions']['get_inventory_summary']` 추가

### Verified
- `pnpm web db:push` 0010 원격 적용 성공
- `pnpm web db:types` 갱신 성공
- `pnpm web db:check-drift` drift 0
- typecheck / lint 0 errors
- vitest 15 PASS (Phase 1 9 + Phase 2 동치성 6)

## v0.1.1-day1 (Phase 2 Day 1) — 0009 부분 소진 트리거 + types 갱신 (2026-04-30)

### Added
- `0009_user_ingredient_partial_consume.sql` — `user_ingredients.original_quantity` 컬럼 추가 (구매 당시 수량 보존, idempotent `add column if not exists` + 기존 row backfill `set original_quantity = quantity`) + `user_ingredients_quantity_nonneg` check constraint (idempotent DO 블록) + `user_ingredients_auto_consume()` 트리거 (BEFORE UPDATE OF quantity — `quantity = 0` 도달 시 `consumed = true` 자동 마킹, security definer search_path 명시)

### Changed
- `apps/web/src/shared/api/supabase/types.ts` 재생성 (`pnpm web db:types`) — `user_ingredients` Row/Insert/Update에 `original_quantity: number | null` 추가

### Verified
- `pnpm web db:push` 성공 (0009 원격 적용, 0008b는 console-applied 인식)
- `pnpm web db:types` 성공
- `pnpm web db:check-drift` drift 0
- typecheck / lint 0 errors

### Pending (사용자 환경 액션)
- 트리거 동작 manual SQL 검증 (insert + `quantity = 0` update → `consumed = true` 자동 확인) — Day 7 회귀 또는 별도 시점

### Architect 결정 적용 (phase-2.md §1.5)
- 0009 트리거 + Phase 4 `log_cooking_session()` 명시적 update 둘 다 유지 (idempotent double-write OK)
- `consumed_at` 컬럼 미도입 (plan 어디서도 read 안 함, dead column 회피)

## v0.1.0 (Phase 1) — 인벤토리 CRUD ★ MVP 단위 (2026-04-30)

> Phase 1 (Day 1-7) 통합 마일스톤. 일별 세부 entry는 아래 v0.1.0-day{1..6} 참조.

### Phase 1 종합
- DB 스키마: 0003-0008b 마이그레이션 7개 (storage_locations + storage_kind enum, ingredient_categories + 글로벌 시드 12, ingredient_master + gin_trgm_ops 인덱스, 글로벌 시드 154 row, user_ingredients + view + RLS, handle_new_user 교체, search_ingredient_masters RPC)
- `entities/ingredient`: 7 파일 (types/computeDDay/dday-thresholds + UI 3종) + 8 fixture 단위 테스트
- `features`: add-ingredient (Server Action + Dialog + typeahead, Day 4), list/delete/consume (Day 5)
- `widgets/inventory-list` (Day 5)
- `pages/(app)/inventory`: RSC + loading.tsx (Day 5/6)
- E2E auth-guard 회귀 (Day 6)
- 디자인 토큰 100% (zinc/dark/rounded-md 0건)
- conventions §1/§3/§5/§10/§17 모두 준수

### Day 7 회귀 검증
- typecheck / lint / drift 0 errors
- vitest 9 PASS (Phase 0b 1 + Phase 1 8)
- E2E 2 PASS (auth + inventory-happy-path)
- 토큰 grep 0 forbidden

### MVP 출시 가능성
가입 → 식재료 추가/조회/삭제/소진 → D-Day 표시까지 동작. ★ 본 phase 단독 출시 가능.

### 사용자 환경 액션 (Phase 1 종료 후 별도 처리)
1. **0008b RPC 콘솔 적용** — Supabase 콘솔 → SQL Editor에서 `0008b_search_ingredient_masters.sql` 본문 직접 실행 → `pnpm web db:types` 재실행 (Day 4 typeahead 런타임 활성)
2. **모바일 스모크** (phase-1.md §11) — Vercel preview deploy → apps/mobile/.env.preview 갱신 → eas build → APK sideload → 가입/추가/리스트/로그아웃 시나리오
3. **§6.2 통합 테스트 (Vitest + supabase local)** — Docker + supabase CLI db:start. Phase 2 또는 별도 작업
4. **§6.3 E2E happy-path 본문 + RLS A vs B** — 인증 fixture 셋업 후 별도 작업
5. **(선택) git tag v0.1.0** — Phase 0a/0b 패턴 skip 또는 사용자 결정

### Spec deviations (Phase 1 종합)
- 0008b 파일명 supabase CLI 거부 → 콘솔 적용 + db:types 재실행 필요 (Day 2)
- `useTypeahead` RPC 임시 type assertion + TODO (Day 4) — 0008b 콘솔 적용 후 정식 타입
- §6.2/§6.3 본문 미수행 — 환경 의존 사용자 액션 (Day 6)
- `consumeIngredient`는 완전 소진 — Phase 2에서 partial consume + auto-consumed 트리거 추가 예정

## v0.1.0-day6 (Phase 1 Day 6) — inventory loading.tsx + E2E auth-guard 회귀 (2026-04-30)

### Added
- `app/(app)/inventory/loading.tsx` — Next 16 Suspense fallback, Skeleton primitive 4 storage shell + header placeholder
- `e2e/inventory-happy-path.spec.ts` — `(app)/inventory` 미인증 → `/login` redirect 회귀 (Phase 0a/0b 가드 검증)

### Verified
- typecheck/lint/drift 0 errors, vitest 9 PASS 회귀
- E2E 2/2 PASS (auth.spec.ts + inventory-happy-path.spec.ts, chromium PORT 3100)
- 토큰 grep 0 forbidden

### Spec deviations
- §6.2 통합 테스트 (Vitest + supabase local) 미수행 — supabase local Docker 환경 사용자 액션 의존. Phase 2 또는 별도 작업으로 미룸
- §6.3 E2E happy-path 본문 (가입 → 추가 → 리스트) 미수행 — 인증 fixture/세션 셋업 + RLS A vs B 시나리오는 별도 작업. 본 Day 6 E2E는 가드 회귀 1건만

## v0.1.0-day5 (Phase 1 Day 5) — list-inventory + delete + consume + widgets/inventory-list + inventory page wire (2026-04-30)

### Added
- `features/list-inventory/lib/useInventoryList.ts` — useQuery (queryKey `['ingredients','list',{userId}]`) + ingredient_master JOIN + consumed=false filter + expires_at ASC sort + InventoryItem 타입 (master 정규화)
- `features/delete-ingredient/api/deleteIngredient.ts` — `'use server'` Action, zod 검증, RLS-respecting DELETE
- `features/consume-ingredient/api/consumeIngredient.ts` — `'use server'` Action, consumed=true UPDATE (Phase 2에서 partial consume 추가 예정)
- `widgets/inventory-list/ui/inventory-list.tsx` — `'use client'` shell (Skeleton loading + 4 storage 카드 + IngredientRow + 소진/삭제 mutation)
- `widgets/inventory-list/ui/inventory-actions.tsx` — `'use client'` AddIngredientDialog wrapper

### Changed
- `app/(app)/inventory/page.tsx` — RSC, storageLocations fetch + InventoryList + InventoryActions 연결 (Day 2 placeholder 대체)

### Verified
- typecheck/lint/drift 0 errors
- vitest 9 PASS 회귀
- 토큰 grep 0 forbidden

## v0.1.0-day4 (Phase 1 Day 4) — features/add-ingredient (Server Action + Dialog + typeahead) (2026-04-30)

### Added
- `features/add-ingredient/api/addIngredient.ts` — `'use server'` Action, zod 검증, RLS-respecting INSERT, `Result<UserIngredient, string>` 반환, `revalidatePath('/inventory')`
- `features/add-ingredient/lib/useTypeahead.ts` — `'use client'` hook, debounce 250ms + TanStack Query (queryKey `['ingredients', 'search', q]`, staleTime 30s) + `search_ingredient_masters` RPC 호출
- `features/add-ingredient/ui/add-ingredient-dialog.tsx` — `'use client'` 2-step Dialog (검색 → 상세 입력) + invalidate `['ingredients']` on success + Toast 피드백 + 기본 expires_at/storage_kind 자동 채움
- `zod ^4.x` 의존성 추가 (Server Action 입력 검증)

### Verified
- typecheck / lint / drift 0 errors
- vitest 9 PASS (회귀)

### Spec deviations
- 0008b RPC가 사용자 콘솔 미적용 → `useTypeahead`에서 임시 `(supabase as any).rpc(...)` type assertion + `// TODO: 0008b 콘솔 적용 후 db:types 재실행해서 정식 타입 사용` 주석. 수동 `SearchIngredientMasterResult` 타입 export.

## v0.1.0-day3 (Phase 1 Day 3) — entities/ingredient (types/computeDDay/UI primitives) + 8 fixture 단위 테스트 (2026-04-30)

### Added
- `entities/ingredient/model/types.ts` — Database 파생 alias (IngredientMaster / UserIngredient / StorageLocation / IngredientCategory + Insert/Update + StorageKind enum)
- `entities/ingredient/lib/dday-thresholds.ts` — `URGENT_THRESHOLD_DAYS=2`, `SOON_THRESHOLD_DAYS=7` 단일 출처 상수
- `entities/ingredient/lib/computeDDay.ts` — KST(Asia/Seoul) `dayjs.tz` 보정. bucket: expired/urgent/soon/fine
- `entities/ingredient/lib/computeDDay.test.ts` — 8 fixture (vitest `it.each` 패턴)
- `entities/ingredient/ui/dday-badge.tsx` — bucket → Badge tone 매핑 (`'use client'`)
- `entities/ingredient/ui/storage-card.tsx` — 보관 장소 카드 (RSC, Card primitive 사용)
- `entities/ingredient/ui/ingredient-row.tsx` — 재료 row (DDayBadge + 소진/삭제 액션 슬롯, `'use client'`)

### Verified
- typecheck / lint / drift 0 errors
- vitest 9 PASS (Phase 0b button 1 + Phase 1 Day 3 computeDDay 8 fixture)
- 토큰 grep 0 forbidden in `entities/ingredient/`

## v0.1.0-day2 (Phase 1 Day 2) — user_ingredients + handle_new_user 교체 + 검색 RPC (2026-04-30)

### Added
- 0007_user_ingredients.sql — table + 2 부분 인덱스 (`consumed = false`) + view `user_ingredients_with_dday` + RLS `for all` (사용자별 격리, db-schema §4.1)
- 0008_user_default_storage_locations.sql — `handle_new_user()` `CREATE OR REPLACE` — `storage_locations` 4종 (냉장실/냉동실/실온/김치냉장고) 자동 생성 추가 (기존 `user_profiles` INSERT 책임 유지). `on conflict do nothing` idempotent
- 0008b_search_ingredient_masters.sql — pg_trgm 한국어 typeahead RPC (ILIKE prefix 1.0 / substring 0.7 / similarity hybrid, `security invoker`, anon+authenticated grant)

### Changed
- `apps/web/src/shared/api/supabase/types.ts` 재생성 (`pnpm web db:types`) — Database 타입에 storage_locations / ingredient_categories / ingredient_master / user_ingredients / view 추가 (RPC `search_ingredient_masters`는 0008b 콘솔 적용 후 추가 예정)
- `docs/plans/phase-1.md` §2.2 + `docs/plans/db-schema.md` §3.2 — 0007 ```sql block sync (RLS 정책 추가)

### Verified
- `pnpm web db:push` 성공 (0003-0008 원격 적용)
- `pnpm web db:check-drift` drift 0
- `pnpm web typecheck` / `lint` 0 errors

### Spec deviations
- **0008b 파일명 supabase CLI 거부** — CLI 기본 정규식 `<digit>{4,}_<name>.sql` 패턴 외 (`0008b`의 알파벳 suffix). `db:push` 실행 시 자동 skip됨. 해결 방법: 사용자 환경에서 Supabase 콘솔 → SQL Editor → 0008b 본문 직접 실행 후 `pnpm web db:types` 재실행 → RPC 타입 자동 추가. **Day 4 features/add-ingredient typeahead 시점까지 적용 필수**.

## v0.1.0-day1 (Phase 1 Day 1) — DB 마이그레이션 0003-0006 + RLS + 시드 (2026-04-30)

### Added
- 0003_storage_locations.sql — `storage_kind` enum (5종) + table + RLS (SELECT/UPDATE/DELETE only; INSERT는 handle_new_user definer만)
- 0004_ingredient_categories.sql — table (`unique nulls not distinct (user_id, name)`) + RLS (글로벌+사용자 추가) + 글로벌 시드 12 카테고리 (육류/해산물/채소/과일/유제품/곡물/조미료/가공식품/음료/간식/김치·장류/기타)
- 0005_ingredient_master.sql — table (FK→categories, FK→storage_kind) + `gin_trgm_ops` 인덱스 + RLS (글로벌+사용자)
- 0006_ingredient_master_seed.sql — 글로벌 시드 ~154 row (한국 가정 빈출 식재료, 카테고리/보관일수/storage_kind 매핑)

### Changed
- docs/plans/phase-1.md §2.2 + docs/plans/db-schema.md §3.2 본문 sync — 4개 SOURCE-marked ```sql 블록을 migrations 본문 그대로 갱신 (RLS + 시드 154 row 본문 추가)

### Verified
- PostgreSQL 17.6 확인 (`select version();`) — `unique nulls not distinct` 등 모던 기능 사용 가능
- `pnpm web db:check-drift` → drift 0 (4 신규 + 2 기존 = 6 매칭)
- `pnpm web typecheck` / `lint` 0 errors
- (사용자 환경 액션) `pnpm web db:push` + Pre-flight PoC (`'양'/'양파'/'양ㅍ'` ad-hoc SQL similarity 측정 < 200ms) + RLS 기초 검증 — review 후 별도 진행

### Spec deviations
- phase-1.md §2.2 + db-schema.md §3.2 본문 보강 — 원래 spec은 RLS 정책 누락 + 0006 시드 verbatim 미존재. orchestrator/architect 결정으로 db-schema §4 RLS 패턴 적용 + 0006 시드 한국 식재료 ~154 row 자율 큐레이션

## v0.0.2 (Phase 0b) — App Shell + Primitives + 테스트 인프라 (2026-04-30)

### Added
- shared/ui primitives 7종: Button, Card, Badge, Input, Dialog, Skeleton, Toast (CVA 기반, 디자인 토큰 100% 사용)
- `@radix-ui/react-dialog`, `sonner` 의존성 추가
- widgets/app-shell — AppHeader (sticky, 마이페이지 링크), BottomNav (4탭, `usePathname` 기반 active)
- `app/(app)/inventory/page.tsx` placeholder
- shared/lib/query-client.ts + query-provider.tsx — TanStack Query Provider (per-mount 싱글톤, dev-gated devtools)
- root layout — `<QueryProvider>{children}</QueryProvider><Toaster />` 주입
- 테스트 인프라 — Vitest 4 + jsdom + @testing-library/react 16 + @testing-library/jest-dom + Playwright 1.59 + chromium
- vitest.config.ts (e2e/* exclude), vitest.setup.ts (jest-dom matchers)
- playwright.config.ts (chromium, PORT=3100, 120s webServer + 30s locator timeout)
- 단위 테스트 1개 (button.test.tsx — `await findByRole`)
- E2E 테스트 1개 (auth.spec.ts — /login 페이지 렌더, port 3100)
- 5 test scripts (test/watch/ui/coverage/e2e)
- lefthook (워크스페이스 루트) — pre-commit hook (gitleaks protect --staged + typecheck) 자동 격상

### Changed
- `app/(app)/layout.tsx` — Phase 0a 인증 가드 유지 + AppHeader/main(pb-56)/BottomNav shell 통합
- root layout.tsx body — QueryProvider + Toaster 추가
- gitleaks 자동화 격상 (Phase 0a 수동 1회 → Phase 0b pre-commit 자동)
- `app/page.tsx` `'use client'` 선행 코멘트 제거 (디렉티브 첫 줄 보장)

### Verified
- `pnpm web typecheck` / `lint` / `db:check-drift` 모두 0 errors
- `pnpm web test` (vitest) 1/1 PASS
- `pnpm web test:e2e` (Playwright) 1/1 PASS (port 3100)

### Spec deviations (phase-0b.md 와 다른 결정)
- `vitest@^1` → `^4` (1.x EOL)
- `@vitejs/plugin-react ^6` (vite 8 호환 — vitest 4 의존성)
- e2e port 3000 → 3100 (로컬 환경 충돌 회피, 향후 환경 정리 시 3000 복귀 검토)
- `vitest.config.exclude` 확장 (e2e/* — Playwright `test()` 충돌 회피)
- `button.test.tsx` `await findByRole` (React 19 concurrent mount 대응)
- gitleaks는 시스템 binary 사용 (npm 미배포, `brew install gitleaks` 필수)

## v0.0.1 (Phase 0a) — DB infra + codegen 셋업 (2026-04-30)

### Added
- supabase 디렉터리 + `config.toml` (`supabase init`)
- 마이그레이션 0001 — `pg_trgm` extension
- 마이그레이션 0002 — `user_profiles` 테이블 + `handle_new_user()` 트리거 (security definer, search_path 명시)
- 3 supabase 클라이언트 (`browser`/`server`/`admin`)에 `<Database>` generic 적용
- `apps/web/src/shared/api/supabase/types.ts` (auto-generated, `pnpm web db:types`)
- `apps/web/src/shared/lib/result.ts` — `Result<T, E>` + `ok()` / `err()` 헬퍼
- `apps/web/src/app/(app)/layout.tsx` — 인증 가드 RSC layout (단일 진입점)
- `.gitleaks.toml` 룰 파일 (워크스페이스 루트, 기본 ruleset extend + 노이즈 경로 allowlist)
- 6 db 스크립트 (`db:start`/`push`/`types`/`reset`/`diff`/`check-drift`)

### Changed
- `app/page.tsx` — create-next-app 보일러플레이트 제거, 로그인 여부에 따라 `/login` 또는 `/inventory` redirect
- `app/layout.tsx` metadata 한글화 (`냉장고 매니저`)
- `app/account/{page,logout-button}.tsx` → `app/(app)/account/`로 이동 + `dark:*` 클래스 제거 (conventions §3.2)

### Verified
- 트리거 실동작 (재가입 시 `user_profiles` row 자동 생성, FK 매칭 OK)
- `pnpm web typecheck` 0 errors
- `pnpm web lint` 0 errors
- `pnpm web db:check-drift` drift 0
- 수동 `gitleaks detect` PASS (수동 1회 실행, lefthook 자동화는 Phase 0b)
