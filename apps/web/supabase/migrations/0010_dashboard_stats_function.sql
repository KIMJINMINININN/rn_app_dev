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
