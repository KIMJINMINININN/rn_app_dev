-- ───────── 0015b_log_cooking_session.sql ─────────
-- Phase 4 §2.2 — log_cooking_session(): cooking_history INSERT + user_ingredients
-- 부분 차감을 단일 트랜잭션으로 원자 보장하는 plpgsql RPC.
--
-- 의존:
--   * 0014_cooking_history.sql        — cooking_history / cooking_history_consumed_ingredients 테이블
--   * 0007_user_ingredients.sql       — user_ingredients (quantity check >= 0, consumed boolean)
--   * 0009_user_ingredient_partial_consume.sql
--                                     — trg_user_ingredients_auto_consume:
--                                       quantity = 0 도달 시 consumed = true 자동 마킹.
--                                       본 함수도 set consumed = true 명시 → double-write
--                                       OK (idempotent, 안전성 우선; phase-4.md §2.2 주석).
--
-- Architect 결정 (phase-4.md §1.5):
--   * security invoker → RLS context 보존 + auth.uid() 본문에서 explicit 검증
--   * for update lock → 동시 차감 race 방어
--   * order by expires_at asc nulls last, created_at asc → 임박 재료 우선 소진
--   * raise exception 시 트랜잭션 자동 rollback → Server Action try/catch 한국어 변환

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
