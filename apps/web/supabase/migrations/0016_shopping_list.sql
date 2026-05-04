-- ───────── 0016_shopping_list.sql ─────────
-- Phase 5 §2.2 — shopping_list 테이블 + enum + index
-- Phase 5 §2.3 — RLS 4정책 (사용자별 격리, db-schema.md §4.1 패턴)
--
-- 의존성 (phase-5.md §2.1):
--   - 0001 (auth.users) — user_id FK
--   - 0005 (ingredient_master) — ingredient_master_id FK
--   - 0011 (recipe_master) — recipe_id FK (source=recipe_gap일 때)
--
-- 인용 테이블 정의 phase (phase-5.md §0.5.1):
--   - user_ingredients: Phase 1 (0007)
--   - ingredient_master: Phase 1 (0005)
--   - recipe_master: Phase 3 (0011)
--   - recipe_ingredients: Phase 3 (0011)
--
-- 결정 (phase-5.md §1.5):
--   - 단위 충돌 시 별도 row INSERT + note='단위 확인 필요' (자동 변환은 OOS)
--   - source='manual' 또는 'recipe_gap' enum 분기

create type shopping_source as enum ('manual', 'recipe_gap');

create table shopping_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_master_id uuid references ingredient_master(id),
  custom_name text,                                   -- master에 없는 직접 입력
  quantity numeric(10,2),
  unit text,
  source shopping_source not null default 'manual',
  recipe_id uuid references recipe_master(id),       -- source=recipe_gap일 때
  bought boolean not null default false,
  note text,                                          -- 단위 충돌 등 보조 메모 (예: '단위 확인 필요')
  created_at timestamptz not null default now()
);
create index shopping_list_user_active_idx on shopping_list(user_id) where bought = false;

-- ───────── RLS ─────────
alter table shopping_list enable row level security;
create policy "shopping_list_select_own" on shopping_list
  for select using (auth.uid() = user_id);
create policy "shopping_list_insert_own" on shopping_list
  for insert with check (auth.uid() = user_id);
create policy "shopping_list_update_own" on shopping_list
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shopping_list_delete_own" on shopping_list
  for delete using (auth.uid() = user_id);
