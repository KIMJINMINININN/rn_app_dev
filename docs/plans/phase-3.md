# Phase 3 — 레시피 마스터 + 단순 매칭 + YouTube ★ 데모 가능 MVP

> ralph 실행 단위. 본 파일 + 참조: docs/plans/db-schema.md, docs/plans/conventions.md, docs/PRD.md
>
> **상태**: 미시작
> **선행 phase**: Phase 1 (필수). Phase 2 권장 (그러나 의존 X — 병렬 가능)
> **후속 phase**: Phase 4 (히스토리), Phase 5 (장보기)
> **예상 기간**: 1.5-2주 (시드 큐레이션 1-2일 포함)
> **데모 정의**: ★ Phase 3까지 = PRD 핵심 가치 ("재료 보고 메뉴 정함") 충족. 데모 가능 MVP.

---

## §0 사전 의존성 + 환경 변수

### 체크박스
- [ ] Phase 1 완료 (Phase 2는 권장이나 의존 X)
- [ ] supabase/migrations/ 마지막 번호 확인. 본 phase 시작 번호(0011) 미만이어야 함
- [ ] Phase 1 자산: `user_ingredients`, `ingredient_master`, RLS 정책 동작
- [ ] **YouTube Data API v3 키 발급** (Google Cloud Console → Credentials → API Key). 일일 quota 10000 unit
- [ ] **레시피 시드 큐레이션 100선 데이터 준비** (PLAN.md §Phase 3에 명시 — 본 phase 1-2일 작업)
- [ ] entities/recipe 디렉토리 부재 확인 (본 phase 신규 생성)
- [ ] **마이그레이션 번호 충돌 확인** (Architect 3.F): `apps/web/supabase/migrations/` 마지막 번호 확인. 본 phase 시작 번호(0011) 미만이어야 함

### 환경 변수 (신규)
- `YOUTUBE_API_KEY` (server-only, `apps/web/.env.local`) — Route Handler `/api/youtube/search`에서만 사용

---

## §0.5 참조 자산 미리보기 (cross-phase dependencies)

### 0.5.1 인용 테이블 (Phase 1 자산)

| 테이블 | 정의 phase | 사용 컬럼 | 풀 본문 |
|---|---|---|---|
| `user_ingredients` | Phase 1 (0007) | `id`, `user_id`, `ingredient_master_id`, `quantity`, `consumed`, `expires_at` | `db-schema.md §3.2 0007` |
| `ingredient_master` | Phase 1 (0005) | `id`, `name`, `category_id` | `db-schema.md §3.2 0005` |

### 0.5.2 인용 RPC/함수

없음 (본 phase가 `recommend_recipes` 신규 생성).

### 0.5.3 영향받는 cross-cutting 룰 (conventions.md)

- §1 Result<T, string> — Server Action / Route Handler 반환
- §10 Server Action vs Route Handler — 본 phase는 **둘 다 사용**:
  - Server Action: 레시피 favorite/un-favorite (Phase 4+ 검토 — 본 phase는 read-only)
  - Route Handler: `/api/youtube/search` (외부 API proxy)
- §17 TanStack Query queryKey — `['recipes']`, `['recipes', 'recommendations', userId]`, `['recipes', 'detail', recipeId]`, `['youtube', 'search', recipeId]`
- §11 단일 출처 상수 (★ 핵심):
  - `WEIGHT_REQUIRED = 0.7`
  - `WEIGHT_OPTIONAL = 0.2`
  - `WEIGHT_URGENT = 0.1`
  - `MIN_SCORE = 0.5`
  - `SCORE_READY_THRESHOLD = 0.95`
  - 위치: `apps/web/src/entities/recipe/lib/scoring-constants.ts` (본 phase 신규)
  - SQL `recommend_recipes`도 동일 값 inline + 주석 cross-ref
  - TS mirror `computeRecipeMatch.ts`에서 import
- §6 RLS 패턴:
  - `recipe_master` / `recipe_ingredients`: read-only seed (db-schema §4.3)
  - `youtube_cache`: read-only seed (write는 admin client만)
- §8 SUPABASE_SECRET_KEY 사용 경로 — `youtube_cache` write는 Route Handler 안에서 admin client로
- §14 SUPABASE_SECRET_KEY 사용 경로 — `createSupabaseAdminClient()`는 Route Handler 내부에서만 호출

---

## §1 목표 / 출시 가능 가치

레시피 시드 100선 + 보유 재료 매칭 점수 + YouTube 영상 임베드. PRD §2.3 핵심 가치 ("재료 보고 메뉴 정함") 달성.

**가시적 변화 (★ 데모 MVP)**:
- `/(app)/recipes` — 추천 레시피 리스트 (점수 ≥ 0.5, 정렬 score desc)
- 레시피 카드: 이름 / 보유 재료율(N/M) / 부족 재료 N개 / 임박 재료 활용 배지
- 레시피 상세 (RSC + RPC 직접 호출): 전체 재료 (보유/부족 구분) / 조리법 / YouTube 영상 임베드
- 임박 재료(D-2 이하) 우선 추천 (urgent bonus 0.1 가중치)
- "지금 만들 수 있음" (score ≥ 0.95) / "재료 1-2개 부족" (0.5 ≤ score < 0.95) 섹션 분리
- 재료가 없을 시 추천 제외 (score < 0.5 → empty state)

---

## §1.5 Architect 결정 적용

**[Architect 권고 3 — recommend_recipes 알고리즘]**

매칭 공식:
```
score = 0.7 * (필수보유 / 필수전체)
      + 0.2 * (선택보유 / max(선택전체, 1))
      + 0.1 * (임박보유 / 필수전체)
```

임계값:
- ≥ 0.95 = "지금 만들 수 있음"
- 0.5 ~ 0.95 = "재료 1-2개 부족"
- < 0.5 = 추천 제외

SQL 본문 (`0011_recipes.sql`): WITH `user_have` CTE + `recipe_stats` CTE + 메인 SELECT. db-schema.md §3.2 0011 그대로 사용.

TS mirror: `entities/recipe/lib/computeRecipeMatch.ts` (단일 레시피 상세 페이지에서 사용)

호출 패턴: **RSC 직접 RPC 호출** (Route Handler 캐싱 X). 50ms 측정 후 100ms+ 시 `unstable_cache` 도입 검토.

단위 차이(g vs 개)는 Phase 3에서 무시 — 동일 단위만 매칭 (Phase 5+ 검토).

**[Architect 권고 6 — 단위 정규화]**

단위 자동 변환 (`g ↔ kg`, `개 ↔ 봉지`)은 영구 out-of-scope (§9 위험/완화 참조).

**[YouTube 캐시 결정]**

- 24h TTL → `youtube_cache.fetched_at` 체크 (`fetched_at + interval '24 hours' > now()`)
- `payload` jsonb schema: `Array<{ videoId, title, thumbnails: { medium: { url } }, channelTitle, durationSeconds? }>` 길이 ≤ 5 (db-schema.md §3.2 0013)
- INSERT/UPDATE는 admin client만 (RLS bypass) — Route Handler 내부

---

## §2 DB 마이그레이션

### 2.1 일람표 (본 phase 신규 3개)

| 번호 | 파일명 | 주요 객체 | 의존성 |
|---|---|---|---|
| 0011 | `0011_recipes.sql` | `recipe_difficulty` enum + `recipe_master` + `recipe_ingredients` + RLS + RPC `recommend_recipes()` | 0001 (pg_trgm), 0007 (user_ingredients), 0005 (ingredient_master) |
| 0012 | `0012_recipes_seed.sql` | INSERT 글로벌 시드 100선 + `recipe_ingredients` join 데이터 | 0011, 0005 (ingredient_master) |
| 0013 | `0013_youtube_cache.sql` | `youtube_cache` 테이블 (query_key PK, payload jsonb, fetched_at) + RLS | 0011 |

### 2.2 본문

#### 0011_recipes.sql

<!-- SOURCE: apps/web/supabase/migrations/0011_recipes.sql -->
```sql
create type recipe_difficulty as enum ('easy', 'medium', 'hard');

create table recipe_master (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  cook_minutes int,
  difficulty recipe_difficulty not null default 'easy',
  servings int default 2,
  instructions_md text,                  -- 레시피 본문 (markdown)
  created_at timestamptz not null default now()
);

create table recipe_ingredients (
  recipe_id uuid not null references recipe_master(id) on delete cascade,
  ingredient_master_id uuid not null references ingredient_master(id),
  quantity numeric(10,2),
  unit text,
  is_optional boolean not null default false,
  primary key (recipe_id, ingredient_master_id)
);
create index recipe_ingredients_master_idx on recipe_ingredients(ingredient_master_id);

-- ───────── 매칭 공식 ─────────
-- score = 0.7 * (필수보유/필수전체)
--       + 0.2 * (선택보유/max(선택전체, 1))
--       + 0.1 * (임박보유/필수전체)
--
-- 임계값:
--   ≥ 0.95 → "지금 만들 수 있음"
--   0.5 ~ 0.95 → "재료 1-2개 부족"
--   < 0.5 → 추천 제외 (호출자가 필터링)
--
-- 단일 출처 상수: apps/web/src/entities/recipe/lib/scoring-constants.ts
--   WEIGHT_REQUIRED = 0.7, WEIGHT_OPTIONAL = 0.2, WEIGHT_URGENT = 0.1
--   MIN_SCORE = 0.5, SCORE_READY_THRESHOLD = 0.95
--   TS↔SQL 동치성 보장 — 변경 시 두 파일 동시 변경 필수 (PR 룰)

create or replace function public.recommend_recipes(
  p_user uuid,
  p_min_score real default 0.5,
  p_limit int default 30
)
returns table (
  recipe_id uuid,
  name text,
  description text,
  cook_minutes int,
  difficulty recipe_difficulty,
  servings int,
  required_total int,
  required_have int,
  optional_total int,
  optional_have int,
  urgent_have int,
  score real,
  missing_required jsonb,
  missing_optional jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  -- 사용자 보유 + 임박 재료 집합 (consumed=false, quantity>0)
  with user_have as (
    select
      ui.ingredient_master_id,
      bool_or(
        ui.expires_at is not null
        and ui.expires_at - current_date <= 2
      ) as has_urgent
    from user_ingredients ui
    where ui.user_id = p_user
      and ui.consumed = false
      and ui.quantity > 0
    group by ui.ingredient_master_id
  ),
  recipe_stats as (
    select
      r.id as recipe_id,
      r.name,
      r.description,
      r.cook_minutes,
      r.difficulty,
      r.servings,
      count(*) filter (where ri.is_optional = false)::int as required_total,
      count(*) filter (
        where ri.is_optional = false and uh.ingredient_master_id is not null
      )::int as required_have,
      count(*) filter (where ri.is_optional = true)::int as optional_total,
      count(*) filter (
        where ri.is_optional = true and uh.ingredient_master_id is not null
      )::int as optional_have,
      count(*) filter (
        where ri.is_optional = false
          and uh.ingredient_master_id is not null
          and uh.has_urgent = true
      )::int as urgent_have,
      jsonb_agg(
        jsonb_build_object(
          'ingredient_master_id', ri.ingredient_master_id,
          'quantity', ri.quantity,
          'unit', ri.unit
        )
      ) filter (
        where ri.is_optional = false and uh.ingredient_master_id is null
      ) as missing_required,
      jsonb_agg(
        jsonb_build_object(
          'ingredient_master_id', ri.ingredient_master_id,
          'quantity', ri.quantity,
          'unit', ri.unit
        )
      ) filter (
        where ri.is_optional = true and uh.ingredient_master_id is null
      ) as missing_optional
    from recipe_master r
    join recipe_ingredients ri on ri.recipe_id = r.id
    left join user_have uh on uh.ingredient_master_id = ri.ingredient_master_id
    group by r.id
  )
  select
    rs.recipe_id,
    rs.name,
    rs.description,
    rs.cook_minutes,
    rs.difficulty,
    rs.servings,
    rs.required_total,
    rs.required_have,
    rs.optional_total,
    rs.optional_have,
    rs.urgent_have,
    (
      0.7 * (rs.required_have::real / nullif(rs.required_total, 0))
      + 0.2 * (rs.optional_have::real / greatest(rs.optional_total, 1))
      + 0.1 * (rs.urgent_have::real / nullif(rs.required_total, 0))
    )::real as score,
    coalesce(rs.missing_required, '[]'::jsonb) as missing_required,
    coalesce(rs.missing_optional, '[]'::jsonb) as missing_optional
  from recipe_stats rs
  where rs.required_total > 0
    and (
      0.7 * (rs.required_have::real / nullif(rs.required_total, 0))
      + 0.2 * (rs.optional_have::real / greatest(rs.optional_total, 1))
      + 0.1 * (rs.urgent_have::real / nullif(rs.required_total, 0))
    ) >= p_min_score
  order by score desc, rs.cook_minutes asc nulls last
  limit p_limit;
$$;

grant execute on function public.recommend_recipes(uuid, real, int)
  to authenticated;

-- ───────── RLS ─────────
alter table recipe_master enable row level security;
create policy "anyone_can_read" on recipe_master for select using (true);
-- INSERT 정책 없음 → admin client (service role)만 write 가능

alter table recipe_ingredients enable row level security;
create policy "anyone_can_read" on recipe_ingredients for select using (true);
-- INSERT 정책 없음 → admin client만 write
```

#### 0012_recipes_seed.sql

<!-- SOURCE: apps/web/supabase/migrations/0012_recipes_seed.sql -->
```sql
-- 레시피 100선 INSERT (큐레이션 결과)
-- 내용: 한식 50선 + 양식/일식/중식 50선 직접 큐레이션
-- 각 레시피: name / description / cook_minutes / difficulty / servings / instructions_md
--            + 필수재료 5–8개 + 선택재료 2–4개
-- 카테고리 분포: 한식 30 / 양식 20 / 중식 10 / 일식 10 / 분식 10 / 디저트 10 / 기타 10
-- 실제 데이터는 Phase 3 큐레이션 작업 중 CSV → SQL 변환 스크립트로 생성됨
-- (apps/web/supabase/seeds/recipes_to_sql.mjs 1회용 스크립트)
--
-- 시드 큐레이션 가이드:
--   - 평균 5-7개 재료 / 레시피 (필수 5-8 + 선택 2-4)
--   - 50% 이상이 마트 가공식품 + 흔한 식재료 조합으로 가능
--   - cook_minutes / difficulty / servings 필수 채움
--   - recipe_ingredients.unit은 ingredient_master 시드와 동일 단위 사용 (매칭 정확도 보장)
--
-- 검증: pnpm web db:reset 후 select count(*) from recipe_master = 100
```

#### 0013_youtube_cache.sql

<!-- SOURCE: apps/web/supabase/migrations/0013_youtube_cache.sql -->
```sql
create table youtube_cache (
  query_key text primary key,            -- e.g., "recipe:김치찌개"
  payload jsonb not null,                -- YouTube API 응답 일부 (아래 명시)
  fetched_at timestamptz not null default now()
);
-- 24h 후 stale 처리: SELECT 시 fetched_at + interval '24 hours' > now() 체크

-- payload jsonb schema (TypeScript 기준):
-- type YoutubeCachePayload = Array<{
--   videoId: string;
--   title: string;
--   thumbnails: { medium: { url: string; width: number; height: number } };
--   channelTitle: string;
--   durationSeconds?: number;   // contentDetails.duration 파싱 후 저장 (선택)
-- }>;  // 길이 ≤ 5

-- ───────── RLS ─────────
alter table youtube_cache enable row level security;
create policy "anyone_can_read" on youtube_cache for select using (true);
-- INSERT/UPDATE는 admin client(service role)에서만 → RLS bypass
```

### 2.3 RLS 정책

| 테이블 | 패턴 | 근거 |
|---|---|---|
| `recipe_master` | read-only seed — 인증된 모든 사용자 SELECT, write admin only | db-schema.md §4.3 |
| `recipe_ingredients` | 동일 | db-schema.md §4.3 |
| `youtube_cache` | read-only seed — SELECT 허용, write admin client only | db-schema.md §4.3 |

### 2.4 데이터 백필

**시드 큐레이션 절차 (Day 1-2)**:
1. CSV 파일 작성 (`apps/web/supabase/seeds/recipes_100.csv`): `name, description, cook_minutes, difficulty, servings, instructions_md` 컬럼
2. `recipe_ingredients` CSV: `recipe_name, ingredient_name, quantity, unit, is_optional`
3. 1회용 변환 스크립트 (`apps/web/supabase/seeds/recipes_to_sql.mjs`) 실행 → `0012_recipes_seed.sql` 생성

**카테고리 분포 가이드**:
- 한식 30 / 양식 20 / 중식 10 / 일식 10 / 분식 10 / 디저트 10 / 기타 10
- 평균 5-7개 재료 / 레시피 (recipe_ingredients ~600 row 예상)
- 50% 이상이 마트 가공식품 + 흔한 식재료 조합으로 가능
- `recipe_ingredients.unit`은 `ingredient_master` 시드와 동일 단위 사용 (Phase 3 단위 무시 정책이지만 큐레이션 시 일치시키면 매칭률 향상)

**시드 검증**: `pnpm web db:reset` 후 `select count(*) from recipe_master` = 100, `select count(*) from recipe_ingredients` ≈ 600

---

## §3 UI 작업 (FSD 레이어 + 정확한 파일 경로)

### 3.1 entities/recipe (신규 슬라이스)

| 파일 | 역할 |
|---|---|
| `apps/web/src/entities/recipe/model/types.ts` | `RecipeMaster`, `RecipeIngredient`, `RecipeWithMatch`, `Recommendation` 타입 |
| `apps/web/src/entities/recipe/lib/scoring-constants.ts` | `WEIGHT_REQUIRED = 0.7`, `WEIGHT_OPTIONAL = 0.2`, `WEIGHT_URGENT = 0.1`, `MIN_SCORE = 0.5`, `SCORE_READY_THRESHOLD = 0.95` (★ 단일 출처 — conventions.md §19) |
| `apps/web/src/entities/recipe/lib/computeRecipeMatch.ts` | TS mirror — 단일 레시피 점수 계산 (SQL recommend_recipes와 동치) |
| `apps/web/src/entities/recipe/ui/recipe-card.tsx` | 추천 카드 (이름 + 점수 배지 N/M + 부족 재료 N개 + 임박 활용 배지) |
| `apps/web/src/entities/recipe/ui/match-score.tsx` | 점수 시각화 (progress bar 0-100% + 임계값 color 분기) |
| `apps/web/src/entities/recipe/ui/missing-ingredients-list.tsx` | 부족 재료 리스트 (missing_required / missing_optional jsonb 결과 렌더) |
| `apps/web/src/entities/recipe/ui/recipe-youtube-embed.tsx` | `<iframe>` lazy mount (Intersection Observer, privacy-enhanced `youtube-nocookie.com`) — Client Component |

### 3.2 features/list-recommendations

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/list-recommendations/api/queries.ts` | `useRecipeRecommendations(userId)` — RSC hydration 또는 client TanStack Query |

### 3.3 features/youtube-embed

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/youtube-embed/api/route-handler.ts` | `/api/youtube/search?q=...` Route Handler 로직 (admin client cache lookup → YouTube API → cache write) |

### 3.4 features/view-recipe-match

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/view-recipe-match/ui/ingredient-match-breakdown.tsx` | 레시피 상세 — 보유/부족 재료 분리 표시 |

### 3.5 widgets/recipe-recommendations

| 파일 | 역할 |
|---|---|
| `apps/web/src/widgets/recipe-recommendations/recipe-recommendations.tsx` | "지금 만들 수 있는 요리" (score ≥ 0.95) / "재료 1-2개 부족" (0.5 ≤ score < 0.95) 섹션 분리 + RecipeCard 그리드 + Skeleton 로딩 |

### 3.6 widgets/recipe-detail

| 파일 | 역할 |
|---|---|
| `apps/web/src/widgets/recipe-detail/recipe-detail.tsx` | 전체 재료 (보유/부족 구분) + 조리법 텍스트(instructions_md 렌더) + YouTube 임베드 |

### 3.7 pages

| 파일 | 역할 |
|---|---|
| `apps/web/src/app/(app)/recipes/page.tsx` | RSC — `recommend_recipes` RPC 직접 호출 → RecipeRecommendations widget |
| `apps/web/src/app/(app)/recipes/[id]/page.tsx` | RSC — recipe 상세 + computeRecipeMatch (TS mirror) + YouTube fetch (Route Handler 통해) |
| `apps/web/src/app/(app)/recipes/loading.tsx` | Skeleton |
| `apps/web/src/app/api/youtube/search/route.ts` | Route Handler — YouTube proxy (아래 §4.2 참조) |
| `apps/web/src/widgets/app-shell/bottom-nav.tsx` | "레시피" 탭 활성화 (기존 파일 수정) |

---

## §4 로직 작업

### 4.1 scoring-constants.ts 본문

```ts
// apps/web/src/entities/recipe/lib/scoring-constants.ts
// ★ 단일 출처 상수 (conventions.md §19)
// SQL 0011_recipes.sql recommend_recipes() 본문 inline 값과 동일. 변경 시 둘 다 변경 필수.
export const WEIGHT_REQUIRED = 0.7;
export const WEIGHT_OPTIONAL = 0.2;
export const WEIGHT_URGENT = 0.1;
export const SCORE_READY_THRESHOLD = 0.95;
export const MIN_SCORE = 0.5;
```

### 4.2 computeRecipeMatch.ts 본문 (TS↔SQL 동치)

```ts
// apps/web/src/entities/recipe/lib/computeRecipeMatch.ts
import {
  WEIGHT_REQUIRED,
  WEIGHT_OPTIONAL,
  WEIGHT_URGENT,
} from './scoring-constants';

export type RecipeIngredient = {
  ingredient_master_id: string;
  is_optional: boolean;
  quantity?: number | null;
  unit?: string | null;
};

export type UserIngredientView = {
  ingredient_master_id: string;
  expires_at: string | null;   // ISO date
  consumed: boolean;
  quantity: number;
};

export type RecipeMatchResult = {
  score: number;
  required_total: number;
  required_have: number;
  optional_total: number;
  optional_have: number;
  urgent_have: number;
  missing_required: RecipeIngredient[];
  missing_optional: RecipeIngredient[];
};

const URGENT_DAYS = 2;

function isUrgent(expiresAt: string | null, today: Date): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt);
  const diffDays = Math.floor(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays >= 0 && diffDays <= URGENT_DAYS;
}

export function computeRecipeMatch(
  recipeIngredients: RecipeIngredient[],
  userIngredients: UserIngredientView[],
  today: Date = new Date(),
): RecipeMatchResult {
  const haveSet = new Set<string>();
  const urgentSet = new Set<string>();
  for (const ui of userIngredients) {
    if (ui.consumed || ui.quantity <= 0) continue;
    haveSet.add(ui.ingredient_master_id);
    if (isUrgent(ui.expires_at, today)) {
      urgentSet.add(ui.ingredient_master_id);
    }
  }

  let requiredTotal = 0;
  let requiredHave = 0;
  let optionalTotal = 0;
  let optionalHave = 0;
  let urgentHave = 0;
  const missingRequired: RecipeIngredient[] = [];
  const missingOptional: RecipeIngredient[] = [];

  for (const ri of recipeIngredients) {
    if (ri.is_optional) {
      optionalTotal++;
      if (haveSet.has(ri.ingredient_master_id)) optionalHave++;
      else missingOptional.push(ri);
    } else {
      requiredTotal++;
      if (haveSet.has(ri.ingredient_master_id)) {
        requiredHave++;
        if (urgentSet.has(ri.ingredient_master_id)) urgentHave++;
      } else {
        missingRequired.push(ri);
      }
    }
  }

  if (requiredTotal === 0) {
    return {
      score: 0,
      required_total: 0,
      required_have: 0,
      optional_total: optionalTotal,
      optional_have: optionalHave,
      urgent_have: 0,
      missing_required: [],
      missing_optional: missingOptional,
    };
  }

  const score =
    WEIGHT_REQUIRED * (requiredHave / requiredTotal) +
    WEIGHT_OPTIONAL * (optionalHave / Math.max(optionalTotal, 1)) +
    WEIGHT_URGENT * (urgentHave / requiredTotal);

  return {
    score,
    required_total: requiredTotal,
    required_have: requiredHave,
    optional_total: optionalTotal,
    optional_have: optionalHave,
    urgent_have: urgentHave,
    missing_required: missingRequired,
    missing_optional: missingOptional,
  };
}
```

### 4.3 Route Handler — YouTube proxy

```ts
// apps/web/src/app/api/youtube/search/route.ts
// ★ YOUTUBE_API_KEY는 server-only env. 클라이언트 노출 절대 금지.
// ★ youtube_cache write는 admin client만 (RLS bypass) — conventions.md §14

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q');
  if (!q) return Response.json({ ok: false, error: '검색어가 없습니다' });

  const supabase = createSupabaseAdminClient();  // server-only

  // 1. youtube_cache lookup (24h TTL)
  const queryKey = `recipe:${q}`;
  const { data: cached } = await supabase
    .from('youtube_cache')
    .select('payload, fetched_at')
    .eq('query_key', queryKey)
    .single();

  if (cached && new Date(cached.fetched_at).getTime() + 24 * 60 * 60 * 1000 > Date.now()) {
    console.info(`[youtube_cache] HIT for "${queryKey}"`);
    return Response.json({ ok: true, data: cached.payload });
  }

  // 2. miss면 YouTube Data API v3 호출
  //    search.list = 100 unit, videos.list = 1 unit
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[youtube] YOUTUBE_API_KEY not set');
    return Response.json({ ok: true, data: [] });
  }

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=5&key=${apiKey}`
    );
    const searchJson = await searchRes.json();

    if (searchJson.error?.errors?.[0]?.reason === 'quotaExceeded') {
      console.warn('[youtube] quota exceeded');
      return Response.json({ ok: true, data: [], warning: 'quotaExceeded' });
    }

    const payload = (searchJson.items ?? []).map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown>;
      const thumbnails = snippet.thumbnails as Record<string, unknown>;
      return {
        videoId: (item.id as Record<string, unknown>).videoId,
        title: snippet.title,
        thumbnails: { medium: (thumbnails.medium as Record<string, unknown>) ?? thumbnails.default },
        channelTitle: snippet.channelTitle,
      };
    });

    // 3. cache write (admin client, upsert)
    await supabase.from('youtube_cache').upsert({
      query_key: queryKey,
      payload,
      fetched_at: new Date().toISOString(),
    });
    console.info(`[youtube_cache] MISS + WRITE for "${queryKey}"`);

    return Response.json({ ok: true, data: payload });
  } catch (e) {
    console.error('[youtube] API call failed', e);
    return Response.json({ ok: true, data: [] });
  }
}
```

### 4.4 TanStack Query queryKey 규약

```ts
['recipes']                                    // prefix — invalidate all recipes
['recipes', 'recommendations', userId]         // recommend_recipes (RSC hydration)
['recipes', 'detail', recipeId]                // 단일 레시피
['youtube', 'search', recipeId]                // YouTube 결과 (24h staleTime)
```

staleTime 설정:
- `['recipes', 'recommendations', ...]` — 5분 (RPC 비용)
- `['youtube', 'search', ...]` — 24시간 (cache TTL과 동일)

### 4.5 RSC 호출 패턴 (recipes/page.tsx)

```ts
// apps/web/src/app/(app)/recipes/page.tsx
// RSC 직접 RPC 호출 — Route Handler 없음
// 응답 시간 측정: 100ms+ 시 unstable_cache(Next 16) 도입 검토

const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');

const { data: recommendations } = await supabase.rpc('recommend_recipes', {
  p_user: user.id,
  p_min_score: MIN_SCORE,  // import from scoring-constants
  p_limit: 30,
});
```

---

## §5 외부 API 연동

### 5.1 YouTube Data API v3

- Endpoint: `https://www.googleapis.com/youtube/v3/search` (q=레시피명, type=video, maxResults=5)
- 후속 (선택): `https://www.googleapis.com/youtube/v3/videos` (id=..., part=contentDetails,snippet) — durationSeconds 확보
- 인증: API Key (query string `key=`)
- 일일 quota: 10000 unit (search.list = 100 unit, videos.list = 1 unit) → 100 검색/일 가능

**캐싱 전략**: 24h TTL. cache hit 시 quota 0 소모.

**에러 처리**:
- `quotaExceeded` → `{ ok: true, data: [], warning: 'quotaExceeded' }` + toast "오늘 YouTube 검색 한도를 초과했습니다. 내일 다시 시도해주세요." — 페이지 깨짐 없음 (graceful degradation)
- 네트워크 오류 → `{ ok: true, data: [] }` (YouTube 없이 레시피 상세 표시)
- `YOUTUBE_API_KEY` 미설정 → 빈 배열 반환 (개발환경 graceful)

### 5.2 키 관리

- `YOUTUBE_API_KEY` — `apps/web/.env.local` (server-only, `NEXT_PUBLIC_` prefix 절대 금지)
- Vercel 프로덕션: Vercel Dashboard → Project Settings → Environment Variables
- 클라이언트 번들에 노출 절대 금지. Route Handler 안에서만 `process.env.YOUTUBE_API_KEY` 참조

---

## §6 테스트 작업

### 6.1 단위 (Vitest)

**`entities/recipe/lib/scoring-constants.spec.ts`**:
- 상수 합 sanity: `WEIGHT_REQUIRED + WEIGHT_OPTIONAL + WEIGHT_URGENT === 1.0`
- 각 상수 값 고정 확인 (drift 감지용)

**`entities/recipe/lib/computeRecipeMatch.spec.ts`** (5-7 fixture):

| fixture | 설명 | 기대 결과 |
|---|---|---|
| full_match | 필수 5/5 보유 + 선택 2/2 보유 | score = 0.7 + 0.2 = 0.9 |
| partial_required | 필수 3/5 보유 | score = 0.7 * 0.6 = 0.42 → MIN_SCORE 미달 |
| no_optional | 필수 5/5 보유 + 선택 0개 | score = 0.7 |
| urgent_bonus | 필수 5/5 보유 + 임박 1개 | score = 0.7 + 0.1 * (1/5) = 0.72 |
| all_missing | 보유 0 | score = 0 |
| unit_mismatch | 보유 재료 있으나 단위 다름 | Phase 3: 단위 무시, ingredient_master_id 일치만 보므로 보유로 판정 |
| empty_user_inventory | userIngredients = [] | score = 0, missing_required = 전체 |

### 6.2 통합 (Vitest + supabase local)

- **recommend_recipes RPC 정합성**: 시드 100 + 사용자 5 재료 INSERT → `supabase.rpc('recommend_recipes', ...)` → score desc 정렬 + `missing_required` jsonb shape 검증 (`ingredient_master_id`, `quantity`, `unit` 키 존재)
- **TS↔SQL 동치성**: 동일 fixture에 대해 TS `computeRecipeMatch` 결과와 SQL RPC 결과 score 차이 `< 0.0001` (소수점 4자리)
- **youtube_cache admin write + RLS read**: admin client로 INSERT → 인증된 클라이언트로 SELECT → 데이터 일치. 미인증 클라이언트 SELECT → 결과 반환 (read-only seed policy)

### 6.3 E2E (Playwright)

**`e2e/recipes-happy-path.spec.ts`**:
1. 가입 → 식재료 5개 추가 (시드 데이터에서 레시피 재료와 겹치는 항목)
2. `/(app)/recipes` 진입 → 추천 리스트 1개 이상 표시 + 섹션 헤더 확인
3. 첫 번째 카드 클릭 → `/(app)/recipes/[id]` 진입
4. 재료 목록 (보유/부족 구분) 표시 확인
5. YouTube 썸네일 렌더링 확인 (E2E에서는 cached fixture mock 또는 실제 캐시 히트)
6. 재료 없는 상태에서 recipes 페이지 진입 → empty state 표시

### 6.4 수동 smoke

- 시드 100 row INSERT 확인 (`count(*) from recipe_master` = 100)
- 임박 재료(D-2 이하) 있는 사용자 → 해당 재료 사용 레시피가 상위 노출 (urgent bonus 확인)
- YouTube cache miss → API 호출 → 응답 < 500ms → 재호출 시 cache hit
- quotaExceeded 모킹 → 페이지 깨지지 않음 + toast 표시
- 모바일 웹뷰: YouTube iframe (`youtube-nocookie.com`) 정상 렌더

---

## §7 Acceptance 기준

- [ ] 0011/0012/0013 3개 마이그레이션 적용 (`pnpm web db:reset` 성공)
- [ ] `recipe_master` 시드 정확히 100 row, `recipe_ingredients` ≈ 600 row (평균 6 재료)
- [ ] `recommend_recipes` RPC 응답 시간 < 100ms (사용자 ingredients 5-20개 기준, EXPLAIN ANALYZE 확인)
- [ ] `/(app)/recipes` 페이지 RSC 초기 로딩 < 800ms (recommend_recipes 포함)
- [ ] 매칭 공식: 필수 100% 보유 + 임박 1개 활용 시 score = 0.7 + 0.1*(1/N) — TS↔SQL 차이 ≤ 0.0001
- [ ] `MIN_SCORE` 0.5 미만 레시피는 추천 리스트에서 제외
- [ ] 재료 0개 상태에서 recipes 페이지 진입 → empty state 정상 표시 (score < 0.5 → 전체 제외)
- [ ] YouTube cache hit율: 동일 레시피 2회 이상 조회 시 100% hit (Route Handler 로직)
- [ ] `/api/youtube/search` cache miss → DB write → 같은 query 재호출 시 DB hit
- [ ] `computeRecipeMatch.spec.ts` 5-7 fixture 모두 통과
- [ ] TS↔SQL 동치성 통합 테스트 통과 (score 차이 < 0.0001)
- [ ] `recipes-happy-path` E2E 통과
- [ ] `scoring-constants.spec.ts` 통과 (합 = 1.0)
- [ ] YouTube quota 초과 시 페이지 깨지지 않음 (graceful degradation)

---

## §8 Definition of Done

- [ ] 모든 §7 Acceptance 기준 충족
- [ ] `pnpm web typecheck` 0 errors
- [ ] `pnpm web db:check-drift` 통과 (0011/0012/0013 ↔ db-schema.md 동기화)
- [ ] `pnpm web test` (단위 + 통합) 통과
- [ ] `pnpm web test:e2e` 통과
- [ ] **모바일 웹뷰 스모크 테스트**: 추천 리스트 + 레시피 상세 + YouTube 썸네일 정상 표시 (conventions.md §7 절차)
- [ ] git commit + tag `v0.3.0` (선택, 데모 MVP 마일스톤)
- [ ] `docs/CHANGELOG.md` Phase 3 항목 추가

### 8.5 롤백 절차

| 종류 | 절차 |
|---|---|
| 0011 RPC 본문 수정 | `create or replace function` idempotent. 새 마이그레이션으로 본문 교체 (0011a_fix_*.sql) |
| 0012 시드 변경 | DELETE old rows + INSERT new (마이그레이션 0012b로) |
| 0013 스키마 변경 | 새 마이그레이션 0013a로 ALTER TABLE |
| YouTube API 키 노출 | 즉시 Google Cloud Console에서 revoke + 새 키 발급 + Vercel env 갱신 |
| 코드 (UI/Route Handler) | `git revert` |
| `youtube_cache` stale 데이터 | `delete from youtube_cache where fetched_at < now() - interval '24 hours'` |
| `scoring-constants.ts` 값 변경 | TS 변경 + SQL 마이그레이션 inline 주석 갱신 동시 커밋 (PR 룰) |

---

## §9 위험 / 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| 시드 100선 큐레이션 시간 초과 (1-2일 예상) | phase 일정 지연 | Day 1-2에 50선, Day 3-4에 50선 분할. 부족 시 phase 1.5주 → 2주 연장 허용 |
| `recommend_recipes` 응답 시간 ≥ 100ms | 페이지 TTI 저하 | RSC 직접 RPC. 100ms+ 시 `unstable_cache`(Next 16) 도입 + EXPLAIN ANALYZE로 `recipe_ingredients_master_idx` 활용 확인 |
| YouTube quota 초과 (10000 unit/일) | 검색 실패 | 24h cache + cache miss 시 search.list 1회/레시피 (100 unit). 일일 100 검색 한도. quotaExceeded 시 graceful degradation (toast + 빈 배열) |
| TS↔SQL drift (가중치 변경 누락) | 매칭 점수 불일치 | `scoring-constants.ts` 단일 출처 + 통합 테스트 동치성 검증 + PR 룰 (SQL 변경 시 TS 변경 강제) |
| YouTube API 키 노출 | quota 도용 / 비용 폭탄 | server-only env (`NEXT_PUBLIC_` 금지) + Route Handler 내부만 호출 + gitleaks hook |
| 단위 차이 (g vs 개) → 매칭 누락 | 재료 있어도 미보유 판정 | Phase 3 의도적 무시 (★ 영구 OOS — conventions.md §19: 단위 자동 변환 out-of-scope). 시드 큐레이션 시 `ingredient_master` 시드와 동일 단위 사용으로 완화 |
| 레시피 100선 큐레이션 품질 | 매칭률 낮음 | 큐레이션 가이드 준수 (평균 5-7 재료, 50% 이상 흔한 식재료 조합) |

### 9.5 관측 / 로깅

- YouTube API 응답 시간 + cache hit/miss 비율: Route Handler 내 `console.info('[youtube_cache] HIT/MISS')` → Vercel logs
- `recommend_recipes` RPC 응답 시간: Supabase Dashboard → SQL Editor → EXPLAIN ANALYZE (슬로우 쿼리 로그)
- quota 초과율: `console.warn('[youtube] quota exceeded')` → Vercel logs 모니터링

---

## (선택) 일별 작업 분배

- **Day 1-2**: 레시피 100선 큐레이션 (CSV 작성 → `recipes_to_sql.mjs` 변환 → `0012_recipes_seed.sql`)
- **Day 3**: 0011 마이그레이션 (`recommend_recipes` SQL 본문 + RLS) + `scoring-constants.ts` + `computeRecipeMatch.ts` + 단위 테스트 5-7 fixture
- **Day 4**: 0012 시드 적용 + 0013 youtube_cache + RLS 검증 + TS↔SQL 통합 동치성 테스트
- **Day 5**: `entities/recipe` 슬라이스 (types / RecipeCard / MatchScore / MissingIngredientsList / RecipeYouTubeEmbed)
- **Day 6**: `features/list-recommendations` + `features/youtube-embed` Route Handler + `features/view-recipe-match`
- **Day 7**: pages — `/(app)/recipes/page.tsx` + `/(app)/recipes/[id]/page.tsx` + `loading.tsx` + BottomNav "레시피" 탭 활성화
- **Day 8**: 통합 테스트 + E2E `recipes-happy-path.spec.ts`
- **Day 9-10**: 모바일 웹뷰 스모크 테스트 + 회귀 + `v0.3.0` 태그 + CHANGELOG

## (선택) 모바일 통합 (EAS preview)

1. Vercel preview deploy 완료 (YOUTUBE_API_KEY 환경 변수 포함)
2. preview URL → `apps/mobile/.env.preview` `WEB_BASE_URL` 갱신
3. `eas build --profile preview --platform android` → APK 다운로드 → sideload
4. 스모크 체크리스트:
   - [ ] 추천 레시피 리스트 표시
   - [ ] 레시피 상세 진입 (보유/부족 재료 구분)
   - [ ] YouTube 썸네일 렌더링
   - [ ] YouTube iframe (`youtube-nocookie.com`) 모바일 웹뷰에서 정상 동작
   - [ ] quota 초과 상태 graceful degradation (토스트 표시)
