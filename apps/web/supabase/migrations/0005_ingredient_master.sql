-- ───────── ingredient_master (글로벌 시드 + 사용자 추가) ─────────
create table ingredient_master (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null = 글로벌 시드
  name text not null,
  category_id uuid references ingredient_categories(id),
  default_shelf_life_days int,           -- null = 알 수 없음
  default_storage_kind storage_kind,
  unique nulls not distinct (user_id, name)
);
create index ingredient_master_name_trgm on ingredient_master using gin (name gin_trgm_ops);

-- ───────── RLS (글로벌 + 사용자 추가, db-schema.md §4.2) ─────────
alter table ingredient_master enable row level security;

create policy "ingredient_master_select_global_or_own" on ingredient_master
  for select using (user_id is null or auth.uid() = user_id);
create policy "ingredient_master_insert_own" on ingredient_master
  for insert with check (auth.uid() = user_id);
create policy "ingredient_master_update_own" on ingredient_master
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ingredient_master_delete_own" on ingredient_master
  for delete using (auth.uid() = user_id);
-- 글로벌 row (user_id IS NULL)는 admin client(service_role)만 INSERT 가능 (RLS bypass)
