# DB Schema — 스마트 냉장고 매니저

> 본 문서는 derivative SSoT view. 1차 SSoT는 `apps/web/supabase/migrations/*.sql` 파일.
> 본 문서가 다루는 범위: 모든 phase(0a~6)의 마이그레이션 스키마, RLS 패턴, 충돌 회피 룰, db:* 스크립트.
> 변경 시 SSoT 우선순위 표(§1) 따를 것.

---

## §1. SSoT 우선순위 + 마이그레이션 번호 룰

### 1.1 변경 흐름 우선순위 (Architect 권고 1.A)

| 변경 종류 | 1차 SSoT (먼저 수정) | 2차 동기화 (자동/수동) |
|---|---|---|
| 새 마이그레이션 추가 | `apps/web/supabase/migrations/*.sql` | (a) `db-schema.md §3` (b) `phase-N.md §2.2` |
| 기존 마이그레이션 수정 (개발 중) | 동일 | 동일 |
| 적용된 마이그레이션 정정 | 새 `0NNNa_fix_*.sql` (immutable) | 동일 |
| RLS 패턴 룰 변경 | `conventions.md §5/§6` | `db-schema.md §4` |
| RPC/함수 시그니처 변경 | `migrations/*.sql` | (a) `types.ts` (db:types 재실행) (b) `phase-N.md §2.2` (c) `db-schema.md §3` |

**핵심 룰**: `migrations/*.sql`이 **유일한 SSoT**. db-schema.md / phase-N.md는 모두 derivative (1 source + 2 view).

### 1.2 마이그레이션 파일 네이밍 룰

- 형식: `0NNN_<snake_name>.sql` (4자리 zero-padded + underscore + descriptive name)
- 동일 phase 내 다중 RPC 분리 시: `0NNNa_*.sql`, `0NNNb_*.sql` (alpha suffix)
- `supabase migration new` CLI **사용 금지** (timestamp prefix 자동 부여 → 형식 충돌). 대신 `apps/web/supabase/migrations/0NNN_<snake_name>.sql` 직접 생성.
- Supabase CLI는 lexicographic 정렬 사용 → `0008 < 0008b < 0009` 보장.

### 1.3 충돌 회피 룰 (6 케이스)

| 상황 | 다음 번호 결정 |
|---|---|
| 정상 진행 | 마지막 + 1 |
| 같은 phase 다중 RPC 분리 | 0NNNa, 0NNNb |
| 적용된 후 정정 | 새 0MMM_fix_*.sql (절대 수정 금지) |
| Phase 진행 중 추가 | 그 phase 마지막 다음 |
| ralph ↔ 사용자 동시 작업 | git stash → ralph 번호 +1 → stash pop |
| 다른 phase 번호 침범 | 다음 phase 시작 전이면 OK, 후면 0NNNb |

### 1.4 ralph 시작 시 체크 (모든 phase §0 사전 의존성 마지막)

```
- [ ] supabase/migrations/ 마지막 번호 확인. 본 phase 시작 번호 미만이어야 함.
```

---

## §2. db:* 스크립트 일람 (apps/web/package.json)

총 6개. PLAN.md §3.0 line ~134-143의 `db:stop`은 의도적 제외 (Architect 권고 1.F + PARTITION_PLAN 합의).

| 스크립트 | 명령 | 용도 |
|---|---|---|
| `db:start` | `supabase start` | 로컬 Supabase 컨테이너 기동 |
| `db:push` | `supabase db push --linked` | 원격에 마이그레이션 push |
| `db:types` | `supabase gen types typescript --linked > src/shared/api/supabase/types.ts` | 타입 codegen |
| `db:reset` | `supabase db reset` | 로컬 dev DB 초기화 |
| `db:diff` | `supabase db diff -f` | 스키마 diff |
| `db:check-drift` | `node scripts/check-migration-drift.mjs` | 마이그레이션 ↔ db-schema.md ↔ phase-*.md drift 검증 |

---

## §3. 마이그레이션 일람표 + 본문

### 3.1 마이그레이션 일람표 (PLAN.md §부록 B 그대로)

| Migration | Phase | 내용 |
|---|---|---|
| `0001_init.sql` | 0a | extensions (pg_trgm) |
| `0002_user_profiles.sql` | 0a | user_profiles + handle_new_user() 초기 본문 + 트리거 |
| `0003_storage_locations.sql` | 1 | storage_kind enum + table + RLS |
| `0004_ingredient_categories.sql` | 1 | categories + RLS + 시드 12개 |
| `0005_ingredient_master.sql` | 1 | masters + RLS + trgm 인덱스 |
| `0006_ingredient_master_seed.sql` | 1 | 글로벌 식재료 ~150개 |
| `0007_user_ingredients.sql` | 1 | 사용자 인벤토리 + view + 인덱스 |
| `0008_user_default_storage_locations.sql` | 1 | handle_new_user() 함수 OR REPLACE (storage 추가) |
| `0008b_search_ingredient_masters.sql` | 1 | pg_trgm 한국어 검색 RPC |
| `0009_user_ingredient_partial_consume.sql` | 2 | original_quantity + auto-consumed 트리거 |
| `0010_dashboard_stats_function.sql` | 2 | get_inventory_summary() |
| `0011_recipes.sql` | 3 | recipe_master + recipe_ingredients + recommend_recipes() |
| `0012_recipes_seed.sql` | 3 | 100선 INSERT |
| `0013_youtube_cache.sql` | 3 | 캐시 테이블 |
| `0014_cooking_history.sql` | 4 | 히스토리 + 조인 |
| `0015a_recommend_for_ingredient.sql` | 4 | recommend_for_ingredient() |
| `0015b_log_cooking_session.sql` | 4 | log_cooking_session() RPC (트랜잭션) |
| `0016_shopping_list.sql` | 5 | 장보기 목록 |
| `0017_barcode_cache.sql` | 6 | 바코드 캐시 |
| `0018_receipt_uploads.sql` | 6 | 영수증 + Storage 버킷 + lifecycle policy |

### 3.2 마이그레이션별 본문

#### 0001_init.sql

<!-- SOURCE: apps/web/supabase/migrations/0001_init.sql -->
```sql
create extension if not exists pg_trgm;
```

#### 0002_user_profiles.sql + handle_new_user 트리거

<!-- SOURCE: apps/web/supabase/migrations/0002_user_profiles.sql -->
```sql
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
```

> **노트**: `0008_user_default_storage_locations.sql` (Phase 1)에서 동일 함수를 **CREATE OR REPLACE FUNCTION** 패턴으로 교체하여 storage_locations INSERT 책임을 추가한다. 두 책임을 한 함수에 묶음으로써 트리거 다중 등록 회피.

#### 0003_storage_locations.sql

<!-- SOURCE: apps/web/supabase/migrations/0003_storage_locations.sql -->
```sql
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
```

#### 0004_ingredient_categories.sql

<!-- SOURCE: apps/web/supabase/migrations/0004_ingredient_categories.sql -->
```sql
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
```

> **PG 15 미만 시 대체 패턴** (PLAN.md §3.0.1):
> ```sql
> create unique index ingredient_categories_user_name_uniq
>   on ingredient_categories (user_id, name)
>   where user_id is not null;
> create unique index ingredient_categories_global_name_uniq
>   on ingredient_categories (name)
>   where user_id is null;
> ```

#### 0005_ingredient_master.sql

<!-- SOURCE: apps/web/supabase/migrations/0005_ingredient_master.sql -->
```sql
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
```

> **PG 15 미만 시 대체 패턴** (PLAN.md §3.0.1):
> ```sql
> create unique index ingredient_master_user_name_uniq
>   on ingredient_master (user_id, name)
>   where user_id is not null;
> create unique index ingredient_master_global_name_uniq
>   on ingredient_master (name)
>   where user_id is null;
> ```

#### 0006_ingredient_master_seed.sql

<!-- SOURCE: apps/web/supabase/migrations/0006_ingredient_master_seed.sql -->
```sql
-- 글로벌 ingredient_master ~150 row (user_id IS NULL)
-- 카테고리는 0004에서 12 row 시드됨 (user_id IS NULL)
-- 각 row: name + category 매핑 + default_shelf_life_days + default_storage_kind

with c as (
  select id, name
  from public.ingredient_categories
  where user_id is null
)
insert into public.ingredient_master (user_id, name, category_id, default_shelf_life_days, default_storage_kind)
select
  null,
  v.name,
  (select id from c where c.name = v.cat),
  v.shelf,
  v.kind::storage_kind
from (values
  -- ─── 육류 (~14) ───
  ('소고기 등심',     '육류',    3,   'fridge'),
  ('소고기 안심',     '육류',    3,   'fridge'),
  ('소고기 양지',     '육류',    3,   'fridge'),
  ('소고기 다짐육',   '육류',    2,   'fridge'),
  ('돼지고기 삼겹살', '육류',    3,   'fridge'),
  ('돼지고기 목살',   '육류',    3,   'fridge'),
  ('돼지고기 등심',   '육류',    3,   'fridge'),
  ('돼지고기 다짐육', '육류',    2,   'fridge'),
  ('닭가슴살',        '육류',    3,   'fridge'),
  ('닭다리',          '육류',    3,   'fridge'),
  ('닭날개',          '육류',    3,   'fridge'),
  ('닭고기 통닭',     '육류',    2,   'fridge'),
  ('베이컨',          '육류',   14,   'fridge'),
  ('소갈비',          '육류',    3,   'fridge'),

  -- ─── 해산물 (~14) ───
  ('고등어',          '해산물',  2,   'fridge'),
  ('갈치',            '해산물',  2,   'fridge'),
  ('연어',            '해산물',  2,   'fridge'),
  ('명태',            '해산물',  2,   'fridge'),
  ('오징어',          '해산물',  2,   'fridge'),
  ('낙지',            '해산물',  2,   'fridge'),
  ('새우',            '해산물',  2,   'fridge'),
  ('조개',            '해산물',  2,   'fridge'),
  ('홍합',            '해산물',  2,   'fridge'),
  ('전복',            '해산물',  2,   'fridge'),
  ('굴',              '해산물',  2,   'fridge'),
  ('멸치',            '해산물',180,   'room_temp'),
  ('김',              '해산물',180,   'room_temp'),
  ('미역',            '해산물',365,   'room_temp'),

  -- ─── 채소 (~32) ───
  ('대파',            '채소',    7,   'fridge'),
  ('쪽파',            '채소',    5,   'fridge'),
  ('양파',            '채소',   30,   'room_temp'),
  ('마늘',            '채소',   30,   'fridge'),
  ('생강',            '채소',   14,   'fridge'),
  ('감자',            '채소',   30,   'room_temp'),
  ('고구마',          '채소',   30,   'room_temp'),
  ('당근',            '채소',   14,   'fridge'),
  ('배추',            '채소',   14,   'fridge'),
  ('양배추',          '채소',   14,   'fridge'),
  ('상추',            '채소',    5,   'fridge'),
  ('깻잎',            '채소',    5,   'fridge'),
  ('시금치',          '채소',    5,   'fridge'),
  ('미나리',          '채소',    5,   'fridge'),
  ('부추',            '채소',    5,   'fridge'),
  ('청경채',          '채소',    5,   'fridge'),
  ('오이',            '채소',    7,   'fridge'),
  ('애호박',          '채소',    7,   'fridge'),
  ('가지',            '채소',    7,   'fridge'),
  ('파프리카',        '채소',   10,   'fridge'),
  ('피망',            '채소',   10,   'fridge'),
  ('고추',            '채소',   10,   'fridge'),
  ('청양고추',        '채소',   10,   'fridge'),
  ('토마토',          '채소',    7,   'fridge'),
  ('방울토마토',      '채소',    7,   'fridge'),
  ('버섯 표고',       '채소',    7,   'fridge'),
  ('버섯 느타리',     '채소',    5,   'fridge'),
  ('버섯 새송이',     '채소',    7,   'fridge'),
  ('버섯 팽이',       '채소',    5,   'fridge'),
  ('숙주',            '채소',    3,   'fridge'),
  ('콩나물',          '채소',    3,   'fridge'),
  ('무',              '채소',   14,   'fridge'),

  -- ─── 과일 (~18) ───
  ('사과',            '과일',   14,   'fridge'),
  ('배',              '과일',   14,   'fridge'),
  ('귤',              '과일',   10,   'fridge'),
  ('오렌지',          '과일',   14,   'fridge'),
  ('레몬',            '과일',   21,   'fridge'),
  ('바나나',          '과일',    5,   'room_temp'),
  ('포도',            '과일',    7,   'fridge'),
  ('딸기',            '과일',    3,   'fridge'),
  ('블루베리',        '과일',    7,   'fridge'),
  ('수박',            '과일',    5,   'fridge'),
  ('참외',            '과일',    7,   'fridge'),
  ('복숭아',          '과일',    5,   'fridge'),
  ('자두',            '과일',    7,   'fridge'),
  ('체리',            '과일',    7,   'fridge'),
  ('망고',            '과일',    5,   'fridge'),
  ('파인애플',        '과일',    5,   'fridge'),
  ('키위',            '과일',   14,   'fridge'),
  ('아보카도',        '과일',    5,   'fridge'),

  -- ─── 유제품 (~10) ───
  ('우유',            '유제품',  7,   'fridge'),
  ('저지방 우유',     '유제품',  7,   'fridge'),
  ('치즈 슬라이스',   '유제품', 30,   'fridge'),
  ('체다 치즈',       '유제품', 30,   'fridge'),
  ('모짜렐라 치즈',   '유제품', 14,   'fridge'),
  ('요거트',          '유제품', 14,   'fridge'),
  ('그릭 요거트',     '유제품', 14,   'fridge'),
  ('버터',            '유제품', 60,   'fridge'),
  ('생크림',          '유제품',  7,   'fridge'),
  ('연유',            '유제품', 60,   'fridge'),

  -- ─── 곡물 (~12) ───
  ('쌀',              '곡물',  180,   'room_temp'),
  ('현미',            '곡물',  180,   'room_temp'),
  ('잡곡',            '곡물',  180,   'room_temp'),
  ('찹쌀',            '곡물',  180,   'room_temp'),
  ('밀가루',          '곡물',  180,   'room_temp'),
  ('부침가루',        '곡물',  180,   'room_temp'),
  ('빵',              '곡물',    3,   'room_temp'),
  ('식빵',            '곡물',    5,   'room_temp'),
  ('우동면',          '곡물',   60,   'fridge'),
  ('소면',            '곡물',  365,   'room_temp'),
  ('스파게티',        '곡물',  365,   'room_temp'),
  ('떡',              '곡물',    2,   'fridge'),

  -- ─── 조미료 (~18) ───
  ('간장',            '조미료',365,   'room_temp'),
  ('진간장',          '조미료',365,   'room_temp'),
  ('국간장',          '조미료',365,   'room_temp'),
  ('된장',            '조미료',365,   'fridge'),
  ('고추장',          '조미료',365,   'fridge'),
  ('쌈장',            '조미료',180,   'fridge'),
  ('소금',            '조미료',730,   'room_temp'),
  ('설탕',            '조미료',730,   'room_temp'),
  ('후추',            '조미료',365,   'room_temp'),
  ('식초',            '조미료',365,   'room_temp'),
  ('맛술',            '조미료',365,   'room_temp'),
  ('참기름',          '조미료',180,   'room_temp'),
  ('들기름',          '조미료',180,   'room_temp'),
  ('식용유',          '조미료',180,   'room_temp'),
  ('올리브오일',      '조미료',365,   'room_temp'),
  ('고춧가루',        '조미료',180,   'fridge'),
  ('마늘 다진것',     '조미료', 14,   'fridge'),
  ('생강 다진것',     '조미료', 14,   'fridge'),

  -- ─── 가공식품 (~14) ───
  ('라면',            '가공식품',180,  'room_temp'),
  ('컵라면',          '가공식품',180,  'room_temp'),
  ('만두',            '가공식품', 60,  'freezer'),
  ('어묵',            '가공식품',  7,  'fridge'),
  ('소시지',          '가공식품', 14,  'fridge'),
  ('햄',              '가공식품', 14,  'fridge'),
  ('스팸',            '가공식품',365,  'room_temp'),
  ('참치 통조림',     '가공식품',730,  'room_temp'),
  ('꽁치 통조림',     '가공식품',730,  'room_temp'),
  ('옥수수 통조림',   '가공식품',730,  'room_temp'),
  ('두부',            '가공식품',  7,  'fridge'),
  ('순두부',          '가공식품',  5,  'fridge'),
  ('계란',            '가공식품', 21,  'fridge'),
  ('맛김',            '가공식품', 60,  'room_temp'),

  -- ─── 음료 (~8) ───
  ('생수',            '음료',  365,   'room_temp'),
  ('탄산수',          '음료',  180,   'room_temp'),
  ('콜라',            '음료',  180,   'room_temp'),
  ('사이다',          '음료',  180,   'room_temp'),
  ('오렌지 주스',     '음료',   30,   'fridge'),
  ('포도 주스',       '음료',   30,   'fridge'),
  ('맥주',            '음료',   90,   'fridge'),
  ('소주',            '음료',  730,   'room_temp'),

  -- ─── 간식 (~6) ───
  ('초콜릿',          '간식',  180,   'room_temp'),
  ('과자',            '간식',   90,   'room_temp'),
  ('아이스크림',      '간식',   60,   'freezer'),
  ('견과류 믹스',     '간식',  180,   'room_temp'),
  ('아몬드',          '간식',  180,   'room_temp'),
  ('호두',            '간식',  180,   'room_temp'),

  -- ─── 김치/장류 (~6) ───
  ('배추김치',        '김치/장류', 60,  'kimchi_fridge'),
  ('총각김치',        '김치/장류', 60,  'kimchi_fridge'),
  ('깍두기',          '김치/장류', 60,  'kimchi_fridge'),
  ('파김치',          '김치/장류', 30,  'kimchi_fridge'),
  ('열무김치',        '김치/장류', 30,  'kimchi_fridge'),
  ('동치미',          '김치/장류', 30,  'kimchi_fridge'),

  -- ─── 기타 (~2) ───
  ('도시락',          '기타',   2,   'fridge'),
  ('남은 음식',       '기타',   3,   'fridge')
) as v(name, cat, shelf, kind);
```

#### 0007_user_ingredients.sql

<!-- SOURCE: apps/web/supabase/migrations/0007_user_ingredients.sql -->
```sql
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
```

> **D-Day는 SQL view + 클라이언트 timezone 보정** — generated column 대신 view `user_ingredients_with_dday` 권장 (`current_date` 의존, 하루 단위로만 의미 있음).
> ```sql
> create view user_ingredients_with_dday as
>   select *, (expires_at - current_date) as days_until_expiry
>   from user_ingredients
>   where consumed = false;
> ```
> Postgres `current_date` 는 서버 타임존(UTC)으로 동작 → KST 보정은 클라이언트 `entities/ingredient/lib/computeDDay.ts` 에서 dayjs `tz('Asia/Seoul')` 로 재계산. Phase 1 종료 시 timezone 통합 테스트.

#### 0008_user_default_storage_locations.sql

<!-- SOURCE: apps/web/supabase/migrations/0008_user_default_storage_locations.sql -->
```sql
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
```

#### 0017_search_ingredient_masters.sql

<!-- SOURCE: apps/web/supabase/migrations/0017_search_ingredient_masters.sql -->
```sql
-- ───────── search_ingredient_masters: 한국어 typeahead RPC ─────────
-- ILIKE prefix(rank 1.0) + ILIKE 부분(0.7) + similarity(trigram) hybrid
create or replace function public.search_ingredient_masters(
  p_query text,
  p_user_id uuid,
  p_limit int default 10
)
returns table (
  id uuid,
  name text,
  category_id uuid,
  default_shelf_life_days int,
  default_storage_kind storage_kind,
  rank real
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with q as (select trim(p_query) as q)
  select
    m.id,
    m.name,
    m.category_id,
    m.default_shelf_life_days,
    m.default_storage_kind,
    case
      when m.name ilike (select q || '%' from q) then 1.0::real     -- prefix match
      when m.name ilike (select '%' || q || '%' from q) then 0.7::real  -- substring
      else similarity(m.name, (select q from q))                    -- pg_trgm
    end as rank
  from ingredient_master m
  where (m.user_id is null or m.user_id = p_user_id)
    and (
      m.name ilike (select '%' || q || '%' from q)
      or similarity(m.name, (select q from q)) > 0.2
    )
  order by rank desc, length(m.name) asc, m.name asc
  limit p_limit;
$$;

grant execute on function public.search_ingredient_masters(text, uuid, int)
  to anon, authenticated;
```

#### 0009_user_ingredient_partial_consume.sql

<!-- SOURCE: apps/web/supabase/migrations/0009_user_ingredient_partial_consume.sql -->
```sql
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
```

> **트리거-RPC 일관성 메모**: Phase 4의 `log_cooking_session()` 본문(§3.2 0015b)은 명시적으로 `update ... set consumed = true` 처리한다. 이 트리거가 도입되면 두 경로(앱 직접 quantity 업데이트 + RPC) 모두 동일하게 `consumed=true`로 자동 마킹된다. log_cooking_session의 명시적 update는 트리거와 redundant하지만 **안전성을 위해 그대로 유지**(double-write OK, idempotent). 앱 측 직접 quantity 업데이트 경로는 트리거에 의존.

#### 0010_dashboard_stats_function.sql

<!-- SOURCE: apps/web/supabase/migrations/0010_dashboard_stats_function.sql -->
```sql
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
```

> **단일 출처 상수 권장**: D-Day 임계값(`URGENT_THRESHOLD_DAYS = 2`)을 `entities/ingredient/lib/dday-thresholds.ts` 한 파일에서 export. SQL 측은 마이그레이션 코멘트에 임계값 명시 + PR 리뷰 룰 (SQL 변경 시 TS 임계값 동시 변경 강제). `computeDDay.ts`의 `urgent`(0..2) bucket과 본 SQL `expiring_soon`(0..2)은 동일 분류. `expired`(<0)도 동일.

#### 0011_recipes.sql + recommend_recipes

<!-- SOURCE: apps/web/supabase/migrations/0011_recipes.sql -->
```sql
-- ───────── 0011_recipes.sql ─────────
-- Phase 3 §2.2 — recipe_master / recipe_ingredients + recommend_recipes() RPC
--
-- 단일 출처 상수 (conventions.md §19):
--   apps/web/src/entities/recipe/lib/scoring-constants.ts
--   - WEIGHT_REQUIRED       = 0.7
--   - WEIGHT_OPTIONAL       = 0.2
--   - WEIGHT_URGENT         = 0.1
--   - MIN_SCORE             = 0.5  (= p_min_score 기본값)
--   - SCORE_READY_THRESHOLD = 0.95 (UI 분기용)
-- TS mirror: apps/web/src/entities/recipe/lib/computeRecipeMatch.ts
-- ★ 본 SQL 본문 inline 값과 TS 상수는 반드시 동일. 변경 시 두 곳 동시 변경 (PR 룰).

create type recipe_difficulty as enum ('easy', 'medium', 'hard');

create table recipe_master (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  cook_minutes int,
  difficulty recipe_difficulty not null default 'easy',
  servings int default 2,
  instructions_md text,                  -- 레시피 본문 (markdown)
  created_at timestamptz not null default now()
);

create table recipe_ingredients (
  recipe_id uuid not null references recipe_master(id) on delete cascade,
  ingredient_master_id uuid not null references ingredient_master(id),
  quantity numeric(10,2),
  unit text,
  is_optional boolean not null default false,
  primary key (recipe_id, ingredient_master_id)
);
create index recipe_ingredients_master_idx on recipe_ingredients(ingredient_master_id);

-- ───────── 매칭 공식 ─────────
-- score = 0.7 * (필수보유/필수전체)
--       + 0.2 * (선택보유/max(선택전체, 1))
--       + 0.1 * (임박보유/필수전체)
--
-- 임계값:
--   ≥ 0.95 → "지금 만들 수 있음"
--   0.5 ~ 0.95 → "재료 1-2개 부족"
--   < 0.5 → 추천 제외 (호출자가 필터링)
--
-- 단일 출처 상수: apps/web/src/entities/recipe/lib/scoring-constants.ts
--   WEIGHT_REQUIRED = 0.7, WEIGHT_OPTIONAL = 0.2, WEIGHT_URGENT = 0.1
--   MIN_SCORE = 0.5, SCORE_READY_THRESHOLD = 0.95
--   TS↔SQL 동치성 보장 — 변경 시 두 파일 동시 변경 필수 (PR 룰)

create or replace function public.recommend_recipes(
  p_user uuid,
  p_min_score real default 0.5,
  p_limit int default 30
)
returns table (
  recipe_id uuid,
  name text,
  description text,
  cook_minutes int,
  difficulty recipe_difficulty,
  servings int,
  required_total int,
  required_have int,
  optional_total int,
  optional_have int,
  urgent_have int,
  score real,
  missing_required jsonb,
  missing_optional jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  -- 사용자 보유 + 임박 재료 집합 (consumed=false, quantity>0)
  with user_have as (
    select
      ui.ingredient_master_id,
      bool_or(
        ui.expires_at is not null
        and ui.expires_at - current_date between 0 and 2
      ) as has_urgent
    from user_ingredients ui
    where ui.user_id = p_user
      and ui.consumed = false
      and ui.quantity > 0
    group by ui.ingredient_master_id
  ),
  recipe_stats as (
    select
      r.id as recipe_id,
      r.name,
      r.description,
      r.cook_minutes,
      r.difficulty,
      r.servings,
      count(*) filter (where ri.is_optional = false)::int as required_total,
      count(*) filter (
        where ri.is_optional = false and uh.ingredient_master_id is not null
      )::int as required_have,
      count(*) filter (where ri.is_optional = true)::int as optional_total,
      count(*) filter (
        where ri.is_optional = true and uh.ingredient_master_id is not null
      )::int as optional_have,
      count(*) filter (
        where ri.is_optional = false
          and uh.ingredient_master_id is not null
          and uh.has_urgent = true
      )::int as urgent_have,
      jsonb_agg(
        jsonb_build_object(
          'ingredient_master_id', ri.ingredient_master_id,
          'quantity', ri.quantity,
          'unit', ri.unit
        )
      ) filter (
        where ri.is_optional = false and uh.ingredient_master_id is null
      ) as missing_required,
      jsonb_agg(
        jsonb_build_object(
          'ingredient_master_id', ri.ingredient_master_id,
          'quantity', ri.quantity,
          'unit', ri.unit
        )
      ) filter (
        where ri.is_optional = true and uh.ingredient_master_id is null
      ) as missing_optional
    from recipe_master r
    join recipe_ingredients ri on ri.recipe_id = r.id
    left join user_have uh on uh.ingredient_master_id = ri.ingredient_master_id
    group by r.id
  )
  select
    rs.recipe_id,
    rs.name,
    rs.description,
    rs.cook_minutes,
    rs.difficulty,
    rs.servings,
    rs.required_total,
    rs.required_have,
    rs.optional_total,
    rs.optional_have,
    rs.urgent_have,
    (
      0.7 * (rs.required_have::real / nullif(rs.required_total, 0))
      + 0.2 * (rs.optional_have::real / greatest(rs.optional_total, 1))
      + 0.1 * (rs.urgent_have::real / nullif(rs.required_total, 0))
    )::real as score,
    coalesce(rs.missing_required, '[]'::jsonb) as missing_required,
    coalesce(rs.missing_optional, '[]'::jsonb) as missing_optional
  from recipe_stats rs
  where rs.required_total > 0
    and (
      0.7 * (rs.required_have::real / nullif(rs.required_total, 0))
      + 0.2 * (rs.optional_have::real / greatest(rs.optional_total, 1))
      + 0.1 * (rs.urgent_have::real / nullif(rs.required_total, 0))
    ) >= p_min_score
  order by score desc, rs.cook_minutes asc nulls last
  limit p_limit;
$$;

grant execute on function public.recommend_recipes(uuid, real, int)
  to authenticated;

-- ───────── RLS ─────────
alter table recipe_master enable row level security;
create policy "anyone_can_read" on recipe_master for select using (true);
-- INSERT 정책 없음 → admin client (service role)만 write 가능

alter table recipe_ingredients enable row level security;
create policy "anyone_can_read" on recipe_ingredients for select using (true);
-- INSERT 정책 없음 → admin client만 write
```

#### 0012_recipe_ingredients.sql (recipes_seed)

<!-- SOURCE-EXEMPT: apps/web/supabase/migrations/0012_recipes_seed.sql (auto-generated seed; drift check N/A) -->

> **Auto-generated seed (drift check exempt)**. 본 파일은 `apps/web/supabase/seeds/recipes_to_sql.mjs`로
> CSV(`recipes_100.csv`)에서 변환되어 생성된다. 마이그레이션이 SSoT (전체 INSERT를 본 문서에 미러링하는
> 것은 비실용적). 시드 변경 시: CSV 수정 → 스크립트 재실행 → 새 마이그레이션 파일로 commit
> (마이그레이션은 immutable). `db:check-drift`는 본 파일을 byte 비교에서 제외한다 (SOURCE 마커
> 대신 SOURCE-EXEMPT 마커 사용 — drift checker는 SOURCE: 형태만 인식).

#### 0013_youtube_cache.sql

<!-- SOURCE: apps/web/supabase/migrations/0013_youtube_cache.sql -->
```sql
create table youtube_cache (
  query_key text primary key,            -- e.g., "recipe:김치찌개"
  payload jsonb not null,                -- YouTube API 응답 일부 (아래 명시)
  fetched_at timestamptz not null default now()
);
-- 24h 후 stale 처리: SELECT 시 fetched_at + interval '24 hours' > now() 체크

-- payload jsonb schema (TypeScript 기준):
-- type YoutubeCachePayload = Array<{
--   videoId: string;
--   title: string;
--   thumbnails: { medium: { url: string; width: number; height: number } };
--   channelTitle: string;
--   durationSeconds?: number;   // contentDetails.duration 파싱 후 저장 (선택)
-- }>;  // 길이 ≤ 5

-- ───────── RLS ─────────
alter table youtube_cache enable row level security;
create policy "anyone_can_read" on youtube_cache for select using (true);
-- INSERT/UPDATE는 admin client(service role)에서만 → RLS bypass
```

`youtube_cache.payload` jsonb 필드 schema (TS):
```ts
type YoutubeCachePayload = Array<{
  videoId: string;
  title: string;
  thumbnails: { medium: { url: string; width: number; height: number } };
  channelTitle: string;
  durationSeconds?: number;   // contentDetails.duration 파싱 후 저장 (선택)
}>;  // 길이 ≤ 5
```

#### 0014_cooking_history.sql

<!-- SOURCE: apps/web/supabase/migrations/0014_cooking_history.sql -->
```sql
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
```

#### 0018_recommend_for_ingredient.sql

<!-- SOURCE: apps/web/supabase/migrations/0018_recommend_for_ingredient.sql -->
```sql
-- ───────── recommend_for_ingredient: 인벤토리에서 재료 클릭 시 듀얼 추천 ─────────
-- past_recipes: 사용자가 과거에 만든 적 있는 레시피 중 이 재료를 사용한 것
-- new_recipes:  이 재료를 사용하는 레시피 중 사용자가 만든 적 없는 것 (score >= 0.5)

create or replace function public.recommend_for_ingredient(
  p_user uuid,
  p_master_id uuid,
  p_limit_each int default 5
) returns table (
  past_recipes jsonb,
  new_recipes jsonb
)
language sql stable
security invoker
set search_path = public, pg_temp
as $$
  with past as (
    select
      r.id as recipe_id,
      r.name,
      max(ch.cooked_at) as last_cooked_at,
      count(*) as cooked_count
    from public.cooking_history ch
    join public.recipe_master r on r.id = ch.recipe_id
    join public.recipe_ingredients ri on ri.recipe_id = r.id
    where ch.user_id = p_user
      and ri.ingredient_master_id = p_master_id
    group by r.id, r.name
    order by last_cooked_at desc
    limit p_limit_each
  ),
  new_candidates as (
    select
      rec.recipe_id,
      rec.name,
      rec.score,
      rec.cook_minutes
    from public.recommend_recipes(p_user, 0.5, 100) rec
    join public.recipe_ingredients ri on ri.recipe_id = rec.recipe_id
    where ri.ingredient_master_id = p_master_id
      and not exists (
        select 1 from public.cooking_history ch
        where ch.user_id = p_user and ch.recipe_id = rec.recipe_id
      )
    order by rec.score desc, rec.cook_minutes asc
    limit p_limit_each
  )
  select
    coalesce((select jsonb_agg(jsonb_build_object(
      'recipe_id', recipe_id, 'name', name,
      'last_cooked_at', last_cooked_at, 'cooked_count', cooked_count
    )) from past), '[]'::jsonb) as past_recipes,
    coalesce((select jsonb_agg(jsonb_build_object(
      'recipe_id', recipe_id, 'name', name,
      'score', score, 'cook_minutes', cook_minutes
    )) from new_candidates), '[]'::jsonb) as new_recipes;
$$;

grant execute on function public.recommend_for_ingredient(uuid, uuid, int)
  to authenticated;
```

#### 0019_log_cooking_session.sql

<!-- SOURCE: apps/web/supabase/migrations/0019_log_cooking_session.sql -->
```sql
-- ───────── log_cooking_session: 요리 기록 + 재료 차감 (atomic) ─────────
-- consumed jsonb shape:
--   [{ "master_id": "<uuid>", "quantity": <numeric>, "unit": "<text>" }]

create or replace function public.log_cooking_session(
  p_user uuid,
  p_recipe_id uuid,           -- nullable (custom recipe)
  p_custom_recipe_name text,  -- nullable
  p_consumed jsonb,           -- 위 shape
  p_rating int default null,  -- 1-5 or null
  p_memo text default null
)
returns uuid                  -- cooking_history.id
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_history_id uuid;
  v_item jsonb;
  v_master_id uuid;
  v_to_consume numeric;
  v_unit text;
  v_row record;
  v_remaining numeric;
begin
  -- 권한 체크 (auth.uid()와 p_user 일치)
  if auth.uid() is null or auth.uid() <> p_user then
    raise exception 'unauthorized: auth.uid() mismatch';
  end if;

  -- 히스토리 INSERT
  insert into cooking_history (user_id, recipe_id, custom_recipe_name, rating, memo)
  values (p_user, p_recipe_id, p_custom_recipe_name, p_rating, p_memo)
  returning id into v_history_id;

  -- 소진 재료 처리
  for v_item in select * from jsonb_array_elements(p_consumed)
  loop
    v_master_id := (v_item->>'master_id')::uuid;
    v_to_consume := (v_item->>'quantity')::numeric;
    v_unit := v_item->>'unit';

    -- 조인 테이블 INSERT
    insert into cooking_history_consumed_ingredients
      (history_id, ingredient_master_id, quantity, unit)
    values (v_history_id, v_master_id, v_to_consume, v_unit);

    -- user_ingredients 부분 차감 (expires_at ASC 우선)
    v_remaining := v_to_consume;
    for v_row in
      select id, quantity
      from user_ingredients
      where user_id = p_user
        and ingredient_master_id = v_master_id
        and consumed = false
        and quantity > 0
      order by expires_at asc nulls last, created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      if v_row.quantity <= v_remaining then
        -- row 전체 소진
        update user_ingredients
        set quantity = 0, consumed = true, updated_at = now()
        where id = v_row.id;
        v_remaining := v_remaining - v_row.quantity;
      else
        -- 부분 차감
        update user_ingredients
        set quantity = quantity - v_remaining, updated_at = now()
        where id = v_row.id;
        v_remaining := 0;
      end if;
    end loop;

    -- 재료 부족 시 raise (rollback) — 비즈니스 결정에 따라 변경 가능
    -- 본 plan에서는 부족해도 에러 X (사용자가 직접 입력한 양 신뢰)
  end loop;

  return v_history_id;
end;
$$;

grant execute on function public.log_cooking_session(uuid, uuid, text, jsonb, int, text)
  to authenticated;
```

> **에러 처리**: 함수가 `raise exception` 시 트랜잭션 자동 rollback. Server Action이 `try/catch` 로 잡아 한국어 메시지(`'unauthorized: ...' → '권한이 없습니다'`) 변환.
> **check constraint `quantity >= 0`** 은 0007에서 이미 정의 (음수 차감 금지).

#### 0016_shopping_list.sql

<!-- SOURCE: apps/web/supabase/migrations/0016_shopping_list.sql -->
```sql
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

alter table shopping_list enable row level security;
create policy "shopping_list_select_own" on shopping_list
  for select using (auth.uid() = user_id);
create policy "shopping_list_insert_own" on shopping_list
  for insert with check (auth.uid() = user_id);
create policy "shopping_list_update_own" on shopping_list
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shopping_list_delete_own" on shopping_list
  for delete using (auth.uid() = user_id);
```

#### 0017_barcode_cache.sql

<!-- SOURCE: apps/web/supabase/migrations/0017_barcode_cache.sql -->
```sql
create table barcode_cache (
  barcode text primary key,
  product_name text,
  brand text,
  default_category_id uuid references ingredient_categories(id),
  payload jsonb,                          -- 원본 응답
  fetched_at timestamptz not null default now()
);
```

#### 0018_receipt_uploads.sql

<!-- SOURCE: apps/web/supabase/migrations/0018_receipt_uploads.sql -->
```sql
create type ocr_status as enum ('pending', 'processing', 'done', 'failed');

create table receipt_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,             -- supabase storage 경로
  status ocr_status not null default 'pending',
  parsed_items jsonb,                     -- OCR 결과 [{name, qty, ...}]
  error_message text,
  created_at timestamptz not null default now()
);
create index receipt_uploads_user_idx on receipt_uploads(user_id, created_at desc);
```

---

## §4. RLS 정책 패턴 3종

### 4.1 사용자별 격리 (auth.uid() = user_id)

```sql
-- 적용 대상: storage_locations, user_ingredients, cooking_history, shopping_list, ingredient_categories(개인), receipt_uploads
create policy "<table>_select_own" on public.<table>
  for select using (auth.uid() = user_id);
create policy "<table>_insert_own" on public.<table>
  for insert with check (auth.uid() = user_id);
create policy "<table>_update_own" on public.<table>
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "<table>_delete_own" on public.<table>
  for delete using (auth.uid() = user_id);
```

> **profile/storage INSERT 정책 절대 만들지 말 것** (Architect Answer 2): `handle_new_user()` security definer 함수만 INSERT. 일반 사용자는 RLS상 INSERT 권한 없음 → 트리거 우회 시도 자동 차단.

PLAN.md §3.3에서 발췌한 실제 패턴 예시:
```sql
-- 사용자별 테이블 (user_ingredients, storage_locations, cooking_history, shopping_list, receipt_uploads)
alter table user_ingredients enable row level security;
create policy "user_owns_rows" on user_ingredients
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 4.2 글로벌 + 사용자 추가 (user_id IS NULL OR auth.uid() = user_id)

```sql
-- 적용 대상: ingredient_master, ingredient_categories
-- user_id가 NULL이면 글로벌 시드 (모두 read 가능)
-- user_id가 있으면 그 사용자만 read/write
create policy "<table>_select_global_or_own" on public.<table>
  for select using (user_id is null or auth.uid() = user_id);
create policy "<table>_insert_own" on public.<table>
  for insert with check (auth.uid() = user_id);
-- 글로벌 row는 admin만 INSERT (RLS bypass via service_role)
```

PLAN.md §3.3에서 발췌한 실제 패턴 예시:
```sql
-- 글로벌 + 사용자 추가 가능 (ingredient_master, ingredient_categories)
alter table ingredient_master enable row level security;
create policy "read_global_or_own" on ingredient_master
  for select
  using (user_id is null or auth.uid() = user_id);
create policy "insert_own" on ingredient_master
  for insert
  with check (auth.uid() = user_id);   -- 글로벌 추가는 admin client만
```

### 4.3 read-only seed (read 누구나, write admin only)

```sql
-- 적용 대상: recipe_master, recipe_ingredients, barcode_cache, youtube_cache
-- 글로벌 시드 + 캐시 — read는 인증된 모든 사용자, write는 admin client (RLS bypass)
create policy "<table>_select_authenticated" on public.<table>
  for select to authenticated using (true);
-- INSERT/UPDATE 정책 없음 → admin client만 RLS bypass로 write
```

PLAN.md §3.3에서 발췌한 실제 패턴 예시:
```sql
-- 글로벌 read-only (recipe_master, recipe_ingredients)
alter table recipe_master enable row level security;
create policy "anyone_can_read" on recipe_master for select using (true);
-- INSERT 정책 없음 → admin client (service role)만 write 가능

-- 캐시 (youtube_cache, barcode_cache) — 서버에서만 write, 누구나 read
alter table youtube_cache enable row level security;
create policy "anyone_can_read" on youtube_cache for select using (true);
-- INSERT/UPDATE는 admin client(service role)에서만 → RLS bypass
```

> **검증 필수**: `select current_setting('request.jwt.claim.sub')` 으로 RLS가 익명·인증 사용자에 대해 정확히 동작하는지 Phase 1 끝에 통합 테스트.

---

## §5. ERD / 관계 그래프

```
auth.users (Supabase 시스템)
  ├─ user_profiles (1:1)
  ├─ storage_locations (1:N) — 냉장/냉동/실온/김치냉장고 (트리거로 자동 4개)
  ├─ user_ingredients (1:N)
  │   ├─ → ingredient_master (N:1, FK)
  │   └─ → storage_locations (N:1, FK)
  ├─ cooking_history (1:N)
  │   └─ → recipe_master (N:1, FK, 또는 custom text)
  ├─ shopping_list (1:N)
  └─ receipt_uploads (1:N)

ingredient_master (글로벌 시드 + 사용자 추가)
  ├─ → ingredient_categories (N:1, FK)
  └─ ← user_ingredients, recipe_ingredients (참조)

recipe_master (글로벌 시드)
  ├─ recipe_ingredients (1:N)
  │   └─ → ingredient_master (N:1, FK)
  └─ ← cooking_history (참조)

cooking_history_consumed_ingredients (조인)
  ├─ → cooking_history (N:1, FK)
  └─ → ingredient_master (N:1, FK)

barcode_cache (글로벌 캐시) — 24h TTL
youtube_cache (글로벌 캐시) — 24h TTL
```

---

## §6. 시드 데이터 전략 (PLAN.md §3.4 그대로)

| 데이터 | 출처 | 적재 시점 | 적재 방식 |
|---|---|---|---|
| `ingredient_categories` (글로벌 ~12개) | 직접 정의 (육류/채소/과일/유제품/곡물/조미료/가공식품/음료/기타) | Phase 1 마이그레이션 (`0004_*`) | `INSERT ... user_id IS NULL` |
| `ingredient_master` (글로벌 ~150개) | 한국 가정 빈출 식재료 직접 정의 (대파/양파/계란/우유 등 + 기본 보관일수) | Phase 1 마이그레이션 (`0006_*`) | `INSERT ... user_id IS NULL` |
| `recipe_master` (글로벌 100선) | 직접 큐레이션 (한식 50 + 양식/일식/중식 50). **이미지·영상은 시드 X** (영상은 YouTube API 런타임 fetch) | Phase 3 마이그레이션 (`0012_*`) | `0012_recipes_seed.sql` (별도 파일, **Phase 3 안에서 1–2일 큐레이션 작업 포함**) |
| `storage_locations` | 사용자 가입 시 기본 4개(냉장실/냉동실/실온/김치냉장고) 자동 생성 | Phase 1 — Auth 트리거 (`0008_*`) | `0008_user_default_storage_locations.sql` 함수 교체 패턴 |

---

## §7. Architect 결정 영향 (DB 차원)

- **6.1 pg_trgm** (Architect Answer 1): `ingredient_master.name`에 `gin_trgm_ops` 인덱스 (0005) + `search_ingredient_masters()` RPC hybrid 검색 (0008b)
- **6.2 handle_new_user()** (Architect Answer 2): 0002에서 초기 함수 생성 (profile INSERT만), 0008에서 `CREATE OR REPLACE` 패턴으로 확장 (storage_locations INSERT 추가). `security definer` + `set search_path = public, pg_temp` + `on conflict do nothing` + `drop trigger if exists` 헤더
- **6.3 recommend_recipes()** (Architect Answer 3): 0011에 포함. 매칭 공식 `0.7*(필수보유/필수전체) + 0.2*(선택보유/max(선택전체,1)) + 0.1*(임박보유/필수전체)`. 임계값 ≥0.95 = ready, 0.5~0.95 = partial
- **6.4 supabase/ 위치** (Architect Answer 4): `apps/web/supabase/` (root 아님, `packages/db` 아님). db:* 스크립트 6개 (§2 표)
- **6.5 OCR 결정** (Architect Answer 5): DB 영향은 0017 (barcode_cache) + 0018 (receipt_uploads, ocr_status enum). Supabase Storage 버킷 `receipts/` + 30일 lifecycle policy
