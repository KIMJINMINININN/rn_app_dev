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
