# Phase 2 — 인벤토리 고도화

> **상태**: 미시작
> **선행 phase**: Phase 1
> **후속 phase**: Phase 3 (권장, 의존 X — 병렬 가능)
> **예상 기간**: 1-1.5주

---

## §0 사전 의존성 + 환경 변수

### 체크박스
- [ ] Phase 1 완료 (Acceptance + DoD 모두 통과)
- [ ] supabase/migrations/ 마지막 번호 = 0008b (본 phase는 0009부터 시작)
- [ ] Phase 1 자산 검증: `user_ingredients` 테이블 + `storage_locations` + `ingredient_master` 동작
- [ ] computeDDay.ts + URGENT_THRESHOLD_DAYS=2 사용 가능
- [ ] **마이그레이션 번호 충돌 확인** (Architect 3.F): `apps/web/supabase/migrations/` 마지막 번호 확인. 본 phase 시작 번호(0009) 미만이어야 함.

### 환경 변수
신규 없음.

---

## §0.5 참조 자산 미리보기 (cross-phase dependencies)

### 0.5.1 인용 테이블 (Phase 1 자산)

| 테이블 | 정의 phase | 사용 컬럼 | 풀 본문 |
|---|---|---|---|
| `user_ingredients` | Phase 1 (0007) | `id`, `user_id`, `ingredient_master_id`, `storage_location_id`, `quantity`, `unit`, `expires_at`, `consumed`, `created_at`, `updated_at` | `db-schema.md §3.2 0007` |
| `storage_locations` | Phase 1 (0003) | `id`, `user_id`, `name`, `kind`, `sort_order` | `db-schema.md §3.2 0003` |
| `ingredient_master` | Phase 1 (0005) | `id`, `name`, `category_id` | `db-schema.md §3.2 0005` |

### 0.5.2 인용 RPC/함수 (Phase 1)

```sql
-- 발췌. 전체: db-schema.md §3.2 0008b 또는 apps/web/supabase/migrations/0008b_search_ingredient_masters.sql
-- search_ingredient_masters — 본 phase에서는 직접 호출 X (이동/소진은 master_id로 직접 작업)
search_ingredient_masters(p_query text, p_user_id uuid, p_limit int default 10)
returns table (id uuid, name text, category_id uuid, default_shelf_life_days int, default_storage_kind storage_kind, rank real)
```

### 0.5.3 영향받는 cross-cutting 룰 (conventions.md)

- §1 Result<T, string> — 모든 mutation Server Action 반환 타입
- §10 Server Action vs Route Handler — **Server Action 사용** (폼/도메인 mutation). 외부 API 없음
- §17 TanStack Query queryKey — `['ingredients', 'list', { storageId, sort, filter }]` invalidation 패턴 유지. `['inventory-summary']` 신규
- §19 단일 출처 상수 — `URGENT_THRESHOLD_DAYS = 2` 본 phase 0010 (`get_inventory_summary`) SQL 안에서 동일 사용 (TS와 일치). 변경 시 TS + SQL 동시 수정
- §6 RLS 패턴 — 사용자별 격리 (db-schema §4.1)
- §18 Zustand vs Query 경계 — 필터/정렬 UI 상태는 Zustand (인메모리 only), 서버 데이터는 TanStack Query

---

## §1 목표 / 출시 가능 가치

인벤토리 사용성 고도화. 정렬/필터/storage 간 이동/부분 소진/만료 알림 헤더. Phase 1의 단순 CRUD를 실사용 가능 단계로 끌어올림.

**가시적 변화**:
- 인벤토리 헤더에 (전체 N개 / 임박 M개 / 만료 K개) 카운트 배지
- 정렬: 만료 임박 순 / 최근 추가 순 / 이름순 (3 모드)
- 필터: 카테고리 multi-select + 보관 장소 단일 선택
- 보관 장소 간 이동 (빠른 메뉴 — MoveIngredientButton)
- 부분 소진 (slider 또는 quick buttons 25/50/75/100%) → 0 도달 시 자동 consumed=true (0009 트리거)
- 만료 임박/만료 재료 시각화 (DDayBadge 활용, Phase 1 자산)
- 사용자 정의 보관 장소 추가/이름변경/삭제 (features/manage-storage)

---

## §1.5 Architect 결정 적용

- **권고 (PARTITION_PLAN Critic 7)**: 0009 트리거 + Phase 4 `log_cooking_session()` 명시적 update 둘 다 유지 (idempotent double-write OK). 본 phase 트리거는 앱 직접 quantity update 경로 보장.
- **결정 (단일 출처 상수)**: `URGENT_THRESHOLD_DAYS = 2`를 0010 `get_inventory_summary` SQL 본문 주석으로 cross-ref. TS 측 `dday-thresholds.ts`와 동일 값 — 변경 시 SQL도 새 마이그레이션으로 함께 수정.
- **권고 (PARTITION_PLAN Critic 7 fix)**: `consumed_at` 컬럼 미도입 (plan 어디서도 read 안 함, dead column 회피). 향후 soft-delete 추적 필요 시 별도 phase에서 컬럼 추가.
- **결정 (Zustand vs URL state)**: Phase 2는 Zustand only (인메모리 필터/정렬 상태). Phase 3 이후 URL searchParams 동기화 옵션 평가.

---

## §2 DB 마이그레이션

> SSoT 우선순위 (Architect 1.A): `apps/web/supabase/migrations/0NNN_*.sql` (1차) → db-schema.md §3 / 본 §2.2 (2차 view)
> 마이그레이션 번호 충돌 회피: db-schema.md §1 표 참조.

### 2.1 일람표 (본 phase 신규 2개)

| 번호 | 파일명 | 주요 객체 | 의존성 |
|---|---|---|---|
| 0009 | `0009_user_ingredient_partial_consume.sql` | `original_quantity` 컬럼 + check constraint (idempotent) + `user_ingredients_auto_consume()` 트리거 | 0007 (user_ingredients) |
| 0010 | `0010_dashboard_stats_function.sql` | `get_inventory_summary(p_user uuid)` RPC | 0007 (user_ingredients) |

### 2.2 SQL 본문

#### 0009_user_ingredient_partial_consume.sql

<!-- SOURCE: apps/web/supabase/migrations/0009_user_ingredient_partial_consume.sql -->
```sql
-- ───────── 0009_user_ingredient_partial_consume.sql ─────────

-- 1) 소진 진행률 표시용 컬럼 (구매 당시 수량 보존)
alter table public.user_ingredients
  add column if not exists original_quantity numeric(10,2);
-- 기존 row backfill: original_quantity := quantity (앱 측 1회 마이그레이션)
update public.user_ingredients
  set original_quantity = quantity
  where original_quantity is null;

-- 2) check constraint (0007에서 명시되어 있으면 skip — idempotent 패턴)
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_ingredients_quantity_nonneg'
  ) then
    alter table public.user_ingredients
      add constraint user_ingredients_quantity_nonneg check (quantity >= 0) not valid;
    alter table public.user_ingredients
      validate constraint user_ingredients_quantity_nonneg;
  end if;
end $$;

-- 3) quantity = 0 도달 시 consumed = true 자동 마킹
create or replace function public.user_ingredients_auto_consume()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if NEW.quantity = 0 and NEW.consumed = false then
    NEW.consumed := true;
    -- consumed_at 컬럼은 plan 어디서도 read하지 않으므로 미도입.
    -- 향후 soft-delete 추적 필요 시 별도 phase에서 컬럼 + 본 라인 추가.
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_user_ingredients_auto_consume on public.user_ingredients;
create trigger trg_user_ingredients_auto_consume
  before update of quantity on public.user_ingredients
  for each row
  when (NEW.quantity is distinct from OLD.quantity)
  execute function public.user_ingredients_auto_consume();
```

> **트리거-RPC 일관성 메모**: Phase 4의 `log_cooking_session()` 본문(§3.2 0015b)은 명시적으로 `update ... set consumed = true` 처리한다. 이 트리거가 도입되면 두 경로(앱 직접 quantity 업데이트 + RPC) 모두 동일하게 `consumed=true`로 자동 마킹된다. log_cooking_session의 명시적 update는 트리거와 redundant하지만 **안전성을 위해 그대로 유지**(double-write OK, idempotent). 앱 측 직접 quantity 업데이트 경로는 트리거에 의존.

#### 0010_dashboard_stats_function.sql

<!-- SOURCE: apps/web/supabase/migrations/0010_dashboard_stats_function.sql -->
```sql
-- ───────── 0010_dashboard_stats_function.sql ─────────
-- 인벤토리 헤더에 표시할 (전체 / 임박 / 만료) 카운트
-- 임계값 단일 출처: entities/ingredient/lib/dday-thresholds.ts (URGENT_THRESHOLD_DAYS = 2)
--   → expiring_soon  = D-Day 0..2 (today 포함, 2일 이내)
--   → expired        = D-Day < 0 (이미 지남)
-- 본 SQL과 computeDDay.ts (Phase 1)의 bucket 분류는 반드시 동일해야 함.

create or replace function public.get_inventory_summary(p_user uuid)
returns table (
  total int,
  expiring_soon int,
  expired int
)
language sql stable
security invoker
set search_path = public, pg_temp
as $$
  select
    count(*)::int as total,
    count(*) filter (
      where ui.expires_at is not null
        and ui.expires_at - current_date between 0 and 2
    )::int as expiring_soon,
    count(*) filter (
      where ui.expires_at is not null
        and ui.expires_at < current_date
    )::int as expired
  from public.user_ingredients ui
  where ui.user_id = p_user
    and ui.consumed = false
    and ui.quantity > 0;
$$;

grant execute on function public.get_inventory_summary(uuid)
  to authenticated;
```

> **단일 출처 상수 권장**: D-Day 임계값(`URGENT_THRESHOLD_DAYS = 2`)을 `entities/ingredient/lib/dday-thresholds.ts` 한 파일에서 export. SQL 측은 마이그레이션 코멘트에 임계값 명시 + PR 리뷰 룰 (SQL 변경 시 TS 임계값 동시 변경 강제). `computeDDay.ts`의 `urgent`(0..2) bucket과 본 SQL `expiring_soon`(0..2)은 동일 분류. `expired`(<0)도 동일.

### 2.3 마이그레이션 적용 절차

1. **파일 생성**: `apps/web/supabase/migrations/0NNN_<snake_name>.sql` 직접 생성. **`supabase migration new` CLI 사용 금지** (timestamp prefix 자동 부여 → 4자리 형식과 충돌, Architect 3.D)
2. **로컬 검증**: `pnpm web db:reset` (모든 마이그레이션 재실행) — 또는 `pnpm web db:start` 후 새 마이그레이션만 적용
3. **타입 갱신**: `pnpm web db:types` — `apps/web/src/shared/api/supabase/types.ts` 재생성 + 커밋
4. **drift 확인**: `pnpm web db:check-drift` — phase 파일 §2.2 SOURCE 마커 블록과 migrations/*.sql byte 일치 검증
5. **원격 적용**: `pnpm web db:push` (수동, 1인 작업자 운영)
6. **변경 검증**: 0009 트리거 동작 (quantity=0 → consumed=true) + 0010 RPC 카운트 정확 확인

### 2.4 데이터 백필

**`original_quantity` 컬럼 백필**: 0009 마이그레이션 내부에 이미 포함 (`update ... set original_quantity = quantity where original_quantity is null`). 마이그레이션 실행 시 자동 처리.

검증:
```sql
select count(*) from user_ingredients where original_quantity is null;
-- 결과 → 0 확인
```

**`consumed_at` 컬럼 미도입** (§1.5 Architect 결정 적용): plan 어디서도 read하지 않으므로 dead column 회피. 추후 phase에서 필요해지면 별도 마이그레이션으로 추가.

### 2.5 RLS 정책

- 0009 트리거: RLS 정책 영향 없음. BEFORE UPDATE OF quantity 트리거는 NEW row만 수정 — user context는 호출 시점의 RLS 정책이 이미 검증
- 0010 함수: `stable` + `security invoker`. `p_user` 인자를 받아 RLS는 `user_ingredients` 기존 정책 (auth.uid() = user_id)으로 격리됨

---

## §3 UI 작업 (FSD 레이어 + 정확한 파일 경로)

### 3.1 entities/ingredient 확장

| 파일 | 역할 |
|---|---|
| `apps/web/src/entities/ingredient/ui/inventory-summary-header.tsx` | (전체/임박/만료) 카운트 헤더 — get_inventory_summary RPC 결과 사용. TanStack Query `['inventory-summary']` |
| `apps/web/src/entities/ingredient/lib/sort.ts` | 정렬 함수 3종: `sortByExpiring(items)` / `sortByRecent(items)` / `sortByName(items)` |
| `apps/web/src/entities/ingredient/lib/filter.ts` | 필터 함수: `filterByStorage(items, storageId)` / `filterByCategories(items, categoryIds)` |

### 3.2 features/move-ingredient

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/move-ingredient/api/move-ingredient.ts` | Server Action `moveIngredient(id, newStorageId) → Result<UserIngredient, string>` |
| `apps/web/src/features/move-ingredient/ui/move-ingredient-button.tsx` | 보관 장소 변경 빠른 메뉴 (DropdownMenu from primitives) |

### 3.3 features/consume-ingredient 확장 (Phase 1 기반)

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/consume-ingredient/ui/consume-ingredient-sheet.tsx` | 부분/전체 소진 sheet — slider 또는 quick buttons 25/50/75/100%. 기존 `consume-ingredient.ts` Server Action 활용 |

### 3.4 features/inventory-filter

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/inventory-filter/ui/sort-toggle.tsx` | 정렬 모드 토글 (3 옵션: expiring / recent / name) |
| `apps/web/src/features/inventory-filter/ui/category-filter.tsx` | 카테고리 multi-select |
| `apps/web/src/features/inventory-filter/lib/use-filter-store.ts` | Zustand UI 상태 (sort/filter) — 인메모리 only, localStorage X |

### 3.5 features/manage-storage (신규)

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/manage-storage/api/manage-storage.ts` | Server Actions: `addStorage(name, kind) → Result<StorageLocation, string>` / `renameStorage(id, name) → Result<StorageLocation, string>` / `deleteStorage(id) → Result<void, string>` |
| `apps/web/src/features/manage-storage/ui/manage-storage-sheet.tsx` | 보관 장소 관리 sheet (추가/이름변경/삭제) |

### 3.6 widgets/inventory-list 확장

- 헤더에 `InventorySummaryHeader` 추가 (전체/임박/만료 카운트)
- 필터/정렬 토글 통합 (`SortToggle` + `CategoryFilter`)
- `MoveIngredientButton` 각 ingredient row에 통합
- `ConsumeIngredientSheet` 연결 (부분 소진 액션)

### 3.7 pages

| 파일 | 역할 |
|---|---|
| `apps/web/src/app/(app)/inventory/page.tsx` | RSC — Phase 1 기반. inventory-summary RPC 초기 fetch 추가 |

---

## §4 로직 작업

### 4.1 Server Actions

```ts
// features/move-ingredient/api/move-ingredient.ts
'use server';
export async function moveIngredient(
  id: string,
  newStorageId: string,
): Promise<Result<UserIngredient, string>>;
// 1. createSupabaseServerClient() + auth.uid() 검증
// 2. UPDATE user_ingredients SET storage_location_id = newStorageId WHERE id = id AND user_id = uid
// 3. revalidatePath('/(app)/inventory')
// 4. Result 반환

// features/manage-storage/api/manage-storage.ts
'use server';
export async function addStorage(name: string, kind: StorageKind): Promise<Result<StorageLocation, string>>;
export async function renameStorage(id: string, name: string): Promise<Result<StorageLocation, string>>;
export async function deleteStorage(id: string): Promise<Result<void, string>>;
// deleteStorage: user_ingredients가 있는 storage 삭제 시 에러 반환 (FK 제약 or 명시 가드)
```

### 4.2 TanStack Query queryKey (conventions §17 네이밍 룰)

```ts
['inventory-summary']                                              // 0010 get_inventory_summary RPC
['storage-locations']                                              // 사용자 storage 목록 (Phase 1 기존)
['ingredients', 'list', { storageId, sort, filter }]              // 정렬/필터 통합 (Phase 1 기존 확장)
['ingredient-categories']                                          // 필터용 카테고리 목록
```

invalidation 전략:
- `moveIngredient` 후: `['ingredients']` + `['inventory-summary']` 둘 다 invalidate
- `consumeIngredient` 후: `['ingredients']` + `['inventory-summary']` 둘 다 invalidate
- `addStorage` / `renameStorage` / `deleteStorage` 후: `['storage-locations']` invalidate

### 4.3 Zustand UI Store

```ts
// features/inventory-filter/lib/use-filter-store.ts
interface FilterState {
  sort: 'expiring' | 'recent' | 'name';
  categoryIds: string[];
  storageId: string | null;
  setSort: (s: FilterState['sort']) => void;
  toggleCategory: (id: string) => void;
  setStorageId: (id: string | null) => void;
  reset: () => void;
}
// 인메모리 only. localStorage persist 없음 — 새로고침 시 자동 reset (Phase 2 결정, §1.5 참조)
```

### 4.4 useInventorySummary hook

```ts
// entities/ingredient/api/queries.ts 확장
export function useInventorySummary() {
  return useQuery({
    queryKey: ['inventory-summary'],
    queryFn: async () => supabase.rpc('get_inventory_summary', { p_user: userId }),
    staleTime: 30_000,  // 30초 (conventions §17.2)
  });
}
```

---

## §5 외부 API 연동

해당 없음.

---

## §6 테스트 작업

> 인프라: Phase 0b 셋업 완료 가정 (Vitest + Playwright + Supabase local CLI)

### 6.1 단위 (Vitest)

| 파일 | 검증 항목 |
|---|---|
| `apps/web/src/entities/ingredient/lib/sort.spec.ts` | 3 정렬 모드 fixture: expiring/recent/name 각각 올바른 순서 반환 |
| `apps/web/src/entities/ingredient/lib/filter.spec.ts` | storage_id 필터 / category_id multi-select 필터 fixture |

### 6.2 통합 (Vitest + Supabase local)

- **0009 트리거 동작**: `UPDATE user_ingredients SET quantity = 0 WHERE id = ?` → `consumed = true` 자동 마킹 확인
- **0009 idempotent**: `consumed = true`인 row에 다시 quantity=0 update → 에러 없이 동일 상태 유지
- **0010 get_inventory_summary RPC**: D-Day 임계값 검증
  - D=0 (오늘 만료): expiring_soon 카운트 +1
  - D=2: expiring_soon +1
  - D=3: total +1 (expiring_soon X)
  - D<0 (이미 만료): expired +1
- **moveIngredient 통합**: storage_location_id 변경 후 올바른 storage에서 조회됨 확인

### 6.3 E2E (Playwright)

`apps/web/e2e/inventory-advanced.spec.ts`:
1. 가입 → 식재료 3개 추가 (각각 다른 storage, 다른 만료일)
2. 정렬 변경 (expiring → recent → name) → 순서 변화 확인
3. 카테고리 필터 적용 → 필터링된 결과 확인
4. storage 이동 (MoveIngredientButton) → 즉시 UI 반영 + inventory-summary 카운트 갱신
5. 부분 소진 (50%) → 수량 절반 표시
6. 100% 소진 → 리스트에서 사라짐 (consumed=true) + summary 카운트 갱신

### 6.4 수동 smoke

- 만료 임박 헤더 카운트가 실제 DB와 일치하는지 Supabase 대시보드 직접 쿼리로 검증
- deleteStorage: 재료가 있는 storage 삭제 시 에러 메시지 표시 확인

---

## §7 Acceptance 기준

- [ ] 0009 트리거: `UPDATE user_ingredients SET quantity = 0` → `consumed = true` 자동 마킹 (idempotent)
- [ ] 0010 RPC: `get_inventory_summary` 호출 시 (전체/임박/만료) 카운트 정확 (D-Day 임계값 D=0~2 = expiring_soon)
- [ ] 인벤토리 헤더에 (전체 N개 / 임박 M개 / 만료 K개) 카운트 표시 (디자인 토큰 준수)
- [ ] 정렬 3 모드: expiring / recent / name — 각 모드에서 올바른 순서
- [ ] 필터: 카테고리 multi-select + 보관 장소 단일 선택 → 즉시 필터링
- [ ] 보관 장소 이동 (MoveIngredientButton) → moveIngredient Server Action → 즉시 UI 반영
- [ ] consume-ingredient-sheet (부분 소진) → 수량 비례 감소 (25/50/75/100%)
- [ ] 수량 0 도달 시 리스트에서 사라짐 (consumed=true 마킹 + 필터)
- [ ] inventory-summary 카운트가 mutation 후 자동 갱신 (invalidation — ['ingredients'] + ['inventory-summary'])
- [ ] 사용자 정의 보관 장소 추가 가능 (예: "와인셀러") + 이름변경 + 삭제
- [ ] 재료 있는 storage 삭제 시 에러 메시지 표시
- [ ] 모든 Server Action `Result<T, string>` 반환 + mutation 후 Toast 피드백
- [ ] 단위/통합 테스트 모두 통과
- [ ] `inventory-advanced` E2E 통과
- [ ] `pnpm web typecheck` 0 errors
- [ ] `pnpm web lint` 0 errors

---

## §8 Definition of Done

- [ ] 모든 §7 Acceptance 충족
- [ ] `pnpm web typecheck` 0 errors
- [ ] `pnpm web db:check-drift` 통과 (0009/0010 ↔ db-schema.md §3.2 일치)
- [ ] `pnpm web test` 통과 (sort.spec + filter.spec + 통합 테스트)
- [ ] `pnpm web test:e2e` 통과 (inventory-advanced)
- [ ] PRD.md §3 로드맵 체크박스 업데이트
- [ ] `docs/CHANGELOG.md` 항목 추가 (DnD 라이브러리 선택 결과 + D-Day 임계값 동치성 검증 결과 포함)
- [ ] `gitleaks detect` 통과
- [ ] **모바일 웹뷰 스모크 테스트**: Vercel preview deploy → `apps/mobile/.env.preview` `WEB_BASE_URL` 갱신 → `eas build --profile preview --platform android` → 안드로이드 sideload → 필터/정렬/이동/부분 소진 동작 확인 (conventions §7)
- [ ] git commit + tag `v0.2.0`

### 8.5 롤백 절차

| 종류 | 절차 |
|---|---|
| 0009 트리거 (이미 적용된 후) | 새 `0009b_revert_auto_consume.sql`로 `drop trigger if exists trg_user_ingredients_auto_consume on public.user_ingredients;` + `drop function if exists public.user_ingredients_auto_consume();` |
| 0009 original_quantity 컬럼 | 새 마이그레이션으로 `alter table public.user_ingredients drop column if exists original_quantity;` (데이터 손실 주의) |
| 0010 RPC | `create or replace function` 패턴이라 idempotent. 새 마이그레이션으로 본문 교체 |
| 코드 (UI / Server Actions) | `git revert <commit>` |
| Zustand 필터 상태 | localStorage X (인메모리만) — 새로고침 시 자동 reset. 롤백 불필요 |
| Vercel 배포 | 이전 preview/production deployment로 대시보드에서 promote |

---

## §9 위험 / 완화

| 위험 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| 0009 트리거 + log_cooking_session (Phase 4) double-write | 중 | 저 | idempotent (already true → no change). `is distinct from` 가드. db-schema §3.2 0009 메모 그대로. Phase 4 명시적 update 유지 |
| 0010 RPC가 user_ingredients 풀스캔 | 저 | 중 | `(user_id, expires_at)` 인덱스 (Phase 1 0007 이미 존재) + RLS partial scan. DAU 100명 기준 충분. Phase 5+ 모니터링 |
| DnD 라이브러리 없이 MoveIngredientButton 구현 | — | — | 본 phase는 DnD 없이 DropdownMenu 기반 빠른 메뉴로 구현. DnD는 사용성 검증 후 추가 phase에서 도입 검토 |
| `get_inventory_summary` 임계값 drift | 중 | 중 | `URGENT_THRESHOLD_DAYS = 2` 단일 출처 (dday-thresholds.ts) + 0010 SQL 주석 cross-ref + 통합 테스트 동치성 검증 |
| manage-storage deleteStorage FK 충돌 | 중 | 중 | Server Action에서 사전 체크 (`select count(*) from user_ingredients where storage_location_id = id`) + 한국어 에러 메시지 반환 |
| 정렬/필터 상태 새로고침 시 reset | 저 | 저 | Phase 2 결정 (Zustand only). URL 동기화는 Phase 3+ 평가. CHANGELOG 기록 |

### 9.5 관측 / 로깅

- `moveIngredient` 실패 시 toast danger + `console.error` (Vercel logs)
- `deleteStorage` FK 충돌 시 한국어 에러 메시지 toast
- 0010 RPC 응답 시간 측정 (Vercel Function logs — 목표 < 200ms)
- inventory-summary 카운트 불일치 발견 시: Supabase 대시보드에서 `select * from get_inventory_summary(uid)` 직접 실행으로 진단

---

## (선택) 일별 작업 분배

- Day 1: 0009 트리거 마이그레이션 + `pnpm web db:reset` 검증 + 트리거 동작 manual SQL 확인
- Day 2: 0010 get_inventory_summary RPC + `pnpm web db:types` + D-Day 동치성 통합 테스트
- Day 3: `InventorySummaryHeader` 위젯 + 정렬 toggle (sort.ts + sort.spec.ts)
- Day 4: 카테고리/storage 필터 + Zustand use-filter-store + filter.spec.ts
- Day 5: `moveIngredient` Server Action + `MoveIngredientButton` UI + 통합 테스트
- Day 6: `ConsumeIngredientSheet` (부분 소진) + `manage-storage` (추가/삭제) + widgets/inventory-list 통합
- Day 7: E2E inventory-advanced + 회귀 + `pnpm web db:check-drift`
- Day 8-10 (1.5주 여유): 모바일 웹뷰 스모크 + CHANGELOG + tag `v0.2.0`

---

## (선택) 모바일 통합

EAS preview build 1회 (conventions §7):

1. Vercel preview deploy 완료 → preview URL 확보
2. `apps/mobile/.env.preview` `WEB_BASE_URL` 갱신 (수동 1줄)
3. `eas build --profile preview --platform android` (Expo 무료 티어 월 30분 — Phase 2 1회 소비)
4. APK 다운 → 안드로이드 sideload
5. 스모크 시나리오:
   - 로그인 → 인벤토리 헤더 카운트 확인
   - 정렬 변경 → 순서 변화 확인
   - MoveIngredientButton → 보관 장소 이동 → 즉시 반영
   - 부분 소진 (50%) → 수량 절반 표시
   - 100% 소진 → 리스트에서 사라짐 + 헤더 카운트 갱신
6. 모든 동작 OK면 phase 종료 + tag `v0.2.0`
