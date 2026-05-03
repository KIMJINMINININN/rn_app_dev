-- ───────── 0011_recipes.sql ─────────
-- Phase 3 §2.2 — recipe_master / recipe_ingredients + recommend_recipes() RPC
--
-- 단일 출처 상수 (conventions.md §19):
--   apps/web/src/entities/recipe/lib/scoring-constants.ts
--   - WEIGHT_REQUIRED       = 0.7
--   - WEIGHT_OPTIONAL       = 0.2
--   - WEIGHT_URGENT         = 0.1
--   - MIN_SCORE             = 0.5  (= p_min_score 기본값)
--   - SCORE_READY_THRESHOLD = 0.95 (UI 분기용)
-- TS mirror: apps/web/src/entities/recipe/lib/computeRecipeMatch.ts
-- ★ 본 SQL 본문 inline 값과 TS 상수는 반드시 동일. 변경 시 두 곳 동시 변경 (PR 룰).

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
        and ui.expires_at - current_date between 0 and 2
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
