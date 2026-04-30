-- ───────── handle_new_user() 함수 교체 (storage_locations 추가) ─────────
-- 0002_*.sql 의 트리거는 그대로 두고, 함수 본문만 OR REPLACE 로 확장

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 1) profile 생성
  insert into public.user_profiles (user_id, display_name, timezone)
  values (new.id, '', 'Asia/Seoul')
  on conflict (user_id) do nothing;

  -- 2) 기본 보관 장소 4개 일괄 생성
  insert into public.storage_locations (user_id, name, kind, sort_order)
  values
    (new.id, '냉장실', 'fridge', 0),
    (new.id, '냉동실', 'freezer', 1),
    (new.id, '실온', 'room_temp', 2),
    (new.id, '김치냉장고', 'kimchi_fridge', 3)
  on conflict do nothing;

  return new;
end;
$$;

-- 트리거는 0002에서 생성된 on_auth_user_created 그대로 사용 (재생성 X)
