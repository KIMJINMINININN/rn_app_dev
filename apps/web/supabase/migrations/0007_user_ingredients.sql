-- ───────── user_ingredients 테이블 + 인덱스 + view ─────────
create table user_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_master_id uuid not null references ingredient_master(id),
  storage_location_id uuid not null references storage_locations(id),
  quantity numeric(10,2) not null check (quantity >= 0),
  unit text not null default '개',       -- 개/g/ml/봉지 등
  purchased_at date,
  expires_at date,                       -- nullable: 무기한 가능
  memo text,
  consumed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_ingredients_user_idx on user_ingredients(user_id) where consumed = false;
create index user_ingredients_expires_idx on user_ingredients(user_id, expires_at) where consumed = false;

-- ───────── D-Day view (current_date UTC, 클라이언트에서 KST 보정) ─────────
create view user_ingredients_with_dday as
  select *, (expires_at - current_date) as days_until_expiry
  from user_ingredients
  where consumed = false;

-- ───────── RLS (사용자별 격리, db-schema §4.1) ─────────
alter table user_ingredients enable row level security;

create policy "user_ingredients_owns_rows" on user_ingredients
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
