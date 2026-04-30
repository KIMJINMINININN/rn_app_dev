-- ───────── ingredient_categories (글로벌 시드 + 사용자 추가) ─────────
create table ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null = 글로벌 시드
  name text not null,
  icon text,                             -- emoji 또는 lucide 아이콘 키
  sort_order int not null default 0,
  unique nulls not distinct (user_id, name)
);

-- ───────── RLS (글로벌 + 사용자 추가, db-schema.md §4.2) ─────────
alter table ingredient_categories enable row level security;

create policy "ingredient_categories_select_global_or_own" on ingredient_categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "ingredient_categories_insert_own" on ingredient_categories
  for insert with check (auth.uid() = user_id);
create policy "ingredient_categories_update_own" on ingredient_categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ingredient_categories_delete_own" on ingredient_categories
  for delete using (auth.uid() = user_id);
-- 글로벌 row (user_id IS NULL)는 admin client(service_role)만 INSERT 가능 (RLS bypass)

-- ───────── 글로벌 시드 12 카테고리 (db-schema.md §6) ─────────
insert into ingredient_categories (user_id, name, icon, sort_order) values
  (null, '육류',       '🥩',  0),
  (null, '해산물',     '🐟',  1),
  (null, '채소',       '🥬',  2),
  (null, '과일',       '🍎',  3),
  (null, '유제품',     '🥛',  4),
  (null, '곡물',       '🌾',  5),
  (null, '조미료',     '🧂',  6),
  (null, '가공식품',   '🥫',  7),
  (null, '음료',       '🥤',  8),
  (null, '간식',       '🍪',  9),
  (null, '김치/장류', '🥬', 10),
  (null, '기타',       '🍽️', 11);
