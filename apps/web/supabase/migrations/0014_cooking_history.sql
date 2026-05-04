-- ───────── 0014_cooking_history.sql ─────────
-- Phase 4 §2.2 — cooking_history + cooking_history_consumed_ingredients
-- Phase 4 §2.3 — RLS 정책 (cooking_history 사용자별 격리)
--
-- 의존성 (phase-4.md §2.1):
--   - 0011 (recipe_master) — recipe_id FK
--   - 0005 (ingredient_master) — ingredient_master_id FK
--   - auth.users — user_id FK
--
-- 인용 테이블 정의 phase (phase-4.md §0.5.1):
--   - recipe_master: Phase 3 (0011)
--   - ingredient_master: Phase 1 (0005)
--
-- RLS 정책 (phase-4.md §2.3 + db-schema §4.1):
--   - cooking_history: 사용자별 격리 (auth.uid() = user_id)
--   - cooking_history_consumed_ingredients: 별도 RLS 불필요
--     (cooking_history FK cascade로 격리, RPC 통해서만 write — 0015b log_cooking_session)

create table cooking_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references recipe_master(id),       -- null 허용 (직접 입력 요리)
  custom_recipe_name text,                            -- recipe_id null일 때 표시명
  cooked_at timestamptz not null default now(),
  rating int check (rating between 1 and 5),
  memo text
);
create index cooking_history_user_idx on cooking_history(user_id, cooked_at desc);

create table cooking_history_consumed_ingredients (
  history_id uuid not null references cooking_history(id) on delete cascade,
  ingredient_master_id uuid not null references ingredient_master(id),
  quantity numeric(10,2),
  unit text,
  primary key (history_id, ingredient_master_id)
);
create index cooking_history_consumed_ingredient_idx
  on cooking_history_consumed_ingredients(ingredient_master_id);

-- ───────── RLS ─────────
alter table cooking_history enable row level security;
create policy "cooking_history_select_own" on cooking_history
  for select using (auth.uid() = user_id);
create policy "cooking_history_insert_own" on cooking_history
  for insert with check (auth.uid() = user_id);
create policy "cooking_history_update_own" on cooking_history
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cooking_history_delete_own" on cooking_history
  for delete using (auth.uid() = user_id);

-- cooking_history_consumed_ingredients는 cooking_history FK cascade로 격리
-- 별도 RLS 정책 불필요 (직접 접근 없음, RPC 통해서만 write — log_cooking_session에서)
