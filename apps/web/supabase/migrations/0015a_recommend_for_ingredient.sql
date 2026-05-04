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
