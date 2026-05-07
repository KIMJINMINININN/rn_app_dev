# Phase 1 — 인벤토리 CRUD ★ MVP 단위

> ralph 실행 단위. 본 파일 + 참조: docs/plans/db-schema.md, docs/plans/conventions.md, docs/PRD.md
>
> **상태**: 미시작
> **선행 phase**: Phase 0b (App Shell + Primitives + 테스트 인프라)
> **후속 phase**: Phase 2 (인벤토리 고도화) — 권장, 그러나 의존 X
> **예상 기간**: 1주
> **MVP 정의**: ★ 본 phase 단독으로 출시 가능. 가입 → 식재료 추가/조회/삭제 → 만료 D-Day 표시.

---

## §0 사전 의존성 + 환경 변수

### 체크박스
- [ ] Phase 0b 완료 (Acceptance + DoD 모두 통과)
- [ ] supabase/migrations/ 마지막 번호 = 0002 (본 phase는 0003부터 시작)
- [ ] primitives 7종 사용 가능 (Phase 0b 산출물)
- [ ] TanStack Query Provider 동작
- [ ] Result<T,E> 헬퍼 사용 가능
- [ ] **Pre-flight PoC (30분 — 본 phase 첫 작업)**: 0006 시드 ~150 row INSERT 후 `select * from search_ingredient_masters('양', auth.uid(), 20)` / `'양파'` / `'양ㅍ'` 응답 측정. < 200ms + ranking 합리적. 실패 시 Plan B (Fuse.js 클라이언트 fallback) 결정.
- [ ] **마이그레이션 번호 충돌 확인** (Architect 3.F): `apps/web/supabase/migrations/` 마지막 번호 확인. 본 phase 시작 번호(0003) 미만이어야 함.

### 환경 변수
신규 없음.

---

## §0.5 참조 자산 미리보기 (cross-phase dependencies)

### 0.5.1 인용 테이블 (Phase 0a 자산)

| 테이블 | 정의 phase | 사용 컬럼 | 풀 본문 |
|---|---|---|---|
| `auth.users` | Supabase 시스템 | `id`, `raw_user_meta_data` | — |
| `user_profiles` | Phase 0a (0002) | `user_id` (FK auth.users.id) | `db-schema.md §3.2 0002` |

### 0.5.2 인용 RPC/함수 (Phase 0a)

```sql
-- 발췌. 전체: db-schema.md §3.2 0002 또는 apps/web/supabase/migrations/0002_user_profiles.sql
-- handle_new_user() — auth.users INSERT 트리거 함수 (0002에서 초기 생성, 본 phase 0008에서 OR REPLACE 교체)
create function public.handle_new_user()
  returns trigger language plpgsql security definer
  set search_path = public, pg_temp ...
```

> **주의**: 본 phase 0008에서 `CREATE OR REPLACE FUNCTION public.handle_new_user()` 패턴으로 교체하여 `storage_locations` 4개 INSERT 책임 추가. 0002 트리거 `on_auth_user_created`는 그대로 재사용.

### 0.5.3 영향받는 cross-cutting 룰 (conventions.md)

- §1 Result<T, string> — `addIngredient`, `deleteIngredient`, `consumeIngredient` 모든 Server Action 반환 타입
- §10 Server Action vs Route Handler — **Server Action 사용** (폼 mutation, 같은 origin). 외부 API 없음
- §17 TanStack Query queryKey — `['ingredients']`, `['ingredients', 'list', {...}]`, `['ingredients', 'search', q]` 네이밍 룰 (conventions §17 참조)
- **단일 출처 상수 — `URGENT_THRESHOLD_DAYS = 2`**: `apps/web/src/entities/ingredient/lib/dday-thresholds.ts` (본 phase에서 신규 작성). `computeDDay.ts`에서 import. SQL 측(0010)도 동일 임계값 사용
- §3 디자인 시스템 토큰 — UI는 모두 토큰만 사용
- §5 인증 가드 — `auth.uid()` 검증 필수. `(app)/layout.tsx` 단일 진입점
- §6 RLS 패턴 — 사용자별 격리 (db-schema §4.1)
- §12 관측/로깅 — Server Action 실패 시 `console.error` + Vercel logs

---

## §1 목표 / 출시 가능 가치

식재료 인벤토리 MVP. 가입 즉시 4개 보관 장소 자동 생성, 식재료 검색-선택-수량/유통기한 입력으로 추가, 보관 장소별 리스트 표시, D-Day 임박 시각화, 부분 소진/완전 삭제 가능.

**가시적 변화 (★ 출시 가능 단위)**:
- 신규 가입 → `/(app)/inventory` 자동 진입 → 비어있는 4 storage 카드 (냉장실/냉동실/실온/김치냉장고)
- "식재료 추가" → typeahead 검색 (양/양파/양ㅍ 대응) → 수량/단위/유통기한 → 저장 → 리스트에 표시
- D-2 이내 임박 재료에 빨간 배지 (`URGENT_THRESHOLD_DAYS = 2`), D-7 이내는 노랑 (`soon` bucket)
- 소진/삭제 액션

---

## §1.5 Architect 결정 적용

- **권고 1 (한국어 검색)**: `0008b_search_ingredient_masters.sql` — ILIKE prefix(rank 1.0) + ILIKE 부분(0.7) + similarity(trigram) hybrid. 클라이언트 디바운스 250ms. Plan B는 Fuse.js + hangul-js — Pre-flight PoC 결과에 따라 선택.
- **권고 2 (handle_new_user)**: 0008에서 함수 교체 — `storage_locations` 4개 INSERT 추가 + 기존 `user_profiles` INSERT 유지 (한 트리거에 두 책임 묶음, 트랜잭션 무결성). `on conflict do nothing` idempotent.
- **결정 (단일 출처 상수)**: `URGENT_THRESHOLD_DAYS = 2`는 `entities/ingredient/lib/dday-thresholds.ts`에 정의, `computeDDay.ts`에서 import. SQL 0010은 마이그레이션 코멘트에 임계값 명시.

---

## §2 DB 마이그레이션

> SSoT 우선순위 (Architect 1.A): `apps/web/supabase/migrations/0NNN_*.sql` (1차) → db-schema.md §3 / 본 §2.2 (2차 view)
> 마이그레이션 번호 충돌 회피: db-schema.md §1 표 참조.

### 2.1 일람표 (본 phase 신규 7개)

| 번호 | 파일명 | 주요 객체 | 의존성 |
|---|---|---|---|
| 0003 | `0003_storage_locations.sql` | table storage_locations + storage_kind enum | 0001 (pg_trgm), auth.users |
| 0004 | `0004_ingredient_categories.sql` | table ingredient_categories (글로벌 + 사용자) | auth.users |
| 0005 | `0005_ingredient_master.sql` | table ingredient_master + indexes (gin_trgm_ops) | 0001(pg_trgm), 0004 |
| 0006 | `0006_ingredient_master_seed.sql` | INSERT 글로벌 시드 ~150 row | 0005 |
| 0007 | `0007_user_ingredients.sql` | table user_ingredients (quantity, expires_at, consumed) + view + indexes | 0003, 0005 |
| 0008 | `0008_user_default_storage_locations.sql` | handle_new_user() 함수 교체 — storage 4종 자동 생성 | 0003 |
| 0008b | `0008b_search_ingredient_masters.sql` | RPC search_ingredient_masters() | 0005, pg_trgm |

### 2.2 SQL 본문

#### 0003_storage_locations.sql

<!-- SOURCE: apps/web/supabase/migrations/0003_storage_locations.sql -->
<!-- SSoT: docs/plans/db-schema.md §3.2 0003 -->
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
<!-- SSoT: docs/plans/db-schema.md §3.2 0004 -->
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
<!-- SSoT: docs/plans/db-schema.md §3.2 0005 -->
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
<!-- SSoT: docs/plans/db-schema.md §3.2 0006 -->
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
<!-- SSoT: docs/plans/db-schema.md §3.2 0007 -->
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
> Postgres `current_date` 는 서버 타임존(UTC)으로 동작 → KST 보정은 클라이언트 `entities/ingredient/lib/computeDDay.ts` 에서 dayjs `tz('Asia/Seoul')` 로 재계산.

#### 0008_user_default_storage_locations.sql

<!-- SOURCE: apps/web/supabase/migrations/0008_user_default_storage_locations.sql -->
<!-- SSoT: docs/plans/db-schema.md §3.2 0008 -->
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
<!-- SSoT: docs/plans/db-schema.md §3.2 0017 -->
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

### 2.3 마이그레이션 적용 절차

1. **파일 생성**: `apps/web/supabase/migrations/0NNN_<snake_name>.sql` 직접 생성. **`supabase migration new` CLI 사용 금지** (timestamp prefix 자동 부여 → 4자리 형식과 충돌, Architect 3.D)
2. **로컬 검증**: `pnpm web db:reset` (모든 마이그레이션 재실행) — 또는 `pnpm web db:start` 후 새 마이그레이션만 적용
3. **타입 갱신**: `pnpm web db:types` — `apps/web/src/shared/api/supabase/types.ts` 재생성 + 커밋
4. **drift 확인**: `pnpm web db:check-drift` — phase 파일 §2.2 SOURCE 마커 블록과 migrations/*.sql byte 일치 검증
5. **원격 적용**: `pnpm web db:push` (수동, 1인 작업자 운영)
6. **변경 검증**: RLS 통합 테스트 + `handle_new_user` 트리거 동작 확인

### 2.4 데이터 백필

- **0006 시드**: 글로벌 식재료 INSERT (`user_id IS NULL`) — 한국 마트 빈출 식재료 ~150종. SQL 안에 `INSERT INTO ... VALUES (...)` 방식으로 직접 작성. Phase 1 큐레이션 작업 중 완성.
- **기존 가입 사용자 backfill**: 0008 함수 교체 후 트리거는 신규 가입자에만 적용됨. 이미 가입한 사용자 대상으로는 관리자 콘솔 또는 아래 보조 쿼리로 수동 처리 (dev 단계에서는 사용자 본인뿐이므로 manual OK):

```sql
-- 기존 사용자 storage_locations backfill (1회성, 관리자 실행)
insert into public.storage_locations (user_id, name, kind, sort_order)
select
  u.id,
  v.name,
  v.kind::storage_kind,
  v.sort_order
from auth.users u
cross join (values
  ('냉장실', 'fridge', 0),
  ('냉동실', 'freezer', 1),
  ('실온', 'room_temp', 2),
  ('김치냉장고', 'kimchi_fridge', 3)
) as v(name, kind, sort_order)
where not exists (
  select 1 from public.storage_locations s
  where s.user_id = u.id
)
on conflict do nothing;
```

### 2.5 RLS 정책

- `storage_locations`: 사용자별 격리 (db-schema §4.1) — INSERT는 `handle_new_user()` security definer만
- `ingredient_categories`: 글로벌 + 사용자 추가 (§4.2)
- `ingredient_master`: 글로벌 + 사용자 추가 (§4.2)
- `user_ingredients`: 사용자별 격리 (§4.1)

---

## §3 UI 작업 (FSD 레이어 + 정확한 파일 경로)

### 3.1 entities/ingredient

| 파일 | 역할 |
|---|---|
| `apps/web/src/entities/ingredient/model/types.ts` | `IngredientMaster`, `UserIngredient`, `StorageLocation`, `IngredientCategory` 타입 (Database 타입에서 파생) |
| `apps/web/src/entities/ingredient/lib/dday-thresholds.ts` | `URGENT_THRESHOLD_DAYS = 2` (단일 출처 상수) |
| `apps/web/src/entities/ingredient/lib/computeDDay.ts` | `computeDDay(expiresAt, now?) → { days, bucket }` — KST 강제, dayjs tz('Asia/Seoul') |
| `apps/web/src/entities/ingredient/ui/dday-badge.tsx` | bucket → tone (danger/warning/info) 매핑 + 날짜 표시 |
| `apps/web/src/entities/ingredient/ui/storage-card.tsx` | 보관 장소 1개 카드 (이름 + count) |
| `apps/web/src/entities/ingredient/ui/ingredient-row.tsx` | 1개 재료 row (이름, 수량, 단위, D-Day badge, 액션 버튼) |

### 3.2 features/add-ingredient

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/add-ingredient/api/add-ingredient.ts` | Server Action `addIngredient(formData) → Result<UserIngredient, string>` |
| `apps/web/src/features/add-ingredient/lib/use-ingredient-search.ts` | typeahead 훅 — `supabase.rpc('search_ingredient_masters')` + 250ms 디바운스 |
| `apps/web/src/features/add-ingredient/ui/add-ingredient-dialog.tsx` | Dialog (primitives) + 검색 input + 결과 list + 수량/단위/유통기한 폼 |
| `apps/web/src/features/add-ingredient/ui/add-ingredient-trigger.tsx` | Floating action button (BottomNav 위) |

### 3.3 features/list-inventory

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/list-inventory/api/queries.ts` | TanStack Query — `useInventoryByStorage(storageId)`, `useStorageLocations()` |
| `apps/web/src/features/list-inventory/lib/sort.ts` | 정렬 함수 (expires_at ASC nulls last) |

### 3.4 features/delete-ingredient + features/consume-ingredient

| 파일 | 역할 |
|---|---|
| `apps/web/src/features/delete-ingredient/api/delete-ingredient.ts` | Server Action `deleteIngredient(id: string) → Result<void, string>` |
| `apps/web/src/features/consume-ingredient/api/consume-ingredient.ts` | Server Action `consumeIngredient(id, qty) → Result<UserIngredient, string>` (부분 차감) |

### 3.5 widgets/inventory-list

| 파일 | 역할 |
|---|---|
| `apps/web/src/widgets/inventory-list/inventory-list.tsx` | 보관 장소 카드 4개 + 각 카드별 ingredient row 리스트 (Skeleton 로딩) |

### 3.6 pages

| 파일 | 역할 |
|---|---|
| `apps/web/src/app/(app)/inventory/page.tsx` | RSC — `createSupabaseServerClient` → 모든 storage + ingredients 초기 fetch + InventoryList widget |
| `apps/web/src/app/(app)/inventory/loading.tsx` | Skeleton 4 storage cards |

---

## §4 로직 작업

### 4.1 Server Actions

```ts
// features/add-ingredient/api/add-ingredient.ts
'use server';
export async function addIngredient(formData: FormData): Promise<Result<UserIngredient, string>> {
  // 1. cookies-based supabase server client
  // 2. auth.uid() 검증
  // 3. parse formData (ingredient_master_id, storage_location_id, quantity, unit, expires_at)
  // 4. INSERT → revalidatePath('/(app)/inventory')
  // 5. Result 반환
}

// features/delete-ingredient/api/delete-ingredient.ts
'use server';
export async function deleteIngredient(id: string): Promise<Result<void, string>>;

// features/consume-ingredient/api/consume-ingredient.ts
'use server';
export async function consumeIngredient(id: string, qty: number): Promise<Result<UserIngredient, string>>;
// qty = 0 도달 시 consumed = true 명시적 UPDATE (Phase 2 0009 트리거 도입 전 명시적 처리 OK)
```

### 4.2 TanStack Query queryKey (conventions §17 네이밍 룰)

```ts
['ingredients']                                   // prefix (invalidateQueries 범위용)
['ingredients', 'list', { storageId }]            // useInventoryByStorage
['ingredients', 'search', query]                  // typeahead (use-ingredient-search)
['storage-locations']                             // useStorageLocations
```

invalidation: `addIngredient` / `deleteIngredient` / `consumeIngredient` 후 `['ingredients']` prefix invalidate.

### 4.3 computeDDay 구현 (PLAN.md §Phase 1 본문)

```ts
// apps/web/src/entities/ingredient/lib/computeDDay.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';
import { URGENT_THRESHOLD_DAYS } from './dday-thresholds';
dayjs.extend(utc);
dayjs.extend(tz);

export type DDayBucket = 'expired' | 'urgent' | 'soon' | 'fresh' | 'unknown';

export function computeDDay(
  expiresAt: string | null,
  now: Date = new Date(),
): { days: number | null; bucket: DDayBucket } {
  if (!expiresAt) return { days: null, bucket: 'unknown' };
  const today = dayjs(now).tz('Asia/Seoul').startOf('day');
  const exp = dayjs.tz(expiresAt, 'Asia/Seoul').startOf('day');
  const days = exp.diff(today, 'day');
  if (days < 0) return { days, bucket: 'expired' };
  if (days <= URGENT_THRESHOLD_DAYS) return { days, bucket: 'urgent' };  // D-2 이내
  if (days <= 7) return { days, bucket: 'soon' };
  return { days, bucket: 'fresh' };
}
```

```ts
// apps/web/src/entities/ingredient/lib/dday-thresholds.ts
// 단일 출처 상수 — conventions.md §단일 출처 상수 SSoT
// SQL 측(0010 get_inventory_summary)도 동일 임계값 사용 → 변경 시 SQL도 함께 수정
export const URGENT_THRESHOLD_DAYS = 2;   // D-2 이내 = urgent (빨강)
export const SOON_THRESHOLD_DAYS = 7;     // D-7 이내 = soon (노랑)
```

### 4.4 Hooks

- `useIngredientSearch(query: string)` — typeahead RPC 호출, 250ms 디바운스
- `useInventoryByStorage(storageId: string)` — list 쿼리
- `useStorageLocations()` — 4 storage 쿼리

---

## §5 외부 API 연동

해당 없음.

---

## §6 테스트 작업

### 6.1 단위 (Vitest)

`apps/web/src/entities/ingredient/lib/computeDDay.spec.ts` — D-Day 분류 (`URGENT_THRESHOLD_DAYS = 2` 임계값 기준)

| fixture | expiresAt | 예상 bucket |
|---|---|---|
| 오늘 만료 | today | `urgent` |
| D-1 (내일) | today+1 | `urgent` |
| D-2 (모레) | today+2 | `urgent` |
| D-3 | today+3 | `soon` |
| D-7 | today+7 | `soon` |
| D+5 (5일 후 기준 8일 후 만료) | today+8 | `fresh` |
| 이미 만료 | today-1 | `expired` |
| null | null | `unknown` |

추가 단위 테스트:
- KST/UTC edge case (자정 직전, 윤년, DST 없음 확인)
- DDayBadge bucket → tone 매핑 함수

### 6.2 통합 (Vitest + supabase local)

- `features/add-ingredient/api/add-ingredient.integration.spec.ts` — 가입 → `addIngredient` → `user_ingredients` row 1개 확인
- `search_ingredient_masters` RPC 통합 — 시드 INSERT 후 "양"/"양파"/"양ㅍ" 응답 합리적 ranking 검증
- **RLS 정책 검증**: 사용자 A가 사용자 B의 `user_ingredients`를 읽을 수 없음 확인

### 6.3 E2E (Playwright)

`apps/web/e2e/inventory-happy-path.spec.ts` — 가입 → `/(app)/inventory` 진입 → 식재료 추가 dialog → "양파" 검색 → 첫 결과 선택 → 수량 1, 유통기한 7일 후 → 저장 → 리스트에 표시

### 6.4 수동 smoke

- 신규 가입 시 `storage_locations` 4개 자동 생성 확인 (DB 직접 쿼리)
- 모바일 웹뷰에서 식재료 추가 동작 (§11 모바일 통합 참조)

---

## §7 Acceptance 기준

- [ ] 0003-0008b 7개 마이그레이션 모두 `pnpm web db:reset` 통과
- [ ] 신규 가입 시 `user_profiles` + `storage_locations` 4개 자동 생성 (`handle_new_user` 트리거)
- [ ] `/(app)/inventory` 페이지 RSC 초기 로딩 < 500ms (TTI)
- [ ] typeahead 검색 응답 < 200ms (디바운스 250ms 후 측정)
- [ ] 한국어 검색: "양" prefix → 양파/양배추/양상추/... 상위 / "양ㅍ" 오타 → trigram fallback 동작
- [ ] D-Day 분류: D-2 이하 = urgent (빨강), D-7 이하 = soon (노랑), 그 외 = fresh/expired/unknown
- [ ] `addIngredient` → 폼 닫힘 + 리스트에 추가 (`revalidatePath`)
- [ ] `deleteIngredient` → 즉시 제거 (optimistic update 또는 revalidate)
- [ ] `consumeIngredient` → 수량 부분 차감, qty=0 도달 시 `consumed=true` 명시적 UPDATE
- [ ] 모든 mutation Server Action이 `Result<T, string>` 반환
- [ ] mutation 후 `Toast` (Phase 0b primitive)로 피드백 표시
- [ ] `computeDDay.spec.ts` 8 fixture 모두 통과
- [ ] 다른 사용자 데이터 접근 불가 (RLS 통합 테스트 통과)
- [ ] `inventory-happy-path` E2E 통과 (chromium)
- [ ] `pnpm web typecheck` 0 errors
- [ ] `pnpm web lint` 0 errors

---

## §8 Definition of Done

- [ ] 모든 §7 Acceptance 충족
- [ ] `pnpm web typecheck` 0 errors
- [ ] `pnpm web db:check-drift` 통과 (0003-0008b 7개 마이그레이션 ↔ db-schema §3.2 일치)
- [ ] `pnpm web test` 통과 (computeDDay + integration)
- [ ] `pnpm web test:e2e` 통과 (inventory-happy-path)
- [ ] PRD.md §3 로드맵 체크박스 업데이트
- [ ] `docs/CHANGELOG.md` 항목 추가 (Pre-flight PoC 결과 + 핵심 결정 포함)
- [ ] `gitleaks detect` 통과
- [ ] **모바일 웹뷰 스모크 테스트**: Vercel preview deploy → `apps/mobile/.env.preview` `WEB_BASE_URL` 갱신 → `eas build --profile preview --platform android` → 안드로이드 sideload → 가입 → 식재료 추가 → 리스트 표시 정상 (conventions §7)
- [ ] git commit + tag `v0.1.0` (MVP 출시 마일스톤)
- [ ] Architect 검증 (ralph 프로토콜 — 별도 호출)

### 8.5 롤백 절차

| 종류 | 절차 |
|---|---|
| 마이그레이션 (immutable) | 적용된 후 절대 수정 X. 새 `0003a_fix_*.sql` 등 추가 (Architect 1.A) |
| handle_new_user 함수 교체 (0008) | `create or replace function`이라 idempotent. 이전 본문(Phase 0a 0002)으로 되돌리려면 별도 `0008c_revert_*.sql` |
| 코드 (UI / Server Actions) | `git revert <commit>` |
| 데이터 (사용자 ingredient INSERT) | RLS로 사용자별 격리. dev DB는 `pnpm web db:reset`으로 wipe |
| 시드 데이터 0006 변경 | 새 마이그레이션 (DELETE old + INSERT new) 추가 |
| Vercel 배포 | 이전 preview/production deployment로 대시보드에서 promote |

---

## §9 위험 / 완화

| 위험 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| pg_trgm 한국어 검색 ranking 부적절 | 중 | 중 | Pre-flight PoC 30분 (§0). Plan B = Fuse.js 클라이언트 fuzzy + hangul-js 초성 검색 + 마스터 ~150 row 1시간 캐시. 결과를 `docs/CHANGELOG.md` Phase 1 섹션에 기록 |
| handle_new_user 함수 교체 시 기존 user 영향 | 저 | 중 | `on conflict (user_id) do nothing` idempotent + §2.4 backfill 쿼리 제공 |
| 시드 ~150 row 부족 | 중 | 저 | 사용자 직접 추가 path (`ingredient_master`에 `user_id` 있는 row INSERT) — 본 phase 범위 |
| user_ingredients RLS bypass 시도 | 저 | 고 | RLS 정책 (`auth.uid() = user_id`) + 통합 테스트 검증 (§6.2) |
| typeahead RPC DB 부하 | 저 | 중 | 클라이언트 디바운스 250ms + RPC 자체 `limit p_limit` (default 10) |
| 타임존 버그 (KST vs UTC) | 중 | 중 | `computeDDay.ts` 단위 테스트 8 fixture + KST edge case 회귀 차단 |

### 9.5 관측 / 로깅

- **성능 목표**: `/(app)/inventory` RSC TTI < 500ms, typeahead < 200ms (conventions §13)
- **Server Action 에러**: `console.error` + Vercel Function logs (MVP 기준 — conventions §12)
- **사용자 피드백**: `toast({ tone: 'danger', description: result.error })` (Phase 0b primitive)
- **RLS deny 카운트**: Supabase 대시보드 Auth logs에서 수동 확인 (Phase 1 종료 시 1회)

---

## §10 일별 작업 분배

- **Day 1**: 0003-0006 마이그레이션 파일 생성 + 시드 큐레이션 + `pnpm web db:reset` + **Pre-flight PoC 30분** (search_ingredient_masters 응답 측정) + RLS 기초 검증
- **Day 2**: 0007 + 0008 (함수 교체) + 0008b RPC + `pnpm web db:types` + `handle_new_user` 트리거 동작 확인 + `pnpm web db:check-drift`
- **Day 3**: `entities/ingredient` (computeDDay + DDayBadge + types + dday-thresholds) + 단위 테스트 8 fixture
- **Day 4**: `features/add-ingredient` (Server Action + Dialog + typeahead 훅)
- **Day 5**: `features/list-inventory` + `features/delete-ingredient` + `features/consume-ingredient` + `widgets/inventory-list`
- **Day 6**: `pages/(app)/inventory` (RSC + loading) + 통합 테스트 + RLS E2E
- **Day 7**: E2E (inventory-happy-path) + 회귀 검증 + 모바일 웹뷰 스모크 + tag `v0.1.0`

---

## §11 모바일 통합

EAS preview build 1회 (conventions §7):

1. Vercel preview deploy 완료 → preview URL 확보
2. `apps/mobile/.env.preview` `WEB_BASE_URL` 갱신 (수동 1줄)
3. `eas build --profile preview --platform android` (Expo 무료 티어 월 30분 — Phase 1 1회 소비)
4. APK 다운 → 안드로이드 sideload
5. 스모크 시나리오: 가입 → `/(app)/inventory` 진입 → 식재료 추가 → 리스트 표시 → 로그아웃
6. 모든 동작 OK면 phase 종료 + tag `v0.1.0`
