# Phase 5 — 장보기 브릿지

> ralph 실행 단위. 본 파일 + 참조: docs/plans/db-schema.md, docs/plans/conventions.md, docs/PRD.md
>
> **상태**: 미시작
> **선행 phase**: Phase 3 (필수), Phase 1 (필수)
> **후속 phase**: Phase 6 (또는 직접 출시)
> **예상 기간**: 1주

---

## §0 사전 의존성 + 환경 변수

### 체크박스
- [ ] Phase 3 완료 (recipe_master / recipe_ingredients / recommend_recipes() 동작 확인)
- [ ] Phase 1 완료 (user_ingredients RLS 동작 확인)
- [ ] supabase/migrations/ 마지막 번호 = 0015b (본 phase 시작 번호 0016)
- [ ] **마이그레이션 번호 충돌 확인** (Architect 3.F): `apps/web/supabase/migrations/` 마지막 번호 확인. 0015b 이하이어야 함. 본 phase는 0016부터 시작.
- [ ] **Pre-flight 30분 (★ 본 phase 첫 작업)**: 쿠팡/B마트/마켓컬리 검색 URL 패턴을 실제 브라우저에서 4–5개 검색어("양파", "두부", "김치", "삼겹살", "계란")로 동작 확인. 미작동 사이트는 즉시 비활성화 결정 (아래 env 토글)
- [ ] Pre-flight 결과를 `docs/CHANGELOG.md` Phase 5 섹션에 기록 (예: "쿠팡 ✓, 마켓컬리 ✓, B마트 ✗ → 비활성화")

### 환경 변수 (신규)
- `COUPANG_ENABLED=true` — 쿠팡 deeplink 활성화 (기본 활성)
- `BAEMIN_ENABLED=true` — B마트 deeplink 활성화 (Pre-flight 결과에 따라 `false`로 변경 가능)
- `KURLY_ENABLED=true` — 마켓컬리 deeplink 활성화 (기본 활성)

---

## §0.5 참조 자산 미리보기 (cross-phase dependencies)

### 0.5.1 인용 테이블

| 테이블 | 정의 phase | 사용 컬럼 | 풀 본문 |
|---|---|---|---|
| `user_ingredients` | Phase 1 (0007) | `user_id`, `ingredient_master_id`, `quantity`, `unit`, `consumed` | `db-schema.md §3.2 0007` |
| `ingredient_master` | Phase 1 (0005) | `id`, `name` | `db-schema.md §3.2 0005` |
| `recipe_master` | Phase 3 (0011) | `id`, `name` | `db-schema.md §3.2 0011` |
| `recipe_ingredients` | Phase 3 (0011) | `recipe_id`, `ingredient_master_id`, `is_optional`, `quantity`, `unit` | `db-schema.md §3.2 0011` |

### 0.5.2 인용 RPC/함수 (Phase 3)

```sql
-- 발췌. 전체: db-schema.md §3.2 0011 또는 apps/web/supabase/migrations/0011_recipes.sql
-- recommend_recipes: missing_required jsonb 결과를 장보기 부족 재료 추출에 활용 가능
create or replace function public.recommend_recipes(
  p_user uuid,
  p_min_score real default 0.5,
  p_limit int default 30
)
returns table (
  recipe_id uuid, name text, description text, cook_minutes int,
  difficulty recipe_difficulty, servings int,
  required_total int, required_have int, optional_total int, optional_have int,
  urgent_have int, score real,
  missing_required jsonb,   -- [{"ingredient_master_id": uuid, "quantity": numeric, "unit": text}, ...]
  missing_optional jsonb
)
```

> **활용 결정**: `missing_required` jsonb를 직접 소비하거나, 클라이언트에서 recipe_ingredients – user_ingredients 차집합 계산 후 shopping_list INSERT. 둘 다 허용 (phase 파일 §4.1 참조).

### 0.5.3 영향받는 cross-cutting 룰 (conventions.md)

- §1 Result<T, string> — 모든 Server Action 반환 타입 통일
- §10 Server Action vs Route Handler — 본 phase는 **Server Action** 사용 (사용자 mutation, shopping_list INSERT/DELETE). deeplink URL 조합은 순수 클라이언트 유틸 (`buildCommerceUrl.ts`)
- §17 TanStack Query queryKey — `['shopping-list']`, `['shopping-list', 'recipe-gap', recipeId]`
- §6 RLS 패턴 — `shopping_list`: 사용자별 격리 (`auth.uid() = user_id`) — db-schema.md §4.1

---

## §1 목표 / 출시 가능 가치

레시피 상세에서 "장보기 추가" 클릭 → 부족 재료 자동 계산 → `shopping_list` INSERT → 장보기 목록 페이지에서 쿠팡/B마트/마켓컬리 검색 URL deeplink로 즉시 이동. PRD §2.5 커머스 브릿지 핵심 가치.

**가시적 변화**:
- 레시피 상세 "부족 재료 장바구니에 담기" 버튼 (ExtractGapButton)
- `/(app)/shopping` 페이지 — 부족 재료 리스트 + 각 항목별 (쿠팡 / B마트 / 마켓컬리) deeplink 버튼 (활성 사이트만 노출)
- 단위 충돌 항목은 `note='단위 확인 필요'` 표기로 사용자 수동 확인 유도
- 수동 항목 추가 다이얼로그 + 체크 시 `bought=true` 토글
- 동일 재료 중복 추출 시 quantity 합산 (단위 동일 시만)

---

## §1.5 Architect 결정 적용

- **권고 (PARTITION_PLAN Critic 11 — Pre-flight URL 검증)**: Phase 5 §0 진입 즉시 30분 Pre-flight URL 검증 수행. 미작동 사이트는 env 토글(`BAEMIN_ENABLED=false` 등)로 즉시 비활성화. buildCommerceUrl.ts는 env 토글 확인 후 빈 문자열 반환 → UI에서 해당 버튼 숨김.
- **결정 (단위 충돌 처리 — PLAN.md §Phase 5 Minor Issue 3 해소)**: `recipe_ingredients.unit`과 `user_ingredients.unit`이 다른 경우 수량 합산 불가. `shopping_list.note` 컬럼에 `'단위 확인 필요'`를 기록하여 사용자가 직접 판단하도록 유도.
- **결정 (단위 자동 변환 OOS)**: g↔kg, 개↔봉지 등 단위 자동 변환은 §7 영구 out-of-scope. Phase 5에서 구현하지 않음.
- **결정 (중복 합산 조건)**: 동일 `ingredient_master_id`가 이미 `shopping_list`에 있고 `unit`이 동일한 경우 `quantity` UPDATE (합산). 단위 다르면 별도 row INSERT + note='단위 확인 필요'.

---

## §2 DB 마이그레이션

> SSoT 우선순위 (Architect 1.A): `apps/web/supabase/migrations/0NNN_*.sql` (1차) → db-schema.md §3 / 본 §2.2 (2차 view)
> 마이그레이션 번호 충돌 회피: db-schema.md §1 표 참조 (Architect 3.B)

### 2.1 일람표 (본 phase 신규 1개)

| 번호 | 파일명 | 주요 객체 | 의존성 |
|---|---|---|---|
| 0016 | `0016_shopping_list.sql` | enum `shopping_source` + table `shopping_list` + index + RLS | 0001 (`auth.users`), 0005 (`ingredient_master`), 0011 (`recipe_master`) |

### 2.2 SQL 본문

#### 0016_shopping_list.sql

<!-- SOURCE: apps/web/supabase/migrations/0016_shopping_list.sql -->
```sql
create type shopping_source as enum ('manual', 'recipe_gap');

create table shopping_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_master_id uuid references ingredient_master(id),
  custom_name text,                                   -- master에 없는 직접 입력
  quantity numeric(10,2),
  unit text,
  source shopping_source not null default 'manual',
  recipe_id uuid references recipe_master(id),       -- source=recipe_gap일 때
  bought boolean not null default false,
  note text,                                          -- 단위 충돌 등 보조 메모 (예: '단위 확인 필요')
  created_at timestamptz not null default now()
);
create index shopping_list_user_active_idx on shopping_list(user_id) where bought = false;
```

### 2.3 RLS

`shopping_list`는 사용자별 격리 (db-schema.md §4.1 패턴 적용):

```sql
alter table shopping_list enable row level security;
create policy "shopping_list_select_own" on shopping_list
  for select using (auth.uid() = user_id);
create policy "shopping_list_insert_own" on shopping_list
  for insert with check (auth.uid() = user_id);
create policy "shopping_list_update_own" on shopping_list
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shopping_list_delete_own" on shopping_list
  for delete using (auth.uid() = user_id);
```

### 2.4 마이그레이션 적용 절차

1. `apps/web/supabase/migrations/0016_shopping_list.sql` 직접 생성 (`supabase migration new` CLI 사용 금지 — Architect 3.D)
2. `pnpm web db:reset` — 모든 마이그레이션 재실행 (로컬 검증)
3. `pnpm web db:types` — `apps/web/src/shared/api/supabase/types.ts` 재생성 + 커밋
4. `pnpm web db:check-drift` — SOURCE 마커 블록 일치 검증
5. `pnpm web db:push` — 원격 적용
6. `select count(*) from shopping_list;` → 0 확인 (신규 테이블)

### 2.5 데이터 백필

해당 없음 (신규 테이블 — 기존 row 없음).

---

## §3 UI 작업

> FSD 레이어: `apps/web/src/{app|widgets|features|entities|shared}/...`

### 3.1 만들 라우트

- `apps/web/src/app/(app)/shopping/page.tsx` — RSC, `shopping_list` 조회 + ShoppingList 위젯 렌더
- `apps/web/src/app/(app)/shopping/loading.tsx` — `<Skeleton>` (Phase 0b primitive)
- `apps/web/src/app/(app)/shopping/error.tsx` — fallback

### 3.2 entities/shopping-item (신규 슬라이스)

| 경로 | 책임 |
|---|---|
| `entities/shopping-item/model/types.ts` | `ShoppingItem` 타입 (`id`, `user_id`, `ingredient_master_id`, `custom_name`, `quantity`, `unit`, `source`, `recipe_id`, `bought`, `note`, `created_at`) |
| `entities/shopping-item/model/checked-store.ts` | Zustand store — UI 체크 상태 (낙관적, 서버 동기화 전) |
| `entities/shopping-item/lib/extract-recipe-gap.ts` | 레시피 ingredients + 사용자 user_ingredients → 부족 재료 리스트 계산. 단위 동일 시만 보유 판정 / 단위 충돌 시 note='단위 확인 필요' |
| `entities/shopping-item/lib/build-commerce-url.ts` | 사이트별 검색 URL 빌더 (쿠팡/B마트/마켓컬리). env 토글 확인 후 빈 문자열 반환 |
| `entities/shopping-item/ui/shopping-item-row.tsx` | 1개 row — 체크박스 + 이름/수량/단위/note + (쿠팡/B마트/마켓컬리) deeplink 버튼 (활성만) |

### 3.3 features/extract-recipe-gap (신규)

| 경로 | 책임 |
|---|---|
| `features/extract-recipe-gap/api/actions.ts` | Server Action `extractRecipeGap(recipeId)` — 부족 재료 계산 + shopping_list INSERT (단위 동일 시 합산 / 단위 충돌 시 별도 row + note) |
| `features/extract-recipe-gap/ui/extract-gap-button.tsx` | 레시피 상세 "부족 재료 장바구니에 담기" 버튼 |

### 3.4 features/manual-add-shopping (신규)

| 경로 | 책임 |
|---|---|
| `features/manual-add-shopping/api/actions.ts` | Server Action `addManualShoppingItem(input)` |
| `features/manual-add-shopping/ui/add-shopping-dialog.tsx` | 수동 항목 추가 다이얼로그 |

### 3.5 features/commerce-deeplink (신규)

| 경로 | 책임 |
|---|---|
| `features/commerce-deeplink/ui/commerce-link-menu.tsx` | env 토글에 따라 0–3개 deeplink 버튼 렌더. `target="_blank" rel="noopener noreferrer"` |

### 3.6 features/toggle-bought (신규)

| 경로 | 책임 |
|---|---|
| `features/toggle-bought/api/actions.ts` | Server Action `toggleBought(id, bought)` — bought boolean flip |

### 3.7 features/delete-shopping-item (신규)

| 경로 | 책임 |
|---|---|
| `features/delete-shopping-item/api/actions.ts` | Server Action `deleteShoppingItem(id)` |

### 3.8 widgets/shopping-list (신규)

| 경로 | 책임 |
|---|---|
| `widgets/shopping-list/shopping-list.tsx` | ShoppingItemRow 리스트 + 수동 추가 버튼 + 섹션 분리 (미구매 / 구매완료) |

### 3.9 디자인 토큰 (conventions.md §3 inline)

- `text-heading-*`, `text-body-*-*`, `rounded-{xxs|xs|s|m|l|xl|xxl}` 만 사용
- `zinc-*`, `blue-*`, `text-[14px]` 등 임의 값 금지

---

## §4 로직 작업

> Server Action vs Route Handler 룰 (conventions.md §10):
>
> | 패턴 | 선택 |
> |---|---|
> | 폼 제출 / 도메인 mutation | Server Action |
> | 외부 API proxy (key 보호) | Route Handler |
> | RSC RPC fetch | RSC 직접 호출 |
> | 캐시 write (RLS bypass) | Route Handler + admin client |

### 4.1 Server Actions

```ts
// features/extract-recipe-gap/api/actions.ts
extractRecipeGap(recipeId: string): Promise<Result<{ added: number }, string>>
// 1) recipe_ingredients 조회 (recipe_id 기준)
// 2) user_ingredients 조회 (현재 사용자, consumed=false, quantity>0)
// 3) entities/shopping-item/lib/extract-recipe-gap.ts 호출 → 부족 재료 리스트
// 4) shopping_list INSERT:
//    - 이미 동일 ingredient_master_id + 동일 unit row 있으면 quantity UPDATE (합산)
//    - 단위 충돌이면 별도 row INSERT + note='단위 확인 필요'
//    - source='recipe_gap', recipe_id 설정
// 반환: { added: number } (신규/합산 처리한 항목 수)

// features/manual-add-shopping/api/actions.ts
addManualShoppingItem(input: { name: string; quantity?: number; unit?: string }): Promise<Result<ShoppingItem, string>>

// features/toggle-bought/api/actions.ts
toggleBought(id: string, bought: boolean): Promise<Result<void, string>>

// features/delete-shopping-item/api/actions.ts
deleteShoppingItem(id: string): Promise<Result<void, string>>
```

### 4.2 상수 (단위 비교 룰)

단위 비교는 **string 완전 일치** (`===`). '개' ≠ '봉지', 'g' ≠ 'kg'. 자동 변환 없음 (§1.5 결정 — 영구 OOS).

### 4.3 Deeplink 빌더 (build-commerce-url.ts)

```ts
// entities/shopping-item/lib/build-commerce-url.ts
type Commerce = 'coupang' | 'kurly' | 'bmart';

export function buildCommerceUrl(commerce: Commerce, ingredientName: string): string;
// 내부 동작:
// - COUPANG_ENABLED=false → '' 반환
// - 쿠팡: `https://www.coupang.com/np/search?q=${encodeURIComponent(name)}`
// - 마켓컬리: `https://www.kurly.com/search?sword=${encodeURIComponent(name)}`
// - B마트: Pre-flight 결과에 따라 URL 패턴 확정 (미작동 시 BAEMIN_ENABLED=false → '' 반환)
```

### 4.4 TanStack Query (해당 시)

- `queryKey: ['shopping-list']` — 전체 목록 조회
- `queryKey: ['shopping-list', 'recipe-gap', recipeId]` — 레시피별 부족 재료 미리보기 (선택)
- mutation 후 `queryClient.invalidateQueries(['shopping-list'])`

---

## §5 외부 API 연동

없음. 모든 deeplink는 클라이언트 URL 조합 (API 호출 X). env 토글로 미작동 사이트 즉시 비활성화 (정직한 UX).

---

## §6 테스트 작업

> 인프라: Phase 0b 셋업 완료 가정 (Vitest + Playwright + Supabase local CLI)

### 6.1 단위 테스트

- `entities/shopping-item/lib/extract-recipe-gap.spec.ts`
  - 레시피 7재료 중 사용자 4보유 → 부족 3개 반환
  - 단위 동일 재료 → 보유로 판정 (리스트 제외)
  - 단위 충돌 재료 → note='단위 확인 필요' 포함하여 반환
  - 이미 shopping_list에 있는 재료 + 동일 단위 → quantity 합산 (added=0 신규, 기존 UPDATE)

- `entities/shopping-item/lib/build-commerce-url.spec.ts`
  - 쿠팡 URL: `encodeURIComponent` 한글/특수문자 인코딩 검증
  - 마켓컬리 URL: `sword` 파라미터 인코딩 검증
  - `COUPANG_ENABLED=false` 시 빈 문자열 반환
  - `BAEMIN_ENABLED=false` 시 빈 문자열 반환

### 6.2 통합 테스트

- `extractRecipeGap` Server Action — recipe_ingredients + user_ingredients fixture INSERT 후 호출 → shopping_list row 생성 확인 + quantity 합산 확인
- RLS: 다른 user_id로 shopping_list 조회 → 0개 반환

### 6.3 E2E (Playwright)

- `e2e/shopping-list.spec.ts` — 가입 → 식재료 추가 → 레시피 상세 → "부족 재료 장바구니에 담기" → `/(app)/shopping` 이동 → ShoppingItemRow 노출 확인 → deeplink 클릭 → 새 탭 열림 검증 (`page.context().on('page', ...)`)
- `e2e/shopping-manual-add.spec.ts` — 수동 추가 다이얼로그 → 항목 추가 → 목록 확인

---

## §7 Acceptance 기준

- [ ] **Pre-flight 30분 URL 검증 완료** — 쿠팡/B마트/마켓컬리 4–5개 검색어 동작 확인. 미작동 사이트 env 토글로 비활성화. 결과 `docs/CHANGELOG.md` 기록
- [ ] 0016 마이그레이션 `pnpm web db:reset` 통과 (로컬) + `pnpm web db:push` 통과 (원격)
- [ ] 레시피 → 부족 재료 추출 정확 (단위 동일 시만 보유 판정)
- [ ] 단위 충돌 항목: `shopping_list.note = '단위 확인 필요'` 기록 + UI 표시
- [ ] 동일 재료 중복 추출 시 quantity 합산 (단위 동일 시) → 1 row
- [ ] `/(app)/shopping` 페이지 장보기 목록 표시
- [ ] 구매 체크 시 `bought=true` 토글 동작
- [ ] 커머스 링크 새 탭 열림 (`target="_blank" rel="noopener noreferrer"`)
- [ ] 활성 사이트만 deeplink 버튼 노출 (env 토글 존중)
- [ ] 수동 항목 추가 + 삭제 동작
- [ ] 모든 mutation `Result<T, string>` 반환
- [ ] `pnpm web typecheck` 0 error
- [ ] `pnpm web lint` 0 error
- [ ] `pnpm web db:check-drift` 0 drift

---

## §8 Definition of Done

- [ ] §7 Acceptance 모두 통과
- [ ] PRD.md §3 로드맵 체크박스 업데이트
- [ ] `docs/CHANGELOG.md` Phase 5 항목 추가 (Pre-flight URL 검증 결과 포함)
- [ ] `gitleaks detect` 통과
- [ ] **`pnpm web db:check-drift` 통과** (Architect 1.D — 본 §2.2 SQL 블록과 `0016_shopping_list.sql` byte 일치)
- [ ] 모바일 웹뷰 스모크 테스트 — Vercel preview URL → RN `WEB_BASE_URL` env 갱신 → EAS preview build → 로그인 / 인벤토리 / 레시피 상세 / "부족 재료 담기" / `/(app)/shopping` / deeplink 새 탭 이동 확인 (conventions.md §7)
- [ ] git tag `v0.5.0` 부여

### 8.5 롤백 절차

#### 8.5.1 마이그레이션 롤백
- 0016 적용 후 문제 발견 시: `0016b_fix_shopping_list.sql` 신규 작성 (immutable — 직접 수정 금지, Architect 1.A)
- DROP TABLE + 재생성 또는 ALTER로 명시적 정정

#### 8.5.2 코드 롤백
- `git revert <commit-range>` 또는 Vercel 대시보드에서 이전 preview 배포로 promote

#### 8.5.3 env 토글 롤백
- `.env.local` 및 Vercel env에서 `BAEMIN_ENABLED=false` 등 즉시 적용 → 재배포 없이 deeplink 비활성화 가능

#### 8.5.4 데이터 복구
- 신규 테이블이므로 DROP 후 재생성 가능 (사용자 데이터 손실 주의). MVP에서는 Supabase Dashboard PITR N/A.

---

## §9 위험 / 완화

| 위험 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| B마트/쿠팡 URL 패턴 변경 | 중 | 중 | Pre-flight 30분 검증 + env 토글로 즉시 비활성화 |
| 단위 충돌 누락 (합산 오류) | 중 | 중 | extract-recipe-gap에서 unit 완전 일치 비교, 다르면 note 기록. 단위 테스트로 검증 |
| 사용자가 deeplink 후 앱으로 복귀 안 함 | 저 | 저 | 모바일 웹뷰에서 `target="_blank"` → 외부 브라우저 오픈. EAS 스모크에서 복귀 UX 확인 |
| 레시피 재료 수 많을 때 INSERT 성능 | 저 | 저 | 레시피당 최대 ~12개 재료 → 단건 loop INSERT 허용 (MVP). 필요 시 bulk INSERT 전환 |

### 9.5 관측 / 로깅

- 성능 목표: → PRD.md §성능 (RSC TTFB, 인터랙션 latency)
- deeplink 클릭 이벤트: Vercel function logs (`console.info`)
- `extractRecipeGap` 실패: `console.error` + Result.error 한국어 메시지 반환
- 외부 API 없음 → API 에러율 관측 불필요

---

## §10 일별 작업 분배 (1주 → 7일)

- **Day 1**: Pre-flight URL 검증 + env 토글 결정 + 0016 마이그레이션 작성 + `pnpm web db:reset` + `db:types`
- **Day 2–3**: `extract-recipe-gap.ts` + `build-commerce-url.ts` + 단위 테스트 전체 통과
- **Day 4–5**: Server Actions 4개 + UI 컴포넌트 (ShoppingItemRow, ExtractGapButton, CommerceLinkMenu, AddShoppingDialog) + `/(app)/shopping` 페이지
- **Day 6**: E2E 2개 + `pnpm web db:check-drift` + typecheck + lint
- **Day 7**: Vercel preview 배포 + 모바일 웹뷰 스모크 + `docs/CHANGELOG.md` 기록 + git tag v0.5.0

---

## §11 모바일 통합

- Vercel preview URL → RN `WEB_BASE_URL` env 갱신 (예: `https://rn-app-dev-pr-N.vercel.app`)
- EAS 빌드: 월 30분 무료 티어 ($0), 빌드 시간 ~10분. Phase 5 끝에 1회 빌드.
- 스모크 시나리오: 로그인 → 인벤토리 → 레시피 상세 → "부족 재료 담기" → 장보기 목록 → deeplink 클릭 → 외부 앱(쿠팡/컬리) 이동 확인.
- native intent vs https 비교: Android에서 `https://www.coupang.com/...` deeplink는 기본적으로 외부 브라우저 오픈. 쿠팡 앱 설치 시 앱 intent 이동 가능 (market:// 스킴은 MVP에서 미도입 — 복잡도 대비 이득 낮음).
