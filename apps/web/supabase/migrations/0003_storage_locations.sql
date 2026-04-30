-- ───────── storage_kind enum + storage_locations 테이블 ─────────
create type storage_kind as enum ('fridge', 'freezer', 'room_temp', 'kimchi_fridge', 'custom');

create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                    -- 사용자 표기 (예: "주방 냉장고")
  kind storage_kind not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index storage_locations_user_idx on storage_locations(user_id);

-- ───────── RLS — INSERT 정책 없음 (handle_new_user() definer만 INSERT) ─────────
alter table storage_locations enable row level security;

create policy "storage_locations_select_own" on storage_locations
  for select using (auth.uid() = user_id);
create policy "storage_locations_update_own" on storage_locations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "storage_locations_delete_own" on storage_locations
  for delete using (auth.uid() = user_id);
-- INSERT 정책 절대 만들지 말 것 (Architect Answer 2 + db-schema.md §4.1 주석)
