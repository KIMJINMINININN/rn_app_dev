# Changelog

본 프로젝트의 모든 주요 변경 사항은 phase 단위로 본 파일에 기록한다. 형식: [Keep a Changelog](https://keepachangelog.com/) 약식.

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
