# 스마트 냉장고 & 레시피 매니저 — 단계별 실행 계획

> 출력 산출물: 본 문서 (`docs/PLAN.md`)
> 대상 앱: `apps/web` (Next.js 16 App Router) → `apps/mobile` 웹뷰 wrapper
> 백엔드: Supabase 무료 티어 (Postgres + Auth + Storage + Realtime)
> 작업자: 1인, 사이드 프로젝트, phase당 1–2주 출시 가능 단위

---

## 1. Executive Summary

PRD의 5개 핵심 기능을 **6개 phase + Phase 0a/0b(셋업)** 으로 분할한다. 각 phase는 단독으로 출시(웹뷰 빌드 + Vercel 배포) 가능한 incremental value를 가진다. Phase 0를 0a/0b로 쪼개 각각 2-3일 / 3-4일로 압축하여 첫 출시까지의 인지 오버헤드를 줄였다.

| Phase | 이름 | 기간 | MVP 가치 |
|---|---|---|---|
| **0a** | DB 마이그레이션 인프라 + Type Codegen + 보일러플레이트 정리 | 2–3일 | Supabase 마이그레이션 워크플로우 동작, 타입 자동 생성 |
| **0b** | App Shell + Primitives + Query Provider + 테스트 인프라 | 3–4일 | 라우트 골격 + 디자인 토큰 적용 primitives + Vitest/Playwright |
| **1** | 인벤토리 CRUD (수동 입력) | 1주 | 식재료 추가/조회/삭제, D-Day 표시 — **이것만으로도 출시 가능** |
| **2** | 인벤토리 고도화 (정렬·필터·이동·소진) | 1–1.5주 | 보관 장소/카테고리 분리, 부분 소진, 만료 알림 배지 |
| **3** | 레시피 마스터 + 단순 매칭 추천 | 1.5–2주 (시드 큐레이션 1–2일 포함) | 시드 레시피 100선 + 보유 재료 매칭 점수 + YouTube 영상 임베드 |
| **4** | 요리 히스토리 + 듀얼 추천 | 1주 | 만든 요리 기록, 재료 클릭 → 과거/신규 레시피 병렬 표시 |
| **5** | 장보기 브릿지 (부족 재료 + 커머스 deeplink) | 1주 | 레시피 → 부족 재료 자동 계산 → 쿠팡/B마트/마켓컬리 검색 URL |
| **6** | 스마트 입력 (바코드 + OCR) — 외부 API 의존 | 2주 | 바코드 스캔 자동 등록, 영수증 OCR 일괄 등록 (가성비 검증 필요) |

**MVP 정의**: Phase 1까지가 최소 출시 단위 (sign-up → 식재료 추가 → 만료 추적). Phase 3까지가 **데모 가능 MVP** (PRD 핵심 가치 ─ "재료 보고 메뉴 정함" ─ 충족). Phase 6은 ROI 검증 후 진입.

**총 일정 추정**: 0a(2-3d) + 0b(3-4d) + 1(7d) + 2(7-10d) + 3(10-14d) + 4(7d) + 5(7d) + [6(14d) 옵션] = **약 6-8주** (Phase 6 포함 시 8-10주)

---

## 2. 시스템 아키텍처 개요

### 2.1 데이터 흐름

```
[모바일 웹뷰 (RN)] ──HTTPS──┐
                            │
[웹 브라우저] ──HTTPS──┐    │
                       ▼    ▼
                  ┌─────────────────────────────────┐
                  │  Next.js 16 (apps/web, Vercel)  │
                  │                                 │
                  │  ├─ Server Components (RSC)     │ ← 첫 페이지 로드, 인증 체크
                  │  ├─ Server Actions              │ ← 폼 제출, 도메인 mutation
                  │  ├─ Route Handlers (api/*)      │ ← 외부 API proxy, webhook
                  │  └─ Client Components           │ ← TanStack Query, Zustand
                  └────────────┬────────────────────┘
                               │ supabase-js (sb_publishable_*)
                               │ + admin client (sb_secret_*, server-only)
                               ▼
                  ┌─────────────────────────────────┐
                  │       Supabase (free tier)      │
                  │  ├─ Postgres + RLS              │
                  │  ├─ Auth (email/password)       │
                  │  ├─ Storage (영수증 이미지)     │
                  │  └─ Realtime (도입 X, §5.6 참조) │
                  └─────────────────────────────────┘

  외부 API (Phase 3+):
   - YouTube Data API v3 ─── Route Handler proxy (할당량 보호)
   - 식약처 바코드 정보 ─── Route Handler proxy (Phase 6)
   - OCR (ML Kit on-device 1순위 / Naver Clova fallback) ─── Phase 6
   - 커머스 검색 URL ─── 클라이언트에서 직접 deeplink 생성 (외부 API 호출 없음)
```

### 2.2 외부 API 결정 행렬

| API | 도입 phase | wrapper 위치 | 이유 |
|---|---|---|---|
| **YouTube Data API v3** | Phase 3 | `app/api/youtube/search/route.ts` | API key 서버 보관 + 결과 캐싱(Postgres `youtube_cache` 테이블) — 일일 10K 할당량 보호 |
| **커머스 deeplink (쿠팡·B마트·마켓컬리)** | Phase 5 | 클라이언트 (검색 URL 패턴만 사용) | 단순 URL 조합, 외부 호출 없음. 파트너 API 미사용 |
| **바코드 → 상품정보** | Phase 6 | `app/api/barcode/[code]/route.ts` | 식약처 식품안전나라 OpenAPI(무료) 1차 + 자체 `barcode_cache` 폴백 |
| **OCR (영수증)** | Phase 6 | RN 측 ML Kit on-device 1순위 + 데스크탑은 Storage→`/api/ocr/receipt`→Clova fallback | §6 Architect Answer 5 결정 |

### 2.3 환경 변수 (모두 `.env.local`, 시크릿은 Vercel Environment Variables)

```
# 이미 설정됨
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...                # server-only — Phase 3 youtube_cache write,
                                                  #               Phase 6 barcode/OCR cache write
                                                  # 사용 경로: createSupabaseAdminClient() 내부
                                                  # Route Handler에서만 호출 (RSC/SSR/Server Action 금지)

# Phase 3+
YOUTUBE_API_KEY=...                              # server-only

# Phase 5 (커머스 deeplink 토글)
BAEMIN_ENABLED=true                              # 쿠팡·마켓컬리만 켜고 B마트는 끌 수 있음
COUPANG_ENABLED=true
KURLY_ENABLED=true

# Phase 6
BARCODE_API_KEY=...                              # server-only (식약처)
OCR_FALLBACK_ENABLED=true                        # Clova fallback 비용 게이트 토글 (>$5/월 예측 시 false)
NAVER_CLOVA_OCR_API_KEY=...                      # server-only
NAVER_CLOVA_OCR_INVOKE_URL=...                   # server-only
```

---

## 3. DB 스키마 마스터

> 마이그레이션 파일 경로: `apps/web/supabase/migrations/NNN_description.sql`
> 마이그레이션 순서는 phase별 섹션에 명시. **본 섹션은 최종 상태의 단일 진실 공급원(SSoT)** — phase별 변경은 여기에 누적 반영된다.

### 3.0 Supabase 디렉토리 위치 결정 (Architect Answer 4)

**위치**: `apps/web/supabase/` (root 아님, `packages/db` 아님)

**이유**:
- 백엔드를 web 단독으로 사용. mobile은 webview-only이므로 DB 클라이언트 코드를 직접 갖지 않음
- Supabase CLI는 cwd-relative로 `supabase/` 디렉토리를 찾음 → `pnpm web db:*` 형태로 자연스럽게 라우팅됨
- types codegen 결과 (`apps/web/src/shared/api/supabase/types.ts`)를 같은 패키지 내에서 import → 다른 패키지에서 cross-package 의존성 없음

**디렉토리 레이아웃**:
```
apps/web/
├── supabase/
│   ├── config.toml                # supabase init 결과
│   ├── migrations/                # 0001_*.sql … 0018_*.sql
│   ├── seeds/                     # ingredient_master, recipes_seed 등 (마이그레이션 분리 시)
│   └── functions/                 # Edge Functions (현재 미사용)
├── src/
│   └── shared/api/supabase/
│       ├── client.ts              # browser supabase-js
│       ├── server.ts              # SSR/RSC supabase-js (cookies)
│       ├── admin.ts               # service-role supabase-js (Route Handler only)
│       └── types.ts               # gen typescript 자동 결과 (커밋 O)
└── package.json                   # db:* 스크립트
```

**`apps/web/package.json` db:* 스크립트**:

| Script | Command | 용도 |
|---|---|---|
| `db:start` | `supabase start` | 로컬 Postgres 컨테이너 (RLS 통합 테스트용) |
| `db:stop` | `supabase stop` | 컨테이너 정지 |
| `db:reset` | `supabase db reset` | 로컬 DB 초기화 + 모든 마이그레이션 재실행 |
| `db:push` | `supabase db push --linked` | 원격 Supabase에 마이그레이션 push (수동, **Vercel 자동 X**) |
| `db:diff` | `supabase db diff -f {name}` | 로컬↔원격 schema diff → 새 마이그레이션 파일 |
| `db:types` | `supabase gen types typescript --linked > src/shared/api/supabase/types.ts` | types.ts 재생성 |

**`apps/web/.gitignore` 추가 항목**:
```
supabase/.branches
supabase/.temp
supabase/.env
```

**types.ts 커밋 정책**: O (마이그레이션 PR마다 함께 갱신 → schema drift 즉시 감지)

**`turbo.json` db task 추가 X**: 부수효과(원격 DB 변경)가 있어 cache 거짓 hit 가능. CLI 직접 실행만.

**Vercel 자동 마이그레이션 비활성화**: 무료 티어 단일 환경(prod direct deploy) 위험. 수동 흐름으로 강제:
1. 로컬에서 `pnpm web db:push` 실행 → 원격 schema 갱신
2. `pnpm web db:types` 실행 → types.ts 갱신 + 커밋
3. `pnpm web typecheck` & `pnpm web build` 통과 확인
4. git push → Vercel 자동 배포는 코드만 배포 (마이그레이션 X)
5. phase 끝에 release tag (`v0.1.0` 등)

### 3.0.1 Postgres 버전 호환성 확인 (Phase 0a 사전 의존성)

**확인 절차** (Phase 0a 첫날):
1. Supabase 대시보드 SQL Editor에서 `select version();` 실행
2. PG **15 이상** 인 경우 → `unique nulls not distinct` 사용 가능 (현 plan 기준)
3. PG **15 미만** 인 경우 → 모든 `unique nulls not distinct (user_id, name)` 제약을 다음 partial unique index로 대체:

```sql
-- 예: ingredient_master 의 경우
create unique index ingredient_master_user_name_uniq
  on ingredient_master (user_id, name)
  where user_id is not null;
create unique index ingredient_master_global_name_uniq
  on ingredient_master (name)
  where user_id is null;

-- 동일 패턴을 ingredient_categories 에도 적용
```

PG 15+ 가 정상이고 Supabase 무료 티어도 현재 PG 15 (확인 시점 2025년 기준 PG 15.x)이지만, **plan 진입 첫날 1줄 SQL 검증 후 결정 기록**을 `docs/CHANGELOG.md` 에 남긴다.

### 3.1 테이블 일람

| 테이블 | 도입 phase | 소유 | 설명 |
|---|---|---|---|
| `auth.users` | Phase 0a (Supabase 내장) | 시스템 | 인증 사용자 |
| `user_profiles` | Phase 0a | 사용자별 | 닉네임/타임존 등 (auth.users 1:1) |
| `storage_locations` | Phase 1 | 사용자별 | 보관 장소 (냉장실/냉동실/실온/김치냉장고/사용자정의) |
| `ingredient_categories` | Phase 1 | 글로벌(read-only) + 사용자 추가 | 카테고리 (육류/채소/유제품 등) |
| `ingredient_master` | Phase 1 | 글로벌(read-only) + 사용자 추가 | 식재료 마스터 (이름/기본 카테고리/기본 보관일수) |
| `user_ingredients` | Phase 1 | 사용자별 | 사용자 보유 식재료 인스턴스 (수량/유통기한/보관 장소) |
| `recipe_master` | Phase 3 | 글로벌(read-only) | 레시피 마스터 (이름/설명/조리시간/난이도) |
| `recipe_ingredients` | Phase 3 | 글로벌 | 레시피별 필수/선택 재료 + 양 |
| `youtube_cache` | Phase 3 | 글로벌(서버 write) | YouTube 검색 결과 24h 캐시 |
| `cooking_history` | Phase 4 | 사용자별 | 요리 기록 (만든 레시피, 소진 재료) |
| `cooking_history_consumed_ingredients` | Phase 4 | 사용자별 | 히스토리 조인 (소진 재료 ID + 양) |
| `shopping_list` | Phase 5 | 사용자별 | 장보기 목록 (수동/레시피 기반 자동) |
| `barcode_cache` | Phase 6 | 글로벌(서버 write) | 바코드 → 상품정보 캐시 |
| `receipt_uploads` | Phase 6 | 사용자별 | 영수증 업로드 메타 (Storage 경로 + OCR 상태) |

### 3.2 정밀 스키마

#### `user_profiles`
```sql
create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### `storage_locations`
```sql
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
```

#### `ingredient_categories`
```sql
create table ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null = 글로벌 시드
  name text not null,
  icon text,                             -- emoji 또는 lucide 아이콘 키
  sort_order int not null default 0,
  unique nulls not distinct (user_id, name)
  -- PG 15 미만 시: §3.0.1 partial unique index 패턴으로 대체
);
```

#### `ingredient_master`
```sql
create table ingredient_master (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null = 글로벌 시드
  name text not null,
  category_id uuid references ingredient_categories(id),
  default_shelf_life_days int,           -- null = 알 수 없음
  default_storage_kind storage_kind,
  unique nulls not distinct (user_id, name)
  -- PG 15 미만 시: §3.0.1 partial unique index 패턴으로 대체
);
create index ingredient_master_name_trgm on ingredient_master using gin (name gin_trgm_ops);
```

#### `user_ingredients` ★ (Phase 1 핵심)
```sql
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
```

> **D-Day는 SQL view + 클라이언트 timezone 보정** — generated column 대신 view `user_ingredients_with_dday` 권장 (`current_date` 의존, 하루 단위로만 의미 있음).
> ```sql
> create view user_ingredients_with_dday as
>   select *, (expires_at - current_date) as days_until_expiry
>   from user_ingredients
>   where consumed = false;
> ```
> Postgres `current_date` 는 서버 타임존(UTC)으로 동작 → KST 보정은 클라이언트 `entities/ingredient/lib/computeDDay.ts` 에서 dayjs `tz('Asia/Seoul')` 로 재계산. Phase 1 종료 시 timezone 통합 테스트.

#### `recipe_master`, `recipe_ingredients` (Phase 3)
```sql
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
```

#### `youtube_cache` (Phase 3)
```sql
create table youtube_cache (
  query_key text primary key,            -- e.g., "recipe:김치찌개"
  payload jsonb not null,                -- YouTube API 응답 일부 (아래 명시)
  fetched_at timestamptz not null default now()
);
-- 24h 후 stale 처리: SELECT 시 fetched_at + interval '24 hours' < now() 체크
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

#### `cooking_history` (Phase 4)
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
```

#### `shopping_list` (Phase 5)
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
```

#### `barcode_cache`, `receipt_uploads` (Phase 6)
```sql
create table barcode_cache (
  barcode text primary key,
  product_name text,
  brand text,
  default_category_id uuid references ingredient_categories(id),
  payload jsonb,                          -- 원본 응답
  fetched_at timestamptz not null default now()
);

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

### 3.3 RLS 정책 패턴

**원칙**: `auth.uid() = user_id` 정책으로 사용자별 데이터 격리. 글로벌 read-only 테이블은 `select` 만 허용.

```sql
-- 사용자별 테이블 (user_ingredients, storage_locations, cooking_history, shopping_list, receipt_uploads)
alter table user_ingredients enable row level security;
create policy "user_owns_rows" on user_ingredients
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 글로벌 + 사용자 추가 가능 (ingredient_master, ingredient_categories)
alter table ingredient_master enable row level security;
create policy "read_global_or_own" on ingredient_master
  for select
  using (user_id is null or auth.uid() = user_id);
create policy "insert_own" on ingredient_master
  for insert
  with check (auth.uid() = user_id);   -- 글로벌 추가는 admin client만

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

> **profile/storage INSERT 정책 절대 만들지 말 것** (Architect Answer 2): `handle_new_user()` security definer 함수만 INSERT. 일반 사용자는 RLS상 INSERT 권한 없음 → 트리거 우회 시도 자동 차단.

### 3.4 시드 데이터 전략

| 데이터 | 출처 | 적재 시점 | 적재 방식 |
|---|---|---|---|
| `ingredient_categories` (글로벌 ~12개) | 직접 정의 (육류/채소/과일/유제품/곡물/조미료/가공식품/음료/기타) | Phase 1 마이그레이션 (`0004_*`) | `INSERT ... user_id IS NULL` |
| `ingredient_master` (글로벌 ~150개) | 한국 가정 빈출 식재료 직접 정의 (대파/양파/계란/우유 등 + 기본 보관일수) | Phase 1 마이그레이션 (`0006_*`) | `INSERT ... user_id IS NULL` |
| `recipe_master` (글로벌 100선) | 직접 큐레이션 (한식 50 + 양식/일식/중식 50). **이미지·영상은 시드 X** (영상은 YouTube API 런타임 fetch) | Phase 3 마이그레이션 (`0012_*`) | `0012_recipes_seed.sql` (별도 파일, **Phase 3 안에서 1–2일 큐레이션 작업 포함**) |
| `storage_locations` | 사용자 가입 시 기본 4개(냉장실/냉동실/실온/김치냉장고) 자동 생성 | Phase 1 — Auth 트리거 (`0008_*`) | `0008_user_default_storage_locations.sql` 함수 교체 패턴 |

---

## 4. Phase별 로드맵

### Phase 0a — DB 마이그레이션 인프라 + Type Codegen + 보일러플레이트 정리 (2–3일)

**목표**: Supabase CLI 마이그레이션 워크플로우 동작 + types.ts 자동 생성 + 기존 보일러플레이트 제거 + auth 가드 RSC 진입점.

**사전 의존성**:
- Supabase 프로젝트(이미 있음) + Vercel 프로젝트 연결 (이미 있음)
- 로컬 Supabase CLI 설치: `brew install supabase/tap/supabase`
- `supabase login` 으로 access-token 인증 (`~/.supabase/access-token`)
- `cd apps/web && supabase link --project-ref <id>` 로 원격 프로젝트 연결
- **PG 버전 확인** (§3.0.1) — 결과를 `docs/CHANGELOG.md` 에 한 줄 기록

**디렉토리 구성**:
- `apps/web/supabase/` 생성 (`supabase init`)
- `apps/web/.gitignore` 에 `supabase/.branches`, `supabase/.temp`, `supabase/.env` 추가

**DB 변경**:

`apps/web/supabase/migrations/0001_init.sql` — pg_trgm extension
```sql
create extension if not exists pg_trgm;
```

`apps/web/supabase/migrations/0002_user_profiles.sql` — user_profiles + handle_new_user() 트리거 (Architect Answer 2 본문 그대로)
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

**UI 작업** (정리 + 베이스, 0a는 디자인 시스템 없이 최소 라우트 골격만):
- `apps/web/src/app/page.tsx` — 보일러플레이트 제거, `getUser()` → null이면 `/login`, 아니면 `/inventory` redirect
- `apps/web/src/app/layout.tsx` — `metadata` 한국어로 갱신, dark mode 유틸 사용 흔적 제거
- `apps/web/src/app/account/page.tsx` 위치 이동: `apps/web/src/app/(app)/account/page.tsx` 로 마이그레이션 (한 줄 이동, dark: 유틸 제거)
- `apps/web/src/app/(app)/layout.tsx` — RSC 진입 시 `supabase.auth.getUser()` → null이면 `redirect('/login')` (cross-cutting §5.5 인증 가드). **사용 패턴** (Minor Issue 4 해소): `const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser();` — `createSupabaseServerClient`는 내부에서 `next/headers`의 `cookies()`를 호출하므로 layout.tsx에서 추가 인자 전달 불필요
- `apps/web/src/app/(auth)/login/page.tsx` — 기존 그대로 유지 (이미 동작)

**로직 작업**:
- `apps/web/src/shared/api/supabase/types.ts` — `supabase gen types typescript --linked` 결과 파일 (자동 생성, **커밋 O**)
- `apps/web/package.json` — db:* 6개 스크립트 추가 (§3.0 표 참조)
- `apps/web/src/shared/api/supabase/client.ts`, `server.ts`, `admin.ts` — `createClient<Database>()` 제네릭 적용 (이미 있는 client/server는 retypes 만 적용)
- `apps/web/src/shared/api/supabase/admin.ts` 신설 — `createSupabaseAdminClient()` (Route Handler 전용, `SUPABASE_SECRET_KEY` 사용)
- `apps/web/src/shared/lib/result.ts` — `Result<T, E>` 타입 + `ok()/err()` 헬퍼 (cross-cutting 에러 처리)
- `apps/web/src/proxy.ts` (Next 16) — **세션 쿠키 갱신 only**, redirect 로직 X (§5.5)

**환경 정리**:
- `docs/CHANGELOG.md` 신설 (한 줄: `## v0.0.1 (Phase 0a) — DB infra + codegen 셋업`)
- gitleaks 설정 (필수 격상): 워크스페이스 루트 `.gitleaks.toml` 룰 파일 작성. Phase 0a에서는 수동 `pnpm dlx gitleaks detect` 1회 실행으로 검증. **자동 hook은 Phase 0b에서 lefthook 확정** (Phase 0b §git hook 도구 결정 참조)

**API 연동**: 없음 (Supabase만)

**테스트**: 없음 (테스트 인프라는 0b에 도입)

**수락 기준**:
- [ ] `pnpm web db:push --linked` 로 0001/0002 마이그레이션이 원격에 반영됨
- [ ] `pnpm web db:types` 실행 시 `src/shared/api/supabase/types.ts` 가 갱신되고 `Database` 타입 export됨
- [ ] 신규 사용자 가입 시 `user_profiles` row가 트리거로 자동 생성됨 (수동 SQL 검증: `select * from user_profiles`)
- [ ] `apps/web/src/app/page.tsx` 가 보일러플레이트 없이 `/inventory` 또는 `/login` 으로 리다이렉트
- [ ] `app/(app)/account/page.tsx` 진입 시 인증되지 않은 사용자는 `/login` 리다이렉트
- [ ] `pnpm web typecheck` & `pnpm web lint` 통과
- [ ] gitleaks 1회 실행 PASS (`.env*` 누출 없음)
- [ ] `docs/CHANGELOG.md` Phase 0a 섹션 추가됨

**위험/완화**:
- **트리거 RLS 충돌** — `security definer` + `set search_path` + INSERT 정책 미생성으로 트리거만 INSERT 가능
- **타입 codegen에 access token 필요** — 로컬 `~/.supabase/access-token` 사용. CI/Vercel은 마이그레이션 자동화 X(§3.0)
- **PG 15 미만일 경우** — 첫날 확인 후 §3.0.1 partial unique index로 plan 일괄 교체

---

### Phase 0b — App Shell + Primitives + Query Provider + 테스트 인프라 (3–4일)

**목표**: 인증된 사용자가 진입할 RSC 라우트 그룹 + 디자인 토큰 사용 primitives 7종 + TanStack Query Provider + Vitest/Playwright 셋업.

**사전 의존성**: Phase 0a.

**DB 변경**: 없음.

**UI 작업** (FSD widgets + shared/ui):
- `apps/web/src/widgets/app-shell/AppHeader.tsx` (Client) — 좌측 로고/타이틀, 우측 마이페이지 아이콘
- `apps/web/src/widgets/app-shell/BottomNav.tsx` (Client) — 탭 4개: 인벤토리(active 후일) / 레시피(disabled) / 히스토리(disabled) / 마이페이지
- `apps/web/src/app/(app)/layout.tsx` — `<AppHeader>` + `<BottomNav>` 슬롯 배치
- `apps/web/src/app/(app)/inventory/page.tsx` — placeholder ("Phase 1에서 구현")
- `apps/web/src/shared/ui/` — primitives **7종** (디자인 토큰만 사용, Tailwind 임의 값 금지):
  - `Button.tsx` — variant: primary | secondary | ghost | destructive
  - `Card.tsx` — 둥근 모서리/그림자/패딩 토큰 사용
  - `Badge.tsx` — D-Day 색상 매핑에 사용 (Phase 1에서 활용)
  - `Input.tsx` — text/number/date 타입 + label + 에러 메시지
  - `Dialog.tsx` — `@radix-ui/react-dialog` 래퍼
  - `Skeleton.tsx` — 로딩 스크린 (RSC `loading.tsx` 에서 사용)
  - `Toast.tsx` — `sonner` 또는 `radix-ui/toast` (mutation 피드백, Phase 1 추가/수정/삭제 시 즉시 사용)

**로직 작업**:
- `apps/web/src/shared/lib/query-client.ts` — TanStack Query `QueryClient` 생성 (defaultOptions: 5분 staleTime, 1회 retry)
- `apps/web/src/shared/lib/query-provider.tsx` — `'use client'` Provider 래퍼
- `apps/web/src/app/layout.tsx` — `<QueryProvider>` 주입 (root layout)

**테스트 인프라 셋업** (Critical Issue 9 해소):
- 의존성 설치 (apps/web): `vitest@^1`, `@vitest/coverage-v8`, `@vitest/ui`, `@playwright/test`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- `apps/web/vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';
  import path from 'node:path';

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      globals: true,
    },
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  });
  ```
- `apps/web/vitest.setup.ts` — `@testing-library/jest-dom` import
- `apps/web/playwright.config.ts` — chromium 1개 프로젝트, `webServer: { command: 'pnpm web dev', url: 'http://localhost:3000' }`
- `pnpm exec playwright install chromium --with-deps` 실행 (1회)
- `apps/web/package.json` 스크립트 추가: `test`, `test:watch`, `test:ui`, `test:e2e`
- Supabase local CLI는 `db:start` 로 이미 셋업됨 (RLS 통합 테스트용 Postgres 컨테이너) — `vitest --environment node` 모드로 통합 테스트 분리 가능 (Phase 1에서 활용)

**git hook 도구 결정 — Lefthook** (Minor Issue 1 해소, §5.8 모호함 제거):
- **선택**: `lefthook` (이유: husky보다 가볍고 yaml 단일 파일 설정, pnpm 모노레포 친화적, 1인 작업자 가성비)
- 의존성: `pnpm add -D -w lefthook gitleaks`
- 워크스페이스 루트 `lefthook.yml` 예시:
  ```yaml
  pre-commit:
    parallel: true
    commands:
      gitleaks:
        run: gitleaks protect --staged --no-banner
      typecheck:
        glob: "apps/web/src/**/*.{ts,tsx}"
        run: pnpm web typecheck
  ```
- 설치: `pnpm dlx lefthook install` (1회, `.git/hooks/pre-commit` 갱신)
- gitleaks 룰: 워크스페이스 루트 `.gitleaks.toml` (Phase 0a에서 생성된 `apps/web/.gitleaks.toml` 룰을 루트로 승격)

**FSD 베이스 모듈**:
- `apps/web/src/shared/config/`, `apps/web/src/shared/model/`, `apps/web/src/entities/`, `apps/web/src/features/`, `apps/web/src/widgets/` 디렉토리 구조 + 각 디렉토리에 `.gitkeep` 또는 placeholder index.ts

**API 연동**: 없음.

**테스트** (셋업 검증용 1개씩):
- 단위(Vitest): `shared/ui/Button.test.tsx` — render + click handler 1개
- E2E(Playwright): `app.spec.ts` — `/login` 로딩 + 로고 표시 1개

**수락 기준**:
- [ ] `pnpm web test` 실행 시 Button 단위 테스트 PASS
- [ ] `pnpm web test:e2e` 실행 시 Playwright `/login` 로딩 테스트 PASS
- [ ] `<AppHeader>` + `<BottomNav>` 가 `/inventory` placeholder 페이지에 렌더링됨
- [ ] primitives 7종이 디자인 토큰만 사용 (`text-[14px]` 같은 임의 값 0건 — 단위 lint 또는 수동 확인)
- [ ] `pnpm web typecheck` & `pnpm web lint` 통과
- [ ] `<QueryProvider>` root layout 주입 확인 (DevTools 또는 child component에서 useQueryClient() 호출 가능)

**위험/완화**:
- **Playwright chromium 다운로드** — 200MB+ 1회 다운로드, CI 미도입 상태이므로 로컬 1회로 OK
- **primitives 7종 작업 시간** — radix-ui 활용으로 a11y 부담 감소. Toast는 `sonner` 1줄 셋업 권장

---

### Phase 1 — 인벤토리 CRUD (1주) ★ MVP 단위

**목표**: 로그인 사용자가 보유 식재료를 직접 추가/조회/수정/삭제하고, 유통기한 D-Day를 한눈에 본다. **이 phase 끝나면 출시 가능 (작은 규모지만 사용자에게 가치 전달).**

**사전 의존성**: Phase 0a + 0b 완료. 글로벌 식재료/카테고리 시드 정의(텍스트 ~150개).

**DB 변경**:
- `apps/web/supabase/migrations/0003_storage_locations.sql` — `storage_kind` enum + `storage_locations` 테이블 + RLS
- `apps/web/supabase/migrations/0004_ingredient_categories.sql` — `ingredient_categories` + RLS + 글로벌 시드 12개 INSERT
- `apps/web/supabase/migrations/0005_ingredient_master.sql` — `ingredient_master` + RLS + `pg_trgm` 인덱스
- `apps/web/supabase/migrations/0006_ingredient_master_seed.sql` — 글로벌 식재료 ~150개 INSERT
- `apps/web/supabase/migrations/0007_user_ingredients.sql` — `user_ingredients` + RLS + 인덱스 + view `user_ingredients_with_dday`
- `apps/web/supabase/migrations/0008_user_default_storage_locations.sql` — `handle_new_user()` 함수 교체 (Architect Answer 2 본문):

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

- `apps/web/supabase/migrations/0008b_search_ingredient_masters.sql` — pg_trgm 한국어 검색 RPC 함수 (Architect Answer 1 본문):

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

**pg_trgm 한국어 PoC** (Phase 1 시작 첫 30분 — Critical Issue 3):
1. `pnpm web db:start` (로컬 컨테이너) → migrations 적용
2. 시드 150개 INSERT 후 다음 쿼리 응답 시간 측정:
   - `select * from search_ingredient_masters('양', null, 10);` (prefix)
   - `select * from search_ingredient_masters('양파', null, 10);` (exact)
   - `select * from search_ingredient_masters('양ㅍ', null, 10);` (오타 허용)
3. 응답 시간 ≤ 50ms + 합리적 결과 → 통과. 실패 시 Plan B로 분기:
   - **Plan B**: 프런트 `Fuse.js` 클라이언트 fuzzy + 초성검색 `hangul-js` (Phase 2 옵션). 클라이언트는 ingredient_master 전체 fetch (150개 → 약 30KB) 후 메모리에서 매칭
4. 결과를 `docs/CHANGELOG.md` Phase 1 섹션에 한 줄 기록

**UI 작업** (FSD 레이어 명시):
- `app/(app)/inventory/page.tsx` (RSC) — 인증 체크 + `<InventoryListWidget>` 마운트 + 첫 페이지 데이터 SSR
- `widgets/inventory-list/` (Client) — 보관 장소 탭 + 카테고리 그룹 + D-Day 정렬 옵션
- `entities/ingredient/ui/IngredientCard.tsx` — 단일 식재료 카드 (이름/수량/D-Day 배지/메모)
- `entities/ingredient/ui/DDayBadge.tsx` — D-Day < 0(빨강), 0–2(주황), 3–7(노랑), 8+(녹색) 색상 매핑
- `features/add-ingredient/ui/AddIngredientDialog.tsx` (Client) — 식재료 검색(typeahead, 250ms 디바운스 + `search_ingredient_masters` RPC) + 수량/단위/보관장소/유통기한 폼
- `features/edit-ingredient/ui/EditIngredientDialog.tsx`
- `features/delete-ingredient/ui/DeleteIngredientButton.tsx`

**로직 작업**:
- `entities/ingredient/model/types.ts` — `UserIngredient`, `IngredientWithDDay` 타입 (types.ts에서 generated 타입 re-export)
- **`entities/ingredient/lib/computeDDay.ts`** — D-Day 계산 함수 (KST 강제, Architect Answer 2 + cross-cutting):
  ```ts
  // entities/ingredient/lib/computeDDay.ts
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import tz from 'dayjs/plugin/timezone';
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
    if (days <= 2) return { days, bucket: 'urgent' };
    if (days <= 7) return { days, bucket: 'soon' };
    return { days, bucket: 'fresh' };
  }
  ```
- `entities/ingredient/api/queries.ts` — TanStack Query
  - `useUserIngredients(filter)` queryKey: `['user-ingredients', userId, filter]`
  - `useIngredientMasters(searchTerm)` queryKey: `['ingredient-masters', searchTerm]` — `search_ingredient_masters` RPC 호출
- `features/add-ingredient/api/actions.ts` (Server Action) — `addIngredient(input)` 시그니처:
  ```ts
  async function addIngredient(input: {
    masterId: string;
    storageLocationId: string;
    quantity: number;
    unit: string;
    purchasedAt?: string;
    expiresAt?: string;
    memo?: string;
  }): Promise<Result<{ id: string }, string>>
  ```
- `features/edit-ingredient/api/actions.ts` — `updateIngredient(id, patch)`
- `features/delete-ingredient/api/actions.ts` — `deleteIngredient(id)` (soft delete via `consumed = true`)
- 모든 Server Action 끝에 `revalidatePath('/inventory')` 또는 클라이언트 측 `queryClient.invalidateQueries(['user-ingredients'])`
- **결정 기준 (Server Action vs Route Handler)**: 폼 제출/도메인 mutation = Server Action. 외부 API proxy = Route Handler. 본 phase는 모두 Server Action.

**API 연동**: 없음

**테스트**:
- 단위 (Vitest):
  - `entities/ingredient/lib/computeDDay.test.ts` — KST/UTC edge case (자정 직전, 윤년, null expires_at)
  - `DDayBadge` 색상 매핑 함수
- 통합 (Vitest, `vitest --environment node` + Supabase local):
  - **RLS 정책 검증** — 사용자 A가 사용자 B의 `user_ingredients` 를 읽을 수 없음 확인
  - `search_ingredient_masters` RPC가 anon/authenticated 양쪽에서 동작
- E2E (Playwright, 1개 happy path):
  - 로그인 → 식재료 1개 추가 → 인벤토리에 표시 → 삭제

**수락 기준**:
- [ ] 신규 사용자 가입 → 4개 기본 보관 장소가 자동 생성됨
- [ ] 식재료 검색 typeahead가 한글 부분일치(`pg_trgm`)로 동작 (250ms 디바운스, "양" / "양파" / "양ㅍ" 모두 결과 반환 — PoC 통과 시)
- [ ] 식재료 추가/수정/삭제 후 인벤토리 화면 즉시 반영(낙관적 업데이트 또는 invalidate)
- [ ] 유통기한 임박(D-2 이내) 카드에 빨강/주황 배지 표시 (KST 기준)
- [ ] 다른 사용자 데이터 접근 불가(RLS 통합 테스트 통과)
- [ ] mutation 후 `Toast` (Phase 0b primitive) 로 피드백 표시
- [ ] `pnpm web typecheck` & `pnpm web lint` 통과
- [ ] Playwright happy path 1개 통과

**위험/완화**:
- **타임존 버그** (KST vs UTC) — `entities/ingredient/lib/computeDDay.ts` 단위 테스트로 회귀 차단
- **시드 데이터 정확도** — 150개 보관 일수 추정치. 사용자가 수정 가능하게 (Phase 2에서 마스터 fork 기능)
- **pg_trgm PoC 실패** — Plan B(Fuse.js)로 즉시 분기, plan 변경 사항을 CHANGELOG 에 기록

---

### Phase 2 — 인벤토리 고도화 (1–1.5주)

**목표**: 정렬/필터/소진/이동/만료 알림 배지로 PRD 2.1의 "직관적 UI" 기준 충족.

**사전 의존성**: Phase 1.

**DB 변경**:
- `apps/web/supabase/migrations/0009_user_ingredient_partial_consume.sql`
  - `user_ingredients.original_quantity numeric(10,2)` 추가 (소진 진행률 표시용)
  - 부분 소진 트리거: `quantity` 가 0 도달 시 `consumed = true` 자동 설정
  - check constraint 재확인: `quantity >= 0` (0007에서 이미 있음, 노트만)
- `apps/web/supabase/migrations/0010_dashboard_stats_function.sql`
  - SQL function `get_inventory_summary(p_user uuid)` returns `(total int, expiring_soon int, expired int)` — 인벤토리 헤더 요약 배지에 사용

**`0009_user_ingredient_partial_consume.sql` 본문** (Critical Issue 3 신규 해소):

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

> **트리거-RPC 일관성 메모**: Phase 4의 `log_cooking_session()` 본문(§Phase 4)은 명시적으로 `update ... set consumed = true` 처리한다. 이 트리거가 도입되면 두 경로(앱 직접 quantity 업데이트 + RPC) 모두 동일하게 `consumed=true`로 자동 마킹된다. log_cooking_session의 명시적 update는 트리거와 redundant하지만 **안전성을 위해 그대로 유지**(double-write OK, idempotent). 앱 측 직접 quantity 업데이트 경로는 트리거에 의존.

**`get_inventory_summary()` SQL 본문** (Critical Issue 2 신규 해소):

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

**UI 작업**:
- `widgets/inventory-list/ui/InventoryFilterBar.tsx` — 보관 장소 / 카테고리 / 정렬(D-Day asc·구매일 desc·이름)
- `widgets/inventory-list/ui/InventorySummaryHeader.tsx` — "총 N개 / 임박 M개 / 만료 K개"
- `features/consume-ingredient/ui/ConsumeIngredientSheet.tsx` — 부분/전체 소진 (slider 또는 quick buttons 25/50/75/100%)
- `features/move-ingredient/ui/MoveIngredientButton.tsx` — 보관 장소 변경 빠른 메뉴
- `features/manage-storage/` — 사용자 정의 보관 장소 추가/이름변경/삭제

**로직 작업**:
- `entities/ingredient/api/queries.ts` 확장 — `useInventorySummary()` queryKey: `['inventory-summary', userId]`
- `features/consume-ingredient/api/actions.ts` — `consumeIngredient(id, amount)` (amount=null → 전체 소진)
- `features/move-ingredient/api/actions.ts` — `moveIngredient(id, newLocationId)`
- Zustand store: `entities/ingredient/model/filter-store.ts` — UI 필터 상태(보관장소/카테고리/정렬) 클라이언트 측 보존. 서버 데이터와 분리.
- (선택, Plan B 발동 시) `entities/ingredient/lib/koSearchClient.ts` — Fuse.js + hangul-js 초성검색 fallback

**API 연동**: 없음

**테스트**:
- 단위: 부분 소진 후 `quantity == 0 → consumed = true` 트리거 검증 (Vitest + Supabase local)
- E2E: 식재료 추가 → 50% 소진 → quantity 절반 표시 → 100% 소진 → 인벤토리에서 사라짐

**수락 기준**:
- [ ] 보관 장소 탭 전환 시 즉시 필터링
- [ ] 정렬 옵션(D-Day asc/desc, 구매일, 이름) 동작
- [ ] 부분 소진(25/50/75%) UI에서 quantity 비례 감소
- [ ] 전체 소진 시 인벤토리에서 제거(consumed=true) + 만료 배지 카운트 갱신
- [ ] 사용자 정의 보관 장소 추가 가능(예: "와인셀러")

**위험/완화**:
- **Zustand vs URL state** — 필터를 URL searchParams로 동기화하면 새로고침/공유에 강함. 단순화를 위해 Phase 2는 Zustand only, Phase 3 이후 URL 동기화 옵션 평가.

---

### Phase 3 — 레시피 마스터 + 단순 매칭 + YouTube (1.5–2주, 시드 큐레이션 1–2일 포함)

**목표**: 레시피 100선 시드 + 보유 재료 기반 매칭 점수 추천 + 레시피 상세에 YouTube 영상 임베드.

**사전 의존성**: Phase 1 (`ingredient_master`), Phase 2 권장(점선 의존). **YouTube Data API v3 키 발급 (무료, 일일 10K quota)**.

**시드 큐레이션 작업** (이 phase 안에 1–2일 포함, 별도 phase로 분리 X):
- 한식 50선 + 양식/일식/중식 50선 직접 큐레이션
- 각 레시피: name / description / cook_minutes / difficulty / servings / instructions_md + 필수재료 5–8개 + 선택재료 2–4개
- CSV로 작성 → SQL `INSERT` 변환 스크립트 (`apps/web/supabase/seeds/recipes_to_sql.mjs` 1회용)

**DB 변경**:
- `apps/web/supabase/migrations/0011_recipes.sql` — `recipe_difficulty` enum + `recipe_master` + `recipe_ingredients` + RLS(read-only) + `recommend_recipes()` SQL 함수
- `apps/web/supabase/migrations/0012_recipes_seed.sql` — 100선 INSERT (큐레이션 결과)
- `apps/web/supabase/migrations/0013_youtube_cache.sql` — `youtube_cache` 테이블 + RLS (anon SELECT 허용)

**`recommend_recipes()` SQL 함수 본문** (Architect Answer 3 그대로):

```sql
-- ───────── 매칭 공식 ─────────
-- score = 0.7 * (필수보유/필수전체)
--       + 0.2 * (선택보유/max(선택전체, 1))
--       + 0.1 * (임박보유/필수전체)
--
-- 임계값:
--   ≥ 0.95 → "지금 만들 수 있음"
--   0.5 ~ 0.95 → "재료 1-2개 부족"
--   < 0.5 → 추천 제외 (호출자가 필터링)

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
        and ui.expires_at - current_date <= 2
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
```

**TS Mirror 구현** (Architect Answer 3, `entities/recipe/lib/computeRecipeMatch.ts`):

```ts
// entities/recipe/lib/scoring-constants.ts
export const WEIGHT_REQUIRED = 0.7;
export const WEIGHT_OPTIONAL = 0.2;
export const WEIGHT_URGENT = 0.1;
export const SCORE_READY_THRESHOLD = 0.95;
export const SCORE_RECOMMEND_THRESHOLD = 0.5;

// entities/recipe/lib/computeRecipeMatch.ts
import {
  WEIGHT_REQUIRED,
  WEIGHT_OPTIONAL,
  WEIGHT_URGENT,
} from './scoring-constants';

export type RecipeIngredient = {
  ingredient_master_id: string;
  is_optional: boolean;
  quantity?: number | null;
  unit?: string | null;
};

export type UserIngredientView = {
  ingredient_master_id: string;
  expires_at: string | null;   // ISO date
  consumed: boolean;
  quantity: number;
};

export type RecipeMatchResult = {
  score: number;
  required_total: number;
  required_have: number;
  optional_total: number;
  optional_have: number;
  urgent_have: number;
  missing_required: RecipeIngredient[];
  missing_optional: RecipeIngredient[];
};

const URGENT_DAYS = 2;

function isUrgent(expiresAt: string | null, today: Date): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt);
  const diffDays = Math.floor(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays >= 0 && diffDays <= URGENT_DAYS;
}

export function computeRecipeMatch(
  recipeIngredients: RecipeIngredient[],
  userIngredients: UserIngredientView[],
  today: Date = new Date(),
): RecipeMatchResult {
  const haveSet = new Set<string>();
  const urgentSet = new Set<string>();
  for (const ui of userIngredients) {
    if (ui.consumed || ui.quantity <= 0) continue;
    haveSet.add(ui.ingredient_master_id);
    if (isUrgent(ui.expires_at, today)) {
      urgentSet.add(ui.ingredient_master_id);
    }
  }

  let requiredTotal = 0;
  let requiredHave = 0;
  let optionalTotal = 0;
  let optionalHave = 0;
  let urgentHave = 0;
  const missingRequired: RecipeIngredient[] = [];
  const missingOptional: RecipeIngredient[] = [];

  for (const ri of recipeIngredients) {
    if (ri.is_optional) {
      optionalTotal++;
      if (haveSet.has(ri.ingredient_master_id)) optionalHave++;
      else missingOptional.push(ri);
    } else {
      requiredTotal++;
      if (haveSet.has(ri.ingredient_master_id)) {
        requiredHave++;
        if (urgentSet.has(ri.ingredient_master_id)) urgentHave++;
      } else {
        missingRequired.push(ri);
      }
    }
  }

  if (requiredTotal === 0) {
    return {
      score: 0,
      required_total: 0,
      required_have: 0,
      optional_total: optionalTotal,
      optional_have: optionalHave,
      urgent_have: 0,
      missing_required: [],
      missing_optional: missingOptional,
    };
  }

  const score =
    WEIGHT_REQUIRED * (requiredHave / requiredTotal) +
    WEIGHT_OPTIONAL * (optionalHave / Math.max(optionalTotal, 1)) +
    WEIGHT_URGENT * (urgentHave / requiredTotal);

  return {
    score,
    required_total: requiredTotal,
    required_have: requiredHave,
    optional_total: optionalTotal,
    optional_have: optionalHave,
    urgent_have: urgentHave,
    missing_required: missingRequired,
    missing_optional: missingOptional,
  };
}
```

**TS ↔ SQL 동치성 단위 테스트 전략**:
- 5–7개 fixture (인벤토리 + 레시피 조합) 작성
- TS `computeRecipeMatch()` 결과 vs SQL `recommend_recipes()` 결과(`score` 컬럼) 차이 `< 0.0001` 확인
- 가중치는 `scoring-constants.ts` 단일 출처. SQL 본문 변경 시 TS 본문도 함께 변경 (PR 룰)

**호출 패턴 결정** (Architect Answer 3):
- **RSC에서 직접 RPC 호출** (Route Handler 캐시 X). `app/(app)/recipes/page.tsx` 가 SSR로 첫 페이지 데이터 fetch
- 50ms 측정 후 응답 ≥ 100ms 시 `unstable_cache` (Next 16) 도입 검토
- Phase 3 진입 시 EXPLAIN ANALYZE로 인덱스 활용 확인 (recipe_ingredients_master_idx)

**UI 작업**:
- `app/(app)/recipes/page.tsx` (RSC) — 추천 레시피 리스트 (RSC 직접 RPC, 첫 페이지 SSR)
- `app/(app)/recipes/[id]/page.tsx` (RSC) — 레시피 상세
- `widgets/recipe-recommendations/` — "지금 만들 수 있는 요리" (score ≥ 0.95) / "재료 1–2개 부족" (0.5 ≤ score < 0.95) 섹션 분리
- `entities/recipe/ui/RecipeCard.tsx` — 매칭 점수 배지(보유율 N/M)
- `entities/recipe/ui/RecipeYouTubeEmbed.tsx` (Client) — `<iframe>` lazy mount (Intersection Observer)
- `features/view-recipe-match/` — 보유/부족 재료 분리 표시
- `widgets/app-shell/BottomNav.tsx` — "레시피" 탭 활성화

**로직 작업**:
- `entities/recipe/model/types.ts` — `RecipeWithMatch`
- `entities/recipe/lib/scoring-constants.ts` (위 본문)
- `entities/recipe/lib/computeRecipeMatch.ts` (위 본문)
- `entities/recipe/api/queries.ts`:
  - `useRecipeRecommendations()` — RSC 결과를 hydration / 또는 client TanStack Query (`['recipes', 'recommendations', userId]`)
  - `useRecipeDetail(id)`
  - `useRecipeYouTube(recipeName)` — `/api/youtube/search?q=...` 호출
- `app/api/youtube/search/route.ts` — Route Handler (서버 admin client 사용, `SUPABASE_SECRET_KEY`):
  1. `youtube_cache` 에서 `query_key = "recipe:{name}"` 조회 (RLS bypass: `createSupabaseAdminClient()`), fresh(24h)면 반환
  2. 미스 시 YouTube Data API v3 호출 (`server-only` env `YOUTUBE_API_KEY`, `axios` 또는 native `fetch`)
  3. 응답 일부(상위 5개 video)만 `youtube_cache.payload` 형식으로 변환 후 INSERT (admin client) → 반환
  4. 에러/할당량 초과 시 빈 배열 반환 + 5xx 아닌 200 (UX 우선) + Vercel logs `console.warn`

**API 연동**:
- **YouTube Data API v3** — `app/api/youtube/search/route.ts` 만 호출. **클라이언트는 절대 직접 호출 금지** (키 노출 방지).
- **`SUPABASE_SECRET_KEY` 사용 경로 명시**: `youtube_cache` write는 admin client (`createSupabaseAdminClient()`) 호출이며, 이 admin client는 **Route Handler 내부에서만** 호출됨. RSC/Server Action 에서는 절대 호출 X.
- 캐시 hit ratio 측정용 로깅 (단순 `console.info`, Vercel logs)

**테스트**:
- 단위: `computeRecipeMatch` — fixture로 다양한 매칭 케이스(완전 일치/부분 일치/optional/단위 차이/임박재료)
- 통합: SQL `recommend_recipes` function 결과 정합성 (사용자 식재료 inserts → 함수 호출 → TS와 score 차이 < 0.0001)
- E2E: 인벤토리에 재료 3개 추가 → 추천 페이지에 만들 수 있는 레시피 1개 이상 노출 → 상세 진입 → YouTube 임베드 렌더

**수락 기준**:
- [ ] 시드 100선 레시피가 마이그레이션으로 적재됨
- [ ] 인벤토리에 재료가 없으면 "재료 0/N" 으로 모든 레시피가 부족 상태 표시 (score < 0.5 → 추천 제외 → 빈 화면 + empty state)
- [ ] 매칭 함수가 필수 재료 100% 보유 시 "지금 만들 수 있음" (score ≥ 0.95) 섹션에 노출
- [ ] 레시피 상세 진입 시 YouTube 임베드 렌더링 (캐시 적중 시 < 200ms 응답)
- [ ] YouTube API 할당량 초과 시 페이지가 깨지지 않음 (graceful degradation)
- [ ] TS↔SQL score 동치성 단위 테스트 5개 이상 통과 (`< 0.0001` 차이)

**위험/완화**:
- **YouTube quota (10K/일)** — 24h cache로 동일 쿼리 재호출 방지. 사용자 N명 × 레시피 M개 = 호출 N×M 1회 발생 후 24h 무료. 필요 시 cache TTL을 7d로 연장.
- **레시피 100선 큐레이션 작업량** — phase 안에 1–2일 명시 포함. CSV → seed.sql 변환 스크립트 1회용.
- **단위 정규화** — recipe_ingredients의 단위(`g`, `개`, `큰술`)와 user_ingredients의 단위가 다르면 매칭 실패. **Phase 3는 단위 무시 (보유 여부만)**, 정규화는 후속 phase 또는 out-of-scope 명시.
- **TS↔SQL drift** — `scoring-constants.ts` 단일 출처 + PR 시 SQL 변경하면 TS 변경 강제 (코드 리뷰 룰)

---

### Phase 4 — 요리 히스토리 + 듀얼 추천 (1주)

**목표**: PRD 2.4 — 만든 요리를 기록하고, 인벤토리에서 재료 클릭 시 "과거 요리" + "신규 요리" 병렬 추천.

**사전 의존성**: Phase 3.

**DB 변경**:
- `apps/web/supabase/migrations/0014_cooking_history.sql` — `cooking_history` + `cooking_history_consumed_ingredients` + RLS + 인덱스
- `apps/web/supabase/migrations/0015a_recommend_for_ingredient.sql` — SQL function `recommend_for_ingredient(p_user, p_master_id, p_limit_each)` returns `(past_recipes jsonb, new_recipes jsonb)` (한 번 호출로 두 리스트)
- `apps/web/supabase/migrations/0015b_log_cooking_session.sql` — RPC `log_cooking_session(...)` (트랜잭션 보장)

**`recommend_for_ingredient()` SQL 함수 본문** (PRD §2.4 듀얼 추천 — Critical Issue 1 신규 해소):

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

> **시그니처 일치 검증**: `recommend_recipes()`의 returns table에 `recipe_id uuid, name text, cook_minutes int, score real` 컬럼이 모두 있음 (Phase 3 §본문 line 904–916 참조). `cooking_history.cooked_at` / `recipe_id` / `user_id` 컬럼은 §3.2 본문 line 314–325 정의 그대로 사용.

**`log_cooking_session()` RPC 시그니처 + 본문** (Critical Issue 7 해소):

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

**UI 작업**:
- `app/(app)/history/page.tsx` (RSC) — 요리 히스토리 타임라인
- `widgets/cooking-history-timeline/`
- `entities/cooking-record/ui/CookingRecordCard.tsx`
- `features/log-cooking/ui/LogCookingDialog.tsx` — 레시피 선택(또는 직접 입력) + 소진 재료 체크박스 (인벤토리에서 자동 추출 + 사용자 quantity 편집 가능)
- `widgets/ingredient-detail-sheet/` — 인벤토리에서 재료 클릭 시 bottom sheet:
  - 상단 탭: "과거 요리" / "신규 요리"
  - 좌측 = `cooking_history` 조인, 우측 = `recipe_master` 매칭(과거 요리 제외)

**로직 작업**:
- `features/log-cooking/api/actions.ts` — `logCooking(input)`:
  ```ts
  async function logCooking(input: {
    recipeId?: string;
    customRecipeName?: string;
    consumedIngredients: { masterId: string; quantity: number; unit: string }[];
    rating?: number;
    memo?: string;
  }): Promise<Result<{ id: string }, string>>
  ```
  - 내부: `supabase.rpc('log_cooking_session', { p_user, p_recipe_id, p_custom_recipe_name, p_consumed, p_rating, p_memo })` 호출
  - try/catch로 RPC 에러 → 한국어 메시지 변환 (`'unauthorized: ...'` → `'세션이 만료되었습니다. 다시 로그인하세요.'`)
- `entities/cooking-record/api/queries.ts`:
  - `useCookingHistory(filter)` queryKey: `['cooking-history', userId, filter]`
  - `useDualRecommendations(ingredientId)` queryKey: `['dual-rec', userId, ingredientId]`
- 듀얼 추천 호출 패턴: **RSC + Supabase RPC** (외부 API 없음, 인증 cookie로 직접 호출). Route Handler proxy X.

**API 연동**: 없음

**테스트**:
- 통합: `recommend_for_ingredient` SQL function — 사용자가 김치찌개 1회 만든 후 양파 클릭 → past_recipes에 김치찌개 포함, new_recipes에서 김치찌개 제외
- 통합: `log_cooking_session` 트랜잭션 — 재료 3개 차감 후 1개에서 에러 발생 시 전체 rollback (수동 raise로 시뮬레이션)
- E2E: 레시피 상세 → "만들었어요" → 히스토리에 기록 → 사용한 재료가 인벤토리에서 차감 (expires_at 빠른 것부터)

**수락 기준**:
- [ ] 요리 기록 시 트랜잭션 무결성 (히스토리 + 재료 차감이 원자적)
- [ ] 부분 차감 우선순위: `expires_at ASC` (빠른 만료부터 소진) → 통합 테스트 검증
- [ ] 재료 클릭 시 듀얼 추천 sheet 0.5초 내 표시
- [ ] 과거에 만든 적 있는 요리는 "신규" 리스트에서 자동 제외
- [ ] 평점/메모 선택 입력 가능
- [ ] RPC 에러 발생 시 한국어 메시지 토스트 표시

**위험/완화**:
- **트랜잭션 처리** — Supabase RPC function (`log_cooking_session`) 으로만 다중-table 트랜잭션 보장. Server Action에서 supabase-js의 여러 INSERT를 호출하면 atomicity 없음. → **반드시 RPC 사용**.
- **부분 차감 정확도** — `for update` 락으로 동시성 문제 방지. 단일 사용자 동시 호출 빈도 낮음 → 낙관적 충돌 거의 없음.

---

### Phase 5 — 장보기 브릿지 (1주)

**목표**: PRD 2.5 — 레시피 선택 시 부족 재료 자동 추출 → 커머스 deeplink로 즉시 이동.

**사전 의존성**: Phase 3 (recipe_master), Phase 1 (user_ingredients).

**DB 변경**:
- `apps/web/supabase/migrations/0016_shopping_list.sql` — `shopping_source` enum + `shopping_list` + RLS

**Pre-flight 검증** (Phase 5 진입 전 30분 — Critical Issue 11 해소):
- 쿠팡/B마트/마켓컬리 검색 URL 패턴 검증 — 실제 브라우저에서 4–5개 검색어("양파", "두부", "김치", "삼겹살")로 동작 확인
- 미작동 사이트는 즉시 비활성화 결정 (env 토글: `BAEMIN_ENABLED=false` 등)
- 검증 결과를 `docs/CHANGELOG.md` Phase 5 섹션에 기록 (예: "쿠팡 ✓, 마켓컬리 ✓, B마트 ✗ → 비활성화")

**UI 작업**:
- `app/(app)/shopping/page.tsx` (RSC) — 장보기 목록
- `widgets/shopping-list/`
- `entities/shopping-item/ui/ShoppingItemRow.tsx` — 체크박스 + 이름/수량 + "쇼핑하기" 외부 링크 메뉴
- `features/extract-recipe-gap/ui/ExtractGapButton.tsx` — 레시피 상세에서 "부족 재료 장바구니에 담기"
- `features/manual-add-shopping/ui/AddShoppingDialog.tsx`
- `features/commerce-deeplink/ui/CommerceLinkMenu.tsx` — env 토글에 따라 쿠팡/B마트/마켓컬리 0–3개 버튼 (URL 패턴):
  - 쿠팡: `https://www.coupang.com/np/search?q={encoded}`
  - 마켓컬리: `https://www.kurly.com/search?sword={encoded}`
  - B마트: pre-flight 검증 결과에 따라 (검색 URL 미공개 시 비활성화)

**로직 작업**:
- `features/extract-recipe-gap/api/actions.ts` — `extractRecipeGap(recipeId)`:
  - 1) 레시피 재료 목록 fetch
  - 2) 사용자 인벤토리 fetch
  - 3) `entities/recipe/lib/computeRecipeMatch` 재사용해 missing 추출
  - 4) `shopping_list` INSERT (source='recipe_gap', recipe_id, master_id…) — 중복 시 quantity 합산 (단, **단위 동일할 때만 합산**)
  - 5) **단위 충돌 처리** (Minor Issue 3 해소): 단위가 다른 경우(`recipe_ingredient.unit !== user_ingredient.unit`) Phase 5에서는 **단위 변환 미지원**. 다른 단위 항목은 `shopping_list.note` 컬럼에 `'단위 확인 필요'`를 기록하여 표시하고, 사용자가 수동으로 결정. 자동 변환은 §7 out-of-scope
- `features/commerce-deeplink/lib/buildCommerceUrl.ts`:
  ```ts
  type Commerce = 'coupang' | 'kurly' | 'bmart';
  function buildCommerceUrl(c: Commerce, ingredientName: string): string;
  // env 토글 검증: COUPANG_ENABLED / KURLY_ENABLED / BAEMIN_ENABLED
  ```
- Zustand store `entities/shopping-item/model/checked-store.ts` — UI 체크 상태(서버 동기화 전 낙관적)

**API 연동**:
- 없음 — 모든 deeplink는 클라이언트 URL 조합
- env 토글로 미작동 사이트 즉시 비활성화 (정직한 UX)

**모바일 웹뷰 빌드/배포** (cross-cutting §5.7 명시):
- Vercel preview URL → RN `WEB_BASE_URL` env 갱신 (예: `https://rn-app-dev-pr-N.vercel.app`)
- EAS 빌드: 월 30분 무료 티어 ($0)
- 빌드 시간: ~10분/회. Phase 5 끝에 1회 빌드 + 스모크 테스트 (로그인 / 인벤토리 / 레시피 / 장보기 deeplink 새 탭)

**테스트**:
- 단위: `buildCommerceUrl` — 한글/특수문자 인코딩 + env 토글 false 시 disabled 반환 확인
- 통합: `extractRecipeGap` — 레시피 7재료 중 사용자 4보유 → shopping_list 3개 INSERT, 기존 list에 있던 항목은 quantity 합산
- E2E: 레시피 상세 → "부족 재료 담기" → 장보기 페이지 → "쿠팡에서 사기" → 새 탭 열림 검증(Playwright `page.context().on('page', ...)`)

**수락 기준**:
- [ ] **Pre-flight 30분 URL 패턴 검증 완료** — 쿠팡/B마트/마켓컬리 4-5개 검색어 동작 확인. 미작동 사이트 env로 비활성화
- [ ] 부족 재료 정확히 계산 (단위 동일 시)
- [ ] 장보기 목록 체크 시 `bought=true` 토글
- [ ] 커머스 링크가 새 탭에서 열림(`target="_blank" rel="noopener noreferrer"`)
- [ ] 동일 재료 중복 추출 시 quantity 합산되어 1행만 표시
- [ ] 모바일 웹뷰 빌드 1회 + 스모크 테스트 PASS

**위험/완화**:
- **B마트 검색 URL 정확도** — phase 진입 전 30분 검증으로 차단. 불확실 시 deeplink 옵션에서 제외하고 쿠팡/마켓컬리만 노출.
- **수량 단위 mismatch** — Phase 3와 동일 한계. 사용자가 수동 편집 가능 UI 제공.

---

### Phase 6 — 스마트 입력 (바코드 + OCR) (2주, ROI 검증 후 진입)

**목표**: PRD 2.2 — 바코드 스캔/영수증 OCR로 일괄 등록. **외부 API 의존이 가장 큰 phase로 마지막에 배치.**

**사전 의존성**: Phase 1. 모바일 웹뷰 카메라 권한 브릿지 필요.

**OCR 결정** (Architect Answer 5 그대로):

| 후보 | 위치 | 정확도(영수증 한국어) | 비용 | 결정 |
|---|---|---|---|---|
| **Google ML Kit Text Recognition** | 모바일 네이티브 (RN, on-device) | ★★★★ | $0/월 | **1순위** |
| Naver Clova General OCR | 서버 | ★★★★★ | ~$4.5/월 @ 1500 호출 | **2순위 fallback** (데스크탑 + ML Kit 실패 시) |
| Google Vision OCR | 서버 | ★★★★ | 월 1000 무료 | 3순위 (Clova 대체 옵션) |
| Tesseract.js | 클라이언트 (wasm) | ★★ (30~50% 보고됨†) | $0 | **비추천** (wasm 16MB, 정확도 낮음) |

> † Tesseract.js 한국어 영수증 정확도 30~50% 수치는 GitHub issues / 한국 OCR 비교 블로그(naver / tistory) 일반 보고치 — 정확한 출처 링크는 PoC 시 자체 영수증 5장 측정 후 `docs/CHANGELOG.md` Phase 6 섹션에 갱신. 본 plan 작성 시점에는 ML Kit/Clova 1·2순위 결정의 보조 근거로만 사용.

- **모바일** (PRD 주요 시나리오): RN 측 `@react-native-ml-kit/text-recognition` 사용. on-device 처리, $0
- **데스크탑 fallback**: Storage 업로드 → Route Handler `/api/ocr/receipt` → Clova 호출 → parsed_items 응답
- **비용 게이트**: $5/월. 트리거 룰 `DAU × 인당영수증 × 30 ≥ 2000` 시 Clova fallback 비활성화 (`OCR_FALLBACK_ENABLED=false` 토글). 데스크탑 사용자에게 "모바일 앱에서 시도하세요" UX

**OCR PoC** (Phase 6 진입 전 1일):
- ML Kit + Clova 둘 다 영수증 5장씩 측정 (실측 정확도 + 응답시간)
- 결과 → `docs/CHANGELOG.md` Phase 6 섹션 기록

**DB 변경**:
- `apps/web/supabase/migrations/0017_barcode_cache.sql` — `barcode_cache`
- `apps/web/supabase/migrations/0018_receipt_uploads.sql` — `ocr_status` enum + `receipt_uploads` + RLS
- Supabase Storage 버킷: `receipts/` (사용자별 폴더 정책 + 30일 lifecycle policy)

**`webview-protocol` 메시지 확장** (Architect Answer 5):
RN ↔ web 브릿지에 OCR 4개 메시지 추가:
```ts
// packages/webview-protocol/src/messages.ts (추정 경로, 실제 경로는 0a 결과 기반)
| { type: 'OCR_RECEIPT_REQUEST'; payload: { mode: 'mlkit' } }
| { type: 'OCR_RECEIPT_RESULT';  payload: { rawText: string; lines: string[] } }
| { type: 'OCR_RECEIPT_CANCEL';  payload: {} }
| { type: 'OCR_RECEIPT_ERROR';   payload: { code: string; message: string } }
```

**UI 작업**:
- `features/scan-barcode/ui/BarcodeScanner.tsx` (Client, 모바일 only) — 카메라 stream → ZXing-js 디코드 → 결과 → `barcode_cache` lookup
- `features/scan-receipt/ui/ReceiptCapture.tsx` (Client) — 모바일은 RN 메시지 (`OCR_RECEIPT_REQUEST`), 데스크탑은 file input → Supabase Storage 업로드 → `receipt_uploads` 행 생성
- `features/scan-receipt/ui/ReceiptReviewSheet.tsx` — OCR 결과 (parsed_items) 사용자 검수/수정/일괄 추가

**로직 작업**:
- `features/scan-barcode/api/lookup.ts` (Route Handler `/api/barcode/[code]/route.ts`):
  - 1) `barcode_cache` 조회 (admin client)
  - 2) 미스 시 식약처 식품안전나라 OpenAPI 호출 (server-only env `BARCODE_API_KEY`)
  - 3) 캐시 저장 (admin client) 후 반환
  - 4) 미발견 시 사용자가 수동 입력하는 폴백 UI 안내
- `features/scan-receipt/api/upload-and-queue.ts` (Server Action, 데스크탑용):
  - 1) 이미지 → Supabase Storage 업로드
  - 2) `receipt_uploads` row INSERT (status=pending)
  - 3) Route Handler `/api/ocr/receipt`(POST)에 receipt_id 전달 → background 처리
- `app/api/ocr/receipt/route.ts`:
  - `OCR_FALLBACK_ENABLED=false` 시 즉시 `{ ok: false, error: '데스크탑 OCR 임시 비활성화' }` 반환
  - Clova 호출 (`NAVER_CLOVA_OCR_API_KEY`, `NAVER_CLOVA_OCR_INVOKE_URL`)
  - 결과 파싱 (한국어 영수증 라인 → 품목명/수량/금액 추출)
  - `receipt_uploads.parsed_items` 업데이트, status=done (admin client)
  - 실패 시 status=failed + error_message
- `features/scan-receipt/api/confirm-import.ts` — 검수 완료 시 일괄 `user_ingredients` INSERT (Server Action, 사용자 RLS context)
- 모바일 ML Kit 결과는 RN → web 메시지로 직접 `parsed_items` 전달 → 데스크탑과 동일 검수 UI

**API 연동**:
- **바코드**: 식약처 식품안전나라 OpenAPI (무료, 일일 1000회). 동작 검증 후 결정. 미작동 시 자체 DB 또는 사용자 입력.
- **OCR (모바일 1순위)**: ML Kit on-device, $0
- **OCR (데스크탑 fallback)**: Naver Clova General OCR, ~$4.5/월 (1500 호출 가정). 비용 게이트 토글 가동.

**테스트**:
- 단위: 영수증 OCR 결과 파싱(`parseReceiptText`) — fixture 영수증 텍스트 → 품목 배열
- 통합: barcode_cache hit/miss 경로
- E2E: 모바일 웹뷰에서 바코드 스캔 → 자동 등록 (수동 검증 — Playwright 카메라 자동화 어려움, 체크리스트로)

**수락 기준**:
- [ ] **OCR PoC 1일 완료** — ML Kit + Clova 영수증 5장씩 측정 결과 CHANGELOG 기록
- [ ] 바코드 스캔 → 0.5초 내 상품명 표시 (캐시 hit 시)
- [ ] 모바일 영수증 촬영 → ML Kit on-device 결과 < 5초
- [ ] 데스크탑 영수증 업로드 → Clova 결과 < 10초 (`OCR_FALLBACK_ENABLED=true` 시)
- [ ] OCR 결과 검수 화면에서 사용자 수정 후 일괄 등록 가능
- [ ] OCR 실패/할당량 초과/`OCR_FALLBACK_ENABLED=false` 시 수동 입력 폴백 UX 유지
- [ ] 영수증 이미지 30일 후 Storage lifecycle 자동 삭제

**위험/완화**:
- **OCR 비용** — 사이드 프로젝트 비용 부담. **결정 게이트**: Phase 5 종료 후 사용자 N명·DAU 측정 → OCR 도입 ROI 평가. 부정적이면 Phase 6 무기한 deferred. 트리거 룰 `DAU × 인당영수증 × 30 ≥ 2000` 시 Clova fallback 비활성화
- **모바일 카메라 브릿지** — RN webview ↔ web 통신은 `@the-others/webview-protocol` 이미 있음 (4개 OCR 메시지 추가 필요)
- **개인정보** — 영수증에 카드번호/이름 포함 가능. 업로드 시 마스킹 OR 사용자 동의 + 30일 후 자동 삭제(Storage lifecycle policy)

---

## 5. Phase 간 cross-cutting 결정

### 5.1 에러 처리
- 모든 Server Action 반환은 `Result<T, string>` (`features/*/api/actions.ts`)
- Route Handler는 항상 `{ ok: boolean, data?, error? }` JSON, HTTP 상태는 200 위주(외부 의존성 실패는 200 + ok:false)
- 클라이언트 측 에러 boundary는 `app/(app)/error.tsx` 1개 + 화면별 inline 에러 UI
- RPC 에러는 한국어 메시지 변환 (예: `'unauthorized: ...'` → `'세션이 만료되었습니다'`)

### 5.2 로딩 UI
- RSC: `app/(app)/<route>/loading.tsx` — `<Skeleton>` (Phase 0b primitive)
- Client mutation: 버튼 inline spinner + `<Toast>` (Phase 0b primitive — 추가/수정/삭제 시 즉시 사용)

### 5.3 디자인 토큰 강제
- `apps/web/src/app/(app)/account/page.tsx` 의 `dark:` 유틸은 정의되지 않은 토큰 → Phase 0a에서 제거됨
- 모든 신규 컴포넌트는 `text-heading-*`, `text-body-*-*`, `rounded-*` 토큰만 사용. Tailwind 임의 값(`text-[14px]`)은 PR 검토에서 reject.

### 5.4 다국어
- 한국어 only (out of scope). 모든 문자열 하드코딩 OK. 필요 시 후속 phase에서 i18n 도입.

### 5.5 인증 가드 (Critical Issue 10 해소 — 단일 책임 명시)

| 레이어 | 책임 | redirect? |
|---|---|---|
| `apps/web/src/proxy.ts` (Next 16) | 세션 쿠키 갱신 only (`updateSession`) | **NO** |
| `app/(app)/layout.tsx` (RSC) | `supabase.auth.getUser()` → null이면 `redirect('/login')` | **YES — 단일 진입점** |
| 개별 페이지 (RSC) | 추가 가드 X | NO |

- 기존 `apps/web/src/app/account/page.tsx` 를 `apps/web/src/app/(app)/account/page.tsx` 로 한 줄 이동 (Phase 0a)
- 미인증 라우트 (`(auth)/login`)는 (app) 그룹 밖 → 가드 적용 X

### 5.6 Realtime
- Phase 1–6 모두 polling/invalidate 충분. **Realtime 도입 X** (할당량·복잡도 회피). 협업 기능 도입 시 재평가.

### 5.7 모바일 검증 절차 + 빌드/배포
- **매 phase 끝에** 모바일 웹뷰 빌드 1회 + 스모크 테스트 체크리스트 (로그인 / 인벤토리 / 신규 phase 기능 / 새 탭 deeplink)
- 빌드 흐름:
  1. Vercel preview URL 확보 (자동)
  2. `apps/mobile` 의 `WEB_BASE_URL` env 갱신 (수동 1줄)
  3. `eas build --profile preview --platform android` (월 30분 무료 티어, $0)
  4. APK 다운 → 안드로이드 폰 sideload → 스모크 테스트
- 모바일 전용 코드 변경은 phase가 외부 하드웨어를 요구할 때(Phase 6)만

### 5.8 git 커밋 전략
- 마이그레이션은 phase 시작 시 1커밋 (`feat(db): phase N migrations`)
- 도메인 코드는 슬라이스 단위(예: `feat(inventory): add ingredient form`) atomic 커밋
- **gitleaks 필수** (Minor Issue 2 격상): `.gitleaks.toml` 룰 + git pre-commit hook (**lefthook 확정 — Phase 0b §git hook 도구 결정 참조**). `.env*` 절대 커밋 금지. Phase 0a에서는 룰 파일 + 수동 `pnpm dlx gitleaks detect` 1회 실행. Phase 0b에서 `lefthook` + `gitleaks protect --staged` 자동 실행으로 격상

### 5.9 테스트 인프라 (Phase 0b 셋업 완료 — Critical Issue 9 해소)
- Vitest 1개 config (`apps/web/vitest.config.ts`) — jsdom env + setup
- Playwright 1개 config (`apps/web/playwright.config.ts`) — chromium 1개 프로젝트
- Supabase local CLI (`db:start`) — RLS 통합 테스트용 Postgres 컨테이너
- CI는 phase 6까지 도입 보류 (1인 작업자 부담). 로컬 hook으로 typecheck + lint + 단위 테스트만 실행
- 의존성: `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `@playwright/test`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`

### 5.10 Server Action vs Route Handler 결정 룰

| 패턴 | 선택 | 예시 |
|---|---|---|
| 폼 제출 / 도메인 mutation | Server Action | addIngredient, logCooking |
| 외부 API proxy (key 보호) | Route Handler | /api/youtube/search, /api/barcode/[code], /api/ocr/receipt |
| RSC 데이터 fetch (RPC) | RSC 직접 호출 | recommend_recipes, recommend_for_ingredient |
| 캐시 write (RLS bypass) | Route Handler + admin client | youtube_cache write, barcode_cache write |
| 사용자 데이터 read (RLS context) | RSC 또는 client TanStack Query | user_ingredients fetch |

`SUPABASE_SECRET_KEY` (`createSupabaseAdminClient()`)는 **Route Handler 내부에서만 호출**. RSC/Server Action 절대 X.

---

## 6. Architect 결정 사항 (5개 — iteration 1 자문 결과)

이 섹션은 plan에 직접 박혀 있으므로 ralph는 추가 자문 없이 진행 가능. 자문 결과 요약:

### 6.1 pg_trgm 한국어 검색 (Architect Answer 1)
- **메인**: `search_ingredient_masters(p_query, p_user_id, p_limit)` — ILIKE prefix(rank 1.0) + ILIKE substring(0.7) + similarity(trigram) hybrid (Phase 1 §0008b 본문)
- **인덱스**: `gin (name gin_trgm_ops)` — 0005에서 생성
- **클라이언트 디바운스**: 250ms
- **Plan B**: `Fuse.js` 클라이언트 fuzzy + `hangul-js` 초성검색 (Phase 2 옵션, PoC 실패 시 발동)
- **PoC**: Phase 1 첫 30분 (시드 150개 + "양"/"양파"/"양ㅍ" 응답 측정 ≤ 50ms 목표)

### 6.2 handle_new_user() 트리거 (Architect Answer 2)
- 0002 전체 본문 + 0008 함수 교체 패턴 (Phase 0a + Phase 1 §본문 박힘)
- `security definer` + `set search_path = public, pg_temp` + idempotent `drop trigger if exists` 헤더
- `auth.uid()` 대신 **`NEW.id`** 사용 (트리거 컨텍스트 supabase_auth_admin)
- profile/storage INSERT 정책 절대 만들지 마라 — definer 함수만 INSERT

### 6.3 recommend_recipes() 매칭 (Architect Answer 3)
- **공식**: `0.7 * (필수보유/필수전체) + 0.2 * (선택보유/max(선택전체,1)) + 0.1 * (임박보유/필수전체)`
- **임계값**: ≥0.95 = "지금 만들 수 있음", 0.5~0.95 = "재료 1-2개 부족", <0.5 = 추천 제외
- SQL/TS 본문 + 동치성 테스트 (Phase 3 §본문 박힘)
- 호출 패턴: RSC 직접 RPC. 50ms 측정 후 100ms+ 시 `unstable_cache` 도입

### 6.4 supabase/ 위치 (Architect Answer 4)
- 위치: `apps/web/supabase/`
- db:* 스크립트 6종 (§3.0 표)
- Vercel 자동 마이그레이션 X — 수동 `pnpm web db:push --linked` + types 재생성 + 빌드 검증 (§3.0)
- types.ts 커밋 O, turbo.json db task 추가 X

### 6.5 OCR 결정 (Architect Answer 5)
- 1순위: ML Kit (모바일 on-device, $0)
- 2순위 fallback: Naver Clova OCR (~$4.5/월 @ 1500 호출)
- webview-protocol 메시지 4개 확장 (Phase 6 §본문)
- 비용 게이트 $5/월: `DAU × 인당영수증 × 30 ≥ 2000` 시 `OCR_FALLBACK_ENABLED=false`
- PoC: Phase 6 진입 전 1일 (영수증 5장씩 측정)

---

## 7. Out of scope (이번 로드맵 범위 외)

- 어드민 UI (레시피 마스터 편집, 사용자 관리)
- 결제/구독
- 푸시 알림 (만료 임박 알림은 phase 2의 화면 배지로 대체)
- 다국어
- 다크 모드 (디자인 토큰 정의 시 재검토)
- ML 기반 레시피 추천 (단순 매칭으로 시작)
- 사용자 간 레시피 공유/소셜
- 협업 가구(가족 공유 인벤토리) — Realtime 도입 시 검토
- 가격 비교(쿠팡/마켓컬리/B마트 가격 표시) — 커머스 API 미사용 결정에 따라
- 음성 입력
- Apple/Google Sign-In (이메일/비번만)
- **단위 자동 변환** (`g ↔ kg`, `개 ↔ 봉지`, `큰술 ↔ ml` 등) — Phase 3 매칭은 단위 무시(보유 여부만), Phase 5 장보기는 단위 동일할 때만 합산하고 다른 단위는 사용자 수동 결정으로 처리. 자동 변환은 **Phase 7+ 검토 사항**이며 현재 로드맵에선 영구 OOS (Minor Issue 5 결정)

---

## 부록 A. 의존성 그래프 (phase별 — Critical Issue 12 해소)

```
Phase 0a ──► Phase 0b ──► Phase 1 ─┬── Phase 2 (선택, 권장 — 점선)
                                   │
                                   └── Phase 3 ─┬── Phase 4
                                                │
                                                └── Phase 5 ─── Phase 6
```

- **Phase 0a → 0b → 1**: 강한 순차 의존
- **Phase 1 → 2**: 점선 (권장 but 의존 X) — 1 끝에 출시 가능, 2 건너뛰고 3 가능
- **Phase 1 → 3**: 강 의존 (`ingredient_master`)
- **Phase 3 → 4**: 강 의존 (`recipe_master`)
- **Phase 3 → 5**: 강 의존 (`recipe_master`)
- **Phase 5 → 6**: 권장 의존 (Phase 6은 Phase 1만 있으면 기술적으로 가능하지만 ROI 평가는 5 끝에 수행)
- **Phase 4와 5는 병렬 가능** (둘 다 3 의존). 1인 작업자 환경에서는 순차 권장

---

## 부록 B. Phase별 마이그레이션 파일 일람

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

---

## 부록 C. 1인 작업자 운영 원칙

1. **phase 끝마다 release tag** (`v0.0.1` Phase 0a, `v0.0.2` Phase 0b, `v0.1.0` Phase 1, `v0.2.0` Phase 2 ...) — 롤백 용이
2. **PR 단위는 슬라이스 또는 마이그레이션** (5개 이내 파일) — 셀프 리뷰 부담 경감
3. **하루 작업 시작 전 `pnpm web typecheck` + `pnpm web lint` 1회 실행** — drift 조기 감지
4. **모든 phase 종료 시** PRD §3 로드맵 체크박스 업데이트 + `docs/CHANGELOG.md` 추가 (phase, 결정 사항, PoC 결과 등)
5. **Architect 자문은 본 plan에 박힌 5개로 충분** — 추가 자문은 새로운 미지수 발생 시에만 호출 (over-planning 방지)
6. **gitleaks 1회 실행** (`pnpm dlx gitleaks detect`) — 매 PR 직전 / 최소 매 phase 종료 시
7. **모바일 웹뷰 스모크 테스트** — 매 phase 종료 시 (월 EAS 30분 무료 티어 활용)

---

PLAN_READY: docs/PLAN.md
