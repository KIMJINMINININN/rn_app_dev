# Phase 4 — 요리 히스토리 + 듀얼 추천

> ralph 실행 단위. 본 파일 + 참조: docs/plans/db-schema.md, docs/plans/conventions.md, docs/PRD.md
>
> **상태**: 미시작
> **선행 phase**: Phase 3 (필수 — recommend_recipes 의존). Phase 1도 필수
> **후속 phase**: Phase 5 (장보기)
> **예상 기간**: 1주

---

## §0 사전 의존성 + 환경 변수

### 체크박스
- [ ] Phase 1 + Phase 3 완료 (Acceptance + DoD 모두 통과)
- [ ] supabase/migrations/ 마지막 번호 = 0013 (본 phase는 0014부터 시작)
- [ ] Phase 1 자산: `user_ingredients`, RLS 동작 확인
- [ ] Phase 3 자산: `recipe_master`, `recipe_ingredients`, `recommend_recipes()` RPC + 시그니처 검증
- [ ] scoring-constants.ts 5개 상수 사용 가능 (Phase 3 신규 작성)
- [ ] **마이그레이션 번호 충돌 확인** (Architect 3.F): `apps/web/supabase/migrations/` 마지막 번호 확인. 0013 이하이어야 함. 본 phase는 0014부터 시작.

### 환경 변수
신규 없음.

---

## §0.5 참조 자산 미리보기 (cross-phase dependencies)

### 0.5.1 인용 테이블

| 테이블 | 정의 phase | 사용 컬럼 | 풀 본문 |
|---|---|---|---|
| `user_ingredients` | Phase 1 (0007) | `id`, `user_id`, `ingredient_master_id`, `quantity`, `consumed`, `expires_at`, `created_at` | `db-schema.md §3.2 0007` |
| `ingredient_master` | Phase 1 (0005) | `id`, `name`, `category_id` | `db-schema.md §3.2 0005` |
| `recipe_master` | Phase 3 (0011) | `id`, `name`, `cook_minutes`, `difficulty`, `servings` | `db-schema.md §3.2 0011` |
| `recipe_ingredients` | Phase 3 (0011) | `recipe_id`, `ingredient_master_id`, `is_optional`, `quantity`, `unit` | `db-schema.md §3.2 0011` |

### 0.5.2 인용 RPC/함수 (Phase 3)

```sql
-- 발췌. 전체: db-schema.md §3.2 0011 또는 apps/web/supabase/migrations/0011_recipes.sql
-- recommend_recipes: 본 phase의 recommend_for_ingredient() SQL 본문 안에서 호출
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
  missing_required jsonb, missing_optional jsonb
)
```

> **시그니처 일치 검증**: `recommend_for_ingredient`의 `new_candidates` CTE가 `rec.recipe_id`, `rec.name`, `rec.score`, `rec.cook_minutes`를 선택한다. 이 컬럼은 위 returns table에 모두 존재함 (Phase 3 §2.2 0011 본문 참조).

### 0.5.3 영향받는 cross-cutting 룰 (conventions.md)

- §1 Result<T, string> — `logCookingSession` Server Action 반환 타입
- §10 Server Action vs Route Handler — 본 phase는 **Server Action 사용** (사용자 mutation, RPC 직접 호출). 외부 API 없음
- §17 TanStack Query queryKey — `['cooking-history']`, `['recipes', 'for-ingredient', masterId]`
- §11 단일 출처 상수 — Phase 3에서 정의된 `WEIGHT_REQUIRED/OPTIONAL/URGENT`, `MIN_SCORE` 그대로 사용 (`recommend_for_ingredient`가 `recommend_recipes` 호출 → 동일 상수 적용됨)
- §6 RLS 패턴:
  - `cooking_history`: 사용자별 격리 (`auth.uid() = user_id`) — db-schema §4.1
  - `cooking_history_consumed_ingredients`: 직접 RLS 불필요 (cooking_history FK cascade로 격리)
- §8 / §14 SUPABASE_SECRET_KEY 사용 경로 — 본 phase는 admin client 사용 X. 사용자 mutation은 cookies 기반 server client(`createSupabaseServerClient()`)만 사용

---

## §1 목표 / 출시 가능 가치

요리 히스토리 + 재료 기반 듀얼 추천. PRD §2.4 핵심 가치 — "재료 클릭 → 과거/신규 레시피 병렬 표시".

**가시적 변화**:
- 레시피 상세 페이지 "요리 시작" 버튼 → 다이얼로그 (수량 차감 미리보기 + 평점/메모 폼) → 확정 → `cooking_history` INSERT + `user_ingredients` 부분 차감 (트랜잭션, RPC 단일 호출)
- `/(app)/cooking-history` — 과거 요리 리스트 (`cooked_at desc`)
- 인벤토리 재료 클릭 시 `/(app)/inventory/[ingredientId]` 페이지: 좌측 "이 재료로 만들었던 요리" (past_recipes) / 우측 "이 재료로 새로 시도할 요리" (new_recipes) — `recommend_for_ingredient` RPC 단일 호출

---

## §1.5 Architect 결정 적용

- **권고 3 적용 (recommend_for_ingredient 구조)**: `past_recipes` / `new_recipes` 두 jsonb 리스트를 단일 rows로 반환. `new_candidates` CTE는 `recommend_recipes(p_user, 0.5, 100)` 호출 결과 중 `cooking_history` 미존재 레시피만 필터링. 정렬: past = `last_cooked_at desc` / new = `score desc, cook_minutes asc`. SQL 본문은 §2.2 0015a 그대로.
- **권고 log_cooking_session 트랜잭션 (Architect 권고)**: plpgsql 단일 RPC로 `cooking_history` INSERT + `user_ingredients` 부분 차감 원자적 보장. 인자 시그니처 `(p_user uuid, p_recipe_id uuid, p_custom_recipe_name text, p_consumed jsonb, p_rating int, p_memo text) returns uuid`. consumed jsonb shape: `[{"master_id": "<uuid>", "quantity": <numeric>, "unit": "<text>"}]`. 차감 우선순위: `expires_at asc nulls last, created_at asc` (임박 재료 우선 소진). `quantity = 0` 도달 시 `consumed = true` 명시적 update (0009 트리거도 동일 처리 → double-write OK, idempotent). `auth.uid() ≠ p_user` 시 `raise exception 'unauthorized: auth.uid() mismatch'` → 트랜잭션 자동 rollback → Server Action `try/catch` 한국어 변환.
- **마이그레이션 분리 (PARTITION_PLAN Critic 7 — alpha suffix)**: 0015a (`recommend_for_ingredient`) + 0015b (`log_cooking_session`) 별도 파일. 한 phase 안 다중 RPC는 alpha suffix 사용.

---

## §2 DB 마이그레이션

> SSoT 우선순위 (Architect 1.A): `apps/web/supabase/migrations/0NNN_*.sql` (1차) → db-schema.md §3 / 본 §2.2 (2차 view)
> 마이그레이션 번호 충돌 회피: db-schema.md §1 표 참조 (Architect 3.B)

### 2.1 일람표 (본 phase 신규 3개)

| 번호 | 파일명 | 주요 객체 | 의존성 |
|---|---|---|---|
| 0014 | `0014_cooking_history.sql` | 테이블 `cooking_history` + `cooking_history_consumed_ingredients` + RLS + 인덱스 | 0011 (`recipe_master`) |
| 0015a | `0015a_recommend_for_ingredient.sql` | RPC `recommend_for_ingredient()` — past + new 듀얼 추천 | 0011, 0014, `recommend_recipes` |
| 0015b | `0015b_log_cooking_session.sql` | RPC `log_cooking_session()` plpgsql 트랜잭션 | 0007, 0011, 0014 |

### 2.2 SQL 본문

#### 0014_cooking_history.sql

<!-- SOURCE: apps/web/supabase/migrations/0014_cooking_history.sql -->
```sql
create table cooking_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references recipe_master(id),       -- null 허용 (직접 입력 요리)
  custom_recipe_name text,                            -- recipe_id null일 때 표시명
  cooked_at timestamptz not null default now(),
  rating int check (rating between 1 and 5),
  memo text
);
create index cooking_history_user_idx on cooking_history(user_id, cooked_at desc);

create table cooking_history_consumed_ingredients (
  history_id uuid not null references cooking_history(id) on delete cascade,
  ingredient_master_id uuid not null references ingredient_master(id),
  quantity numeric(10,2),
  unit text,
  primary key (history_id, ingredient_master_id)
);
create index cooking_history_consumed_ingredient_idx
  on cooking_history_consumed_ingredients(ingredient_master_id);
```

#### 0015a_recommend_for_ingredient.sql

<!-- SOURCE: apps/web/supabase/migrations/0015a_recommend_for_ingredient.sql -->
```sql
-- ───────── recommend_for_ingredient: 인벤토리에서 재료 클릭 시 듀얼 추천 ─────────
-- past_recipes: 사용자가 과거에 만든 적 있는 레시피 중 이 재료를 사용한 것
-- new_recipes:  이 재료를 사용하는 레시피 중 사용자가 만든 적 없는 것 (score >= 0.5)

create or replace function public.recommend_for_ingredient(
  p_user uuid,
  p_master_id uuid,
  p_limit_each int default 5
) returns table (
  past_recipes jsonb,
  new_recipes jsonb
)
language sql stable
security invoker
set search_path = public, pg_temp
as $$
  with past as (
    select
      r.id as recipe_id,
      r.name,
      max(ch.cooked_at) as last_cooked_at,
      count(*) as cooked_count
    from public.cooking_history ch
    join public.recipe_master r on r.id = ch.recipe_id
    join public.recipe_ingredients ri on ri.recipe_id = r.id
    where ch.user_id = p_user
      and ri.ingredient_master_id = p_master_id
    group by r.id, r.name
    order by last_cooked_at desc
    limit p_limit_each
  ),
  new_candidates as (
    select
      rec.recipe_id,
      rec.name,
      rec.score,
      rec.cook_minutes
    from public.recommend_recipes(p_user, 0.5, 100) rec
    join public.recipe_ingredients ri on ri.recipe_id = rec.recipe_id
    where ri.ingredient_master_id = p_master_id
      and not exists (
        select 1 from public.cooking_history ch
        where ch.user_id = p_user and ch.recipe_id = rec.recipe_id
      )
    order by rec.score desc, rec.cook_minutes asc
    limit p_limit_each
  )
  select
    coalesce((select jsonb_agg(jsonb_build_object(
      'recipe_id', recipe_id, 'name', name,
      'last_cooked_at', last_cooked_at, 'cooked_count', cooked_count
    )) from past), '[]'::jsonb) as past_recipes,
    coalesce((select jsonb_agg(jsonb_build_object(
      'recipe_id', recipe_id, 'name', name,
      'score', score, 'cook_minutes', cook_minutes
    )) from new_candidates), '[]'::jsonb) as new_recipes;
$$;

grant execute on function public.recommend_for_ingredient(uuid, uuid, int)
  to authenticated;
```

#### 0015b_log_cooking_session.sql

<!-- SOURCE: apps/web/supabase/migrations/0015b_log_cooking_session.sql -->
```sql
-- ───────── log_cooking_session: 요리 기록 + 재료 차감 (atomic) ─────────
-- consumed jsonb shape:
--   [{ "master_id": "<uuid>", "quantity": <numeric>, "unit": "<text>" }]

create or replace function public.log_cooking_session(
  p_user uuid,
  p_recipe_id uuid,           -- nullable (custom recipe)
  p_custom_recipe_name text,  -- nullable
  p_consumed jsonb,           -- 위 shape
  p_rating int default null,  -- 1-5 or null
  p_memo text default null
)
returns uuid                  -- cooking_history.id
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_history_id uuid;
  v_item jsonb;
  v_master_id uuid;
  v_to_consume numeric;
  v_unit text;
  v_row record;
  v_remaining numeric;
begin
  -- 권한 체크 (auth.uid()와 p_user 일치)
  if auth.uid() is null or auth.uid() <> p_user then
    raise exception 'unauthorized: auth.uid() mismatch';
  end if;

  -- 히스토리 INSERT
  insert into cooking_history (user_id, recipe_id, custom_recipe_name, rating, memo)
  values (p_user, p_recipe_id, p_custom_recipe_name, p_rating, p_memo)
  returning id into v_history_id;

  -- 소진 재료 처리
  for v_item in select * from jsonb_array_elements(p_consumed)
  loop
    v_master_id := (v_item->>'master_id')::uuid;
    v_to_consume := (v_item->>'quantity')::numeric;
    v_unit := v_item->>'unit';

    -- 조인 테이블 INSERT
    insert into cooking_history_consumed_ingredients
      (history_id, ingredient_master_id, quantity, unit)
    values (v_history_id, v_master_id, v_to_consume, v_unit);

    -- user_ingredients 부분 차감 (expires_at ASC 우선)
    v_remaining := v_to_consume;
    for v_row in
      select id, quantity
      from user_ingredients
      where user_id = p_user
        and ingredient_master_id = v_master_id
        and consumed = false
        and quantity > 0
      order by expires_at asc nulls last, created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      if v_row.quantity <= v_remaining then
        -- row 전체 소진
        update user_ingredients
        set quantity = 0, consumed = true, updated_at = now()
        where id = v_row.id;
        v_remaining := v_remaining - v_row.quantity;
      else
        -- 부분 차감
        update user_ingredients
        set quantity = quantity - v_remaining, updated_at = now()
        where id = v_row.id;
        v_remaining := 0;
      end if;
    end loop;

    -- 재료 부족 시 raise (rollback) — 비즈니스 결정에 따라 변경 가능
    -- 본 plan에서는 부족해도 에러 X (사용자가 직접 입력한 양 신뢰)
  end loop;

  return v_history_id;
end;
$$;

grant execute on function public.log_cooking_session(uuid, uuid, text, jsonb, int, text)
  to authenticated;
```

> **에러 처리**: 함수가 `raise exception` 시 트랜잭션 자동 rollback. Server Action이 `try/catch`로 잡아 한국어 메시지(`'unauthorized: auth.uid() mismatch'` → `'세션이 만료되었습니다. 다시 로그인하세요.'`) 변환.
> **check constraint `quantity >= 0`** 은 0007에서 이미 정의 (음수 차감 금지).
> **0009 트리거 + log_cooking_session double-write idempotent**: Phase 2에서 정의된 `trg_user_ingredients_auto_consume` 트리거가 `quantity = 0` 도달 시 `consumed = true`를 자동 마킹한다. `log_cooking_session` 본문도 명시적으로 `set consumed = true`를 실행 → 두 경로 모두 동일 결과. redundant하지만 안전성 우선, double-write OK (idempotent).

### 2.3 RLS 정책

- `cooking_history`: 사용자별 격리 (`auth.uid() = user_id`) — db-schema §4.1 패턴 적용
  ```sql
  alter table cooking_history enable row level security;
  create policy "cooking_history_select_own" on cooking_history
    for select using (auth.uid() = user_id);
  create policy "cooking_history_insert_own" on cooking_history
    for insert with check (auth.uid() = user_id);
  create policy "cooking_history_update_own" on cooking_history
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "cooking_history_delete_own" on cooking_history
    for delete using (auth.uid() = user_id);
  ```
- `cooking_history_consumed_ingredients`: `cooking_history` FK cascade로 격리. 별도 RLS 정책 불필요 (직접 접근 없음, RPC 통해서만 write).
- `recommend_for_ingredient` / `log_cooking_session`: `security invoker` — 호출자의 RLS context 그대로 적용. `auth.uid()` 검증은 함수 본문 내 explicit check.

### 2.4 데이터 백필

없음 (신규 테이블 + RPC).

### 2.5 마이그레이션 적용 절차

1. **파일 생성**: `apps/web/supabase/migrations/0014_cooking_history.sql`, `0015a_recommend_for_ingredient.sql`, `0015b_log_cooking_session.sql` 직접 생성. **`supabase migration new` CLI 사용 금지** (timestamp prefix 자동 부여 → 4자리 형식과 충돌, Architect 3.D)
2. **로컬 검증**: `pnpm web db:reset` (0001~0015b 전체 재실행)
3. **타입 갱신**: `pnpm web db:types` — `apps/web/src/shared/api/supabase/types.ts` 재생성 + 커밋
4. **drift 확인**: `pnpm web db:check-drift` — §2.2 SOURCE 마커 블록과 migrations/*.sql byte 일치 검증
5. **원격 적용**: `pnpm web db:push`
6. **RLS 검증**: psql로 `cooking_history` RLS 동작 + `log_cooking_session` auth.uid() 검증 확인

---

## §3 UI 작업 (FSD 레이어 + 정확한 파일 경로)

### 3.1 entities/cooking-history (신규 슬라이스)

| 파일 | 역할 |
|---|---|
| `apps/web/src/entities/cooking-history/model/types.ts` | `CookingSession` 타입 (history row + consumed ingredients) |
| `apps/web/src/entities/cooking-history/ui/history-row.tsx` | 1개 요리 기록 카드 (날짜/요리명/평점/메모) |

### 3.2 features/log-cooking-session (신규 슬라이스)

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/log-cooking-session/api/log-cooking-session.ts` | Server Action `logCookingSession(input) → Result<{ sessionId: string }, string>` |
| `apps/web/src/features/log-cooking-session/lib/build-consumed-payload.ts` | `recipe_ingredients` + `user_ingredients` → consumed jsonb shape 빌드 |
| `apps/web/src/features/log-cooking-session/ui/log-cooking-dialog.tsx` | "요리 시작" 다이얼로그 (수량 차감 미리보기 + 평점/메모 폼) |

### 3.3 features/dual-recommendation (신규 슬라이스)

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/dual-recommendation/api/queries.ts` | `useDualRecommendation(masterId)` TanStack Query hook |
| `apps/web/src/features/dual-recommendation/ui/dual-list.tsx` | 좌/우 분할 (과거 목록 / 신규 목록) + Skeleton |

### 3.4 widgets/cooking-history-list (신규)

| 파일 | 역할 |
|---|---|
| `apps/web/src/widgets/cooking-history-list/cooking-history-list.tsx` | HistoryRow 리스트 + Skeleton + 빈 상태 |

### 3.5 pages (신규 라우트)

| 파일 | 역할 |
|---|---|
| `apps/web/src/app/(app)/cooking-history/page.tsx` | RSC — `cooking_history` 조회 (`cooked_at desc`) + `CookingHistoryList` |
| `apps/web/src/app/(app)/cooking-history/loading.tsx` | `<Skeleton>` (Phase 0b primitive) |
| `apps/web/src/app/(app)/inventory/[ingredientId]/page.tsx` | RSC — `recommend_for_ingredient` RPC 호출 + `DualList` |
| `apps/web/src/app/(app)/inventory/[ingredientId]/loading.tsx` | `<Skeleton>` |

### 3.6 entities/ingredient 확장 (기존 슬라이스)

- 기존 `ingredient-row.tsx`에 클릭 핸들러 추가 → `/inventory/[ingredientId]`로 이동 (`useRouter().push`)

### 3.7 디자인 토큰 (conventions §3 inline 발췌)

- `text-heading-*`, `text-body-*-*`, `rounded-{xxs|xs|s|m|l|xl|xxl}` 만 사용
- 임의 값 `text-[14px]`, `dark:*` 사용 금지

---

## §4 로직 작업

> Server Action vs Route Handler 룰 (conventions §10 inline):

| 패턴 | 선택 |
|---|---|
| `logCookingSession` (폼 mutation) | **Server Action** |
| `recommend_for_ingredient` RPC fetch | **RSC 직접 호출** |
| 외부 API 없음 | Route Handler 없음 |

### 4.1 Server Actions

```ts
// apps/web/src/features/log-cooking-session/api/log-cooking-session.ts
'use server';

interface LogInput {
  recipeId?: string;          // null이면 custom
  customName?: string;        // recipeId 없으면 표시명
  consumed: Array<{ master_id: string; quantity: number; unit: string }>;
  rating?: number;            // 1-5
  memo?: string;
}

export async function logCookingSession(
  input: LogInput
): Promise<Result<{ sessionId: string }, string>> {
  // 1. cookies() 기반 supabase server client (createSupabaseServerClient())
  // 2. supabase.auth.getUser() → user.id
  // 3. supabase.rpc('log_cooking_session', {
  //      p_user: user.id, p_recipe_id: input.recipeId ?? null,
  //      p_custom_recipe_name: input.customName ?? null,
  //      p_consumed: input.consumed, p_rating: input.rating ?? null,
  //      p_memo: input.memo ?? null,
  //    })
  // 4. 성공 → revalidatePath('/(app)/cooking-history') + revalidatePath('/(app)/inventory')
  // 5. 실패 → 'unauthorized: auth.uid() mismatch' → '세션이 만료되었습니다. 다시 로그인하세요.'
  //          그 외 → '요리 기록 저장 중 오류가 발생했습니다. 다시 시도해 주세요.'
}
```

### 4.2 RPC 직접 호출 (RSC)

```ts
// apps/web/src/app/(app)/inventory/[ingredientId]/page.tsx (RSC)
const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');

const { data } = await supabase.rpc('recommend_for_ingredient', {
  p_user: user.id,
  p_master_id: params.ingredientId,
  p_limit_each: 5,
});
// data: [{ past_recipes: jsonb[], new_recipes: jsonb[] }]
// past_recipes 항목: { recipe_id, name, last_cooked_at, cooked_count }
// new_recipes 항목: { recipe_id, name, score, cook_minutes }
```

### 4.3 TanStack Query queryKey + invalidation

```ts
['cooking-history']                              // cooking-history 리스트
['recipes', 'for-ingredient', masterId]          // 듀얼 추천 (RSC 페이지에서는 직접 RPC)
```

invalidation: `logCookingSession` 성공 후 `['cooking-history']` + `['ingredients']` + `['inventory-summary']` 모두 invalidate (재료 차감 반영).

### 4.4 build-consumed-payload 로직

```ts
// apps/web/src/features/log-cooking-session/lib/build-consumed-payload.ts
// 입력: RecipeIngredient[] (recipe_ingredients rows) + UserIngredient[] (user_ingredients rows)
// 출력: Array<{ master_id: string; quantity: number; unit: string }>
// 로직: recipe 필수 재료 중 user가 보유한 항목만, 보유 수량 min(recipe_qty, user_qty)
```

---

## §5 외부 API 연동

해당 없음.

---

## §6 테스트 작업

> 인프라: Phase 0b 셋업 완료 가정 (Vitest + Playwright + Supabase local CLI)

### 6.1 단위 테스트 (Vitest)

- `apps/web/src/features/log-cooking-session/lib/build-consumed-payload.spec.ts`
  - recipe_ingredients 3개 + user_ingredients 3개 → consumed jsonb shape 검증
  - 재료 부족 케이스 (user qty < recipe qty) 처리 검증
  - 선택 재료 제외 케이스 검증

### 6.2 통합 테스트 (Vitest + supabase local)

- `0015b log_cooking_session RPC` — 사용자 ingredient 3개 + recipe 1개 → `cooking_history` INSERT + 부분 차감 (`expires_at asc` 우선) + RLS 격리 검증
- `0009 트리거 + log_cooking_session double-write idempotent` — `quantity = 0` update 시 `consumed = true` 트리거 발화 + RPC 내 명시 update 중복 → 최종 상태 `consumed = true` 1회 (idempotent 확인)
- `log_cooking_session 트랜잭션 rollback` — 임의 `raise exception` 주입 → `cooking_history` + `user_ingredients` 모두 rollback 확인
- `recommend_for_ingredient` — 김치찌개 1회 요리 후 양파 클릭 → `past_recipes`에 김치찌개 포함, `new_recipes`에서 김치찌개 제외 + score 정렬 검증

### 6.3 E2E 테스트 (Playwright)

- `apps/web/e2e/cooking-history-happy-path.spec.ts`
  - 가입 → 식재료 추가 + 레시피 확인 → 레시피 상세 "요리 시작" 클릭 → 다이얼로그 확인 → 확정
  - `/(app)/cooking-history`에 기록 표시 확인
  - `/(app)/inventory`에서 사용한 재료 수량 차감 확인

### 6.4 수동 smoke

- 인벤토리 재료 클릭 → `/(app)/inventory/[ingredientId]` DualList 좌/우 표시 0.5초 내
- 평점/메모 저장 후 `cooking_history`에 반영 확인
- RPC 에러 시 toast danger 한국어 메시지 표시 확인

---

## §7 Acceptance 기준

- [ ] 0014 / 0015a / 0015b 3개 마이그레이션 `pnpm web db:reset` 통과 + `pnpm web db:push` 통과
- [ ] `log_cooking_session` RPC 트랜잭션: `cooking_history` INSERT + `user_ingredients` 차감 둘 다 성공 또는 둘 다 rollback
- [ ] 부분 차감 정렬: `expires_at asc nulls last, created_at asc` — 임박 재료 우선 소진 (통합 테스트 검증)
- [ ] `quantity` 차감 후 0 도달 시 `consumed = true` (Phase 2 0009 트리거 동작 + idempotent double-write OK)
- [ ] `auth.uid() ≠ p_user` 인자 시 RPC `raise exception` → rollback → Server Action 한국어 에러 반환
- [ ] `/(app)/cooking-history` 페이지 `cooked_at desc` 정렬 표시
- [ ] `/(app)/inventory/[ingredientId]` DualList: `past_recipes` (`last_cooked_at desc`) / `new_recipes` (`score desc, cook_minutes asc`)
- [ ] `new_recipes`는 `cooking_history`에 없는 레시피만 + `score >= 0.5` 필터
- [ ] `logCookingSession` Server Action 성공 시 `['cooking-history']` + `['ingredients']` + `['inventory-summary']` invalidate
- [ ] 트랜잭션 실패 시 한국어 에러 메시지 toast danger 표시
- [ ] `pnpm web typecheck` 0 error
- [ ] `pnpm web lint` 0 error
- [ ] `pnpm web db:check-drift` 통과 (0014 / 0015a / 0015b ↔ db-schema.md SOURCE 마커 byte 일치)
- [ ] 단위 테스트 + 통합 테스트 + E2E `cooking-history-happy-path` 모두 통과

---

## §8 Definition of Done

- [ ] §7 Acceptance 기준 모두 충족
- [ ] `pnpm web typecheck` 0 error
- [ ] `pnpm web db:check-drift` 통과 (0014 / 0015a / 0015b ↔ db-schema.md)
- [ ] `pnpm web test` (단위 + 통합) 통과
- [ ] `pnpm web test:e2e` (`cooking-history-happy-path.spec.ts`) 통과
- [ ] PRD.md §3 로드맵 체크박스 업데이트 (Phase 4 완료 표시)
- [ ] `docs/CHANGELOG.md` 항목 추가 (Phase 4 결정 사항 + PoC 결과 포함)
- [ ] `gitleaks detect` 통과 (Phase 0b lefthook 설치 후 `gitleaks protect --staged` 자동)
- [ ] **모바일 웹뷰 스모크 테스트**: Vercel preview deploy → mobile env 갱신 → EAS preview build → Android sideload → "요리 시작" 다이얼로그 + DualList 정상 표시 확인 (conventions §7)
- [ ] git commit tag `v0.4.0` (선택)
- [ ] Architect 검증 (ralph 프로토콜 — 별도 호출)

### 8.5 롤백 절차

| 종류 | 절차 |
|---|---|
| 0015a / 0015b RPC 본문 수정 | `create or replace function` idempotent — 새 마이그레이션(`0015c_fix_*.sql`)으로 본문 교체. 기존 파일 직접 수정 X |
| 0014 `cooking_history` 스키마 변경 | 새 `0014b_fix_*.sql`로 `alter table` 정정. drop은 사용자 기록 손실 → 신중 |
| 0014 `cooking_history` drop (최후) | PITR (Supabase pro plan, MVP에서는 N/A). 개발 중이면 `db:reset` 후 재적용 |
| 코드 (UI / Server Action) | `git revert <commit-range>` 또는 Vercel 이전 deployment promote |
| 잘못 logged된 `cooking_history` | RLS로 사용자 본인만 delete 가능. 관리자 패널 X (사용자 직접 또는 admin client) |
| `user_ingredients` 잘못 차감 | 추가 row INSERT로 수량 보충 (사용자가 인벤토리에서 직접 편집 가능) |

---

## §9 위험 / 완화

| 위험 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| `log_cooking_session` 트랜잭션 실패 (RLS 위반 / 권한 오류) | 중 | 고 | `auth.uid()` explicit 검증 + 한국어 메시지 변환 + 재시도 버튼. Server Action `try/catch` 필수 |
| 부분 차감 정렬 오류 (FIFO vs 임박 우선) | 저 | 중 | `expires_at asc nulls last, created_at asc` 명시. 통합 테스트 `expires_at` 순서 검증 |
| `recommend_for_ingredient` + `recommend_recipes` 더블 호출 비용 | 중 | 중 | `recommend_for_ingredient` 안에서 `recommend_recipes` 단 1회 CTE 호출로 처리 |
| `cooking_history` 누적 시 쿼리 부하 (1000+ rows) | 저 | 중 | `(user_id, cooked_at desc)` 복합 인덱스 (0014) + LIMIT 페이지네이션 |
| consumed jsonb shape 불일치 (TS ↔ RPC) | 중 | 고 | `build-consumed-payload` 단위 테스트 + RPC 입력 검증 + Supabase types codegen |
| DualList 0.5초 내 미충족 (성능 목표 — conventions §13) | 저 | 중 | RSC 직접 RPC 호출 (Route Handler proxy 없음). 미충족 시 `unstable_cache` 도입 검토 |

### 9.5 관측 / 로깅

- `logCookingSession` Server Action 실패 시 `console.error(e)` + Vercel Function logs 자동 기록
- `log_cooking_session` RPC 실패율 모니터링: Supabase Dashboard → Functions → log_cooking_session 호출 기록
- `cooking_history` INSERT 누적 추이: Supabase Dashboard → Table Editor (MVR review 주 1회 권고)
- 성능 목표: 듀얼 추천 sheet 0.5초 내 표시 (conventions §13 — PRD.md §성능 참조)

---

## (선택) 일별 작업 분배

- **Day 1**: 0014 마이그레이션 + RLS 정책 + `cooking_history` 로컬 동작 확인
- **Day 2**: 0015a `recommend_for_ingredient` RPC + 단위 테스트 + `past/new` 분리 검증
- **Day 3**: 0015b `log_cooking_session` plpgsql + 트랜잭션 통합 테스트 + rollback 시뮬레이션
- **Day 4**: `features/log-cooking-session` — Server Action + `build-consumed-payload` + `LogCookingDialog`
- **Day 5**: `features/dual-recommendation` + `/(app)/inventory/[ingredientId]` 페이지
- **Day 6**: `/(app)/cooking-history` + `widgets/cooking-history-list` + 통합 검증 + 모바일 웹뷰 스모크
- **Day 7**: E2E (`cooking-history-happy-path`) + 회귀 테스트 + `pnpm web db:check-drift` + tag `v0.4.0`

## (선택) 모바일 통합

EAS preview build 1회 (conventions §7):

1. Vercel preview deploy 완료 → preview URL 확보
2. `apps/mobile/.env.preview`의 `WEB_BASE_URL` 갱신 (1줄)
3. `eas build --profile preview --platform android`
4. APK 다운 → Android sideload → 스모크 체크리스트:
   - 레시피 상세 → "요리 시작" 버튼 탭 → 다이얼로그 표시
   - 확정 → `/(app)/cooking-history`에 기록 확인
   - `/(app)/inventory`에서 해당 재료 수량 차감 확인
   - 인벤토리 재료 탭 → `/(app)/inventory/[ingredientId]` DualList 좌/우 표시
   - 인벤토리 헤더 카운트 갱신 확인 (`inventory-summary` invalidate 반영)
