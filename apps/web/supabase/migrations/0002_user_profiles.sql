-- ───────── user_profiles 테이블 ─────────
create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "user_reads_own_profile" on user_profiles
  for select using (auth.uid() = user_id);
create policy "user_updates_own_profile" on user_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- INSERT 정책 없음 → handle_new_user() definer 함수만 INSERT

-- ───────── handle_new_user() 트리거 (idempotent 헤더) ─────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp   -- PG 보안: search_path 명시 필수
as $$
begin
  -- profile 생성 (auth.uid() 없는 컨텍스트라 NEW.id 사용)
  insert into public.user_profiles (user_id, display_name, timezone)
  values (new.id, '', 'Asia/Seoul')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
