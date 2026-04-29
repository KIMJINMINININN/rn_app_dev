# Phase 0a — DB 인프라 + Type Codegen + 보일러플레이트 정리

> ralph 실행 단위. 본 파일 + 참조: docs/plans/db-schema.md, docs/plans/conventions.md, docs/PRD.md
>
> **상태**: 미시작
> **선행 phase**: 없음 (첫 phase)
> **후속 phase**: Phase 0b
> **예상 기간**: 2-3일

---

## §0 사전 의존성 + 환경 변수

### 체크박스
- [ ] Supabase 프로젝트 PG 15+ 확인: 콘솔 SQL Editor에서 `select version();` — 결과를 `docs/CHANGELOG.md`에 한 줄 기록 (PG 14 이하면 partial unique index 패턴 사용 결정)
- [ ] Supabase 프로젝트 ref 확보 (대시보드 URL의 project ref)
- [ ] Supabase access token 발급 (CLI 인증용, `~/.supabase/access-token`) — `supabase login` 으로 인증
- [ ] supabase CLI 로컬 설치 (`pnpm add -D supabase` — apps/web 워크스페이스)
- [ ] `cd apps/web && supabase link --project-ref <id>` 로 원격 프로젝트 연결
- [ ] supabase/migrations/ 마지막 번호 확인 (현재 0개 — 0001부터 시작. 본 phase 시작 번호 미만이어야 함)
- [ ] **마이그레이션 번호 충돌 확인** (Architect 3.F): `apps/web/supabase/migrations/` 마지막 번호 확인

### 환경 변수 (이미 .env.local에 존재 — 추가 X)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_PROJECT_ID` (신규 추가) — types codegen용

### apps/web/.gitignore 추가 항목
```
supabase/.branches
supabase/.temp
supabase/.env
```

---

## §0.5 참조 자산 미리보기 (cross-phase dependencies)

> 본 phase는 첫 phase로 cross-phase 의존 자산이 거의 없음.

### 0.5.1 인용 테이블
없음 (본 phase가 0001/0002 신규 생성)

### 0.5.2 인용 RPC/함수
없음 (본 phase가 handle_new_user 신규 생성)

### 0.5.3 영향받는 cross-cutting 룰 (conventions.md)
- §1 Result<T, E> — `apps/web/src/shared/lib/result.ts` 본 phase에서 신규 작성
- §3 디자인 토큰 — `app/account/page.tsx`의 `dark:` 클래스 제거 (conventions §3: `dark:*` 미정의 토큰)
- §5 인증 가드 — `app/(app)/layout.tsx` 단일 진입점 본 phase에서 신규 작성
- §8 git 커밋 전략 — `.gitleaks.toml` 룰 파일 작성 + 수동 `pnpm dlx gitleaks detect` 1회 실행 (Phase 0b에서 lefthook 자동화 예정)
- §10 Server Action vs Route Handler — 본 phase는 두 패턴 모두 미사용 (인프라만)
- §14 SUPABASE_SECRET_KEY — `admin.ts` 본 phase에서 신설. Route Handler 내부에서만 사용

---

## §1 목표 / 출시 가능 가치

도메인 코드 작성을 시작할 수 있는 인프라 baseline. supabase/ 디렉토리 + 첫 2개 마이그레이션 + types codegen + Result 헬퍼 + (app) 라우트 그룹 + 메타데이터 한글화.

**가시적 변화**: 가입 → /account 정상 동작 (기존 동작 보존), 페이지 메타데이터 한글, types.ts 자동 생성됨.

---

## §1.5 Architect 결정 적용

- 권고 A.1 — pg_trgm Korean PoC: 본 phase는 pg_trgm extension 활성화만(0001), 검색 함수는 Phase 1에서 (`0008b_search_ingredient_masters.sql`).
- 권고 A.2 — handle_new_user 트리거: 0002에서 `security definer` + `set search_path = public, pg_temp` + `on conflict do nothing` + `drop trigger if exists` 헤더 패턴 적용. `auth.uid()` 대신 `NEW.id` 사용. db-schema.md §3.2 0002 본문 그대로 사용.
- 권고 A.4 — supabase/ 위치: `apps/web/supabase/`로 결정. `supabase init` 본 phase에서 1회 실행. db:* 스크립트 6개 `apps/web/package.json`에 추가.

---

## §2 DB 마이그레이션

> SSoT 우선순위 (Architect 1.A): `apps/web/supabase/migrations/0NNN_*.sql` (1차) → db-schema.md §3 / 본 §2.2 (2차 view)
> `supabase migration new` CLI 사용 금지 (timestamp prefix 자동 부여 → 4자리 형식과 충돌)

### 2.1 일람표 (본 phase 신규 2개)
| 번호 | 파일명 | 주요 객체 | 의존성 |
|---|---|---|---|
| 0001 | `0001_init.sql` | extensions (pg_trgm) | - |
| 0002 | `0002_user_profiles.sql` | table user_profiles + handle_new_user() trigger | 0001, auth.users |

### 2.2 SQL 본문

#### 0001_init.sql

<!-- SOURCE: apps/web/supabase/migrations/0001_init.sql -->
```sql
create extension if not exists pg_trgm;
```

#### 0002_user_profiles.sql

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

### 2.3 마이그레이션 적용 절차

1. **파일 생성**: `apps/web/supabase/migrations/0001_init.sql` / `0002_user_profiles.sql` 직접 생성
2. **로컬 검증**: `pnpm web db:reset` (모든 마이그레이션 재실행)
3. **타입 갱신**: `pnpm web db:types` — `apps/web/src/shared/api/supabase/types.ts` 재생성 + 커밋
4. **drift 확인**: `pnpm web db:check-drift` — 본 §2.2 SOURCE 마커 블록과 migrations/*.sql 일치 검증
5. **원격 적용**: `pnpm web db:push` (수동)
6. **변경 검증**: 아래 §6 테스트 smoke 절차 수행

### 2.4 데이터 백필
없음 (신규 테이블 — 기존 row 없음).

### 2.5 RLS 정책 요약
- `user_profiles`: SELECT own + UPDATE own. INSERT 정책 없음 (트리거 security definer만 INSERT).
- 패턴 상세: conventions.md §15 + db-schema.md §4.1

---

## §3 UI 작업 (FSD 레이어 + 정확한 파일 경로)

### 3.1 신규 파일
| 파일 | 역할 |
|---|---|
| `apps/web/src/shared/lib/result.ts` | `Result<T, E>` + `ok()` + `err()` 헬퍼 |
| `apps/web/src/shared/api/supabase/admin.ts` | `createSupabaseAdminClient()` — Route Handler 전용, `SUPABASE_SECRET_KEY` 사용 |
| `apps/web/src/app/(app)/layout.tsx` | 인증 가드 RSC layout — `getUser()` null이면 `redirect('/login')` |
| `apps/web/src/app/(app)/account/page.tsx` | 기존 `app/account/page.tsx`에서 이동 |
| `apps/web/src/app/(app)/account/logout-button.tsx` | 기존 파일 이동 |

### 3.2 정리 (기존 파일 수정)
| 파일 | 작업 |
|---|---|
| `apps/web/src/app/page.tsx` | create-next-app 보일러플레이트 정리 — `getUser()` → null이면 `/login`, 아니면 `/inventory` redirect |
| `apps/web/src/app/layout.tsx` | metadata 한글화 (title: "냉장고 매니저", description: ...) + dark mode 유틸 사용 흔적 제거 |
| `apps/web/src/app/account/page.tsx` | `(app)/account/`로 이동 후 원본 삭제 + `dark:` 클래스 모두 제거 |
| `apps/web/src/app/account/logout-button.tsx` | 동일 — `(app)/account/`로 이동 후 원본 삭제 |
| `apps/web/src/proxy.ts` (Next 16) | 세션 쿠키 갱신 only (`updateSession`) — redirect 로직 X (conventions §5) |

### 3.3 types.ts 적용
- `apps/web/src/shared/api/supabase/client.ts`: `createBrowserClient<Database>(...)`
- `apps/web/src/shared/api/supabase/server.ts`: `createServerClient<Database>(...)`
- `apps/web/src/shared/api/supabase/admin.ts`: `createClient<Database>(...)`

---

## §4 로직 작업

### 4.1 Server Actions / Route Handlers
없음 (인프라만).

### 4.2 Hooks / Stores
없음.

### 4.3 헬퍼 — result.ts

```ts
// apps/web/src/shared/lib/result.ts
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

### 4.4 인증 가드 패턴 (conventions §5)

```tsx
// apps/web/src/app/(app)/layout.tsx
const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
```

`createSupabaseServerClient()`는 내부에서 `next/headers`의 `cookies()`를 호출하므로 layout.tsx에서 추가 인자 전달 불필요.

### 4.5 (auth) Server Actions 통합 (선택)
기존 `app/(auth)/actions.ts`의 `AuthFormState` → `Result<void, string>`으로 마이그레이션 검토. 무리하지 말고 Phase 0b에 미뤄도 됨.

### 4.6 db:* 스크립트 추가 (`apps/web/package.json`)

```json
{
  "scripts": {
    "db:start": "supabase start",
    "db:push": "supabase db push --linked",
    "db:types": "supabase gen types typescript --linked > src/shared/api/supabase/types.ts",
    "db:reset": "supabase db reset",
    "db:diff": "supabase db diff -f",
    "db:check-drift": "node scripts/check-migration-drift.mjs"
  }
}
```

---

## §5 외부 API 연동
해당 없음 (Supabase만).

---

## §6 테스트 작업

### 6.1 단위
없음 (테스트 인프라는 Phase 0b).

### 6.2 통합
- `pnpm web db:reset` → 모든 마이그레이션 재실행 + handle_new_user 트리거 정상 동작 확인
- 가입 직후 콘솔 SQL Editor에서 `select * from user_profiles where user_id = '<new-user-id>'` → row 1개 자동 생성 확인

### 6.3 수동 smoke
- 기존 가입/로그인/로그아웃 플로우가 `(app)/account/` 이동 후에도 정상 동작
- 미인증 상태에서 `/account` 접근 시 `/login`으로 redirect 확인
- `app/page.tsx` 진입 시 로그인 여부에 따라 `/inventory` 또는 `/login` redirect 확인
- 페이지 메타데이터 한글 표시 확인
- `pnpm web db:types` 실행 후 `types.ts` 생성 + `Database` 타입 export 확인
- gitleaks 1회 실행: `pnpm dlx gitleaks detect` PASS (`.env*` 누출 없음)

---

## §7 Acceptance 기준

- [ ] `apps/web/supabase/` 디렉토리 + `config.toml` 생성됨 (`supabase init` 실행)
- [ ] `supabase link --project-ref <ref>` 성공
- [ ] 0001, 0002 마이그레이션 로컬 + 원격 적용 완료 (`pnpm web db:reset` + `pnpm web db:push`)
- [ ] `pnpm web db:types` 실행 → `apps/web/src/shared/api/supabase/types.ts` 생성됨 (커밋 포함)
- [ ] 3개 supabase 클라이언트(`client.ts`, `server.ts`, `admin.ts`)에 `<Database>` 제네릭 적용
- [ ] `Result<T, E>` + `ok/err` 헬퍼 작성 (`apps/web/src/shared/lib/result.ts`)
- [ ] 가입 시 `user_profiles` row 자동 생성 확인 (DB 직접 쿼리)
- [ ] `app/page.tsx` 보일러플레이트 정리 완료 (로그인 여부에 따라 redirect)
- [ ] `app/(app)/account/` 이동 + `dark:` 클래스 제거
- [ ] `app/(app)/layout.tsx` 인증 가드 동작 (미인증 → `/login`)
- [ ] `app/layout.tsx` metadata 한글 갱신
- [ ] `proxy.ts` 세션 쿠키 갱신 only (redirect 로직 없음)
- [ ] `admin.ts` 신설 (`createSupabaseAdminClient()`)
- [ ] gitleaks 1회 실행 PASS (`.env*` 누출 없음)
- [ ] `docs/CHANGELOG.md` Phase 0a 섹션 추가됨
- [ ] 기존 가입/로그인/로그아웃 회귀 없음
- [ ] `pnpm web typecheck` 0 errors
- [ ] `pnpm web lint` 0 errors

---

## §8 Definition of Done

- [ ] 모든 §7 Acceptance 기준 충족
- [ ] `pnpm web typecheck` 0 errors
- [ ] `pnpm web lint` 0 errors
- [ ] `pnpm web db:check-drift` 통과 (drift 0) — db-schema.md §3.2 0001/0002 SQL과 `apps/web/supabase/migrations/0001_init.sql` / `0002_user_profiles.sql` 일치
- [ ] PRD.md §3 로드맵 체크박스 Phase 0a 항목 업데이트
- [ ] `docs/CHANGELOG.md` 항목 추가 (`## v0.0.1 (Phase 0a) — DB infra + codegen 셋업`)
- [ ] `gitleaks detect` 통과
- [ ] git tag `v0.0.1` 부여 (선택이지만 권장 — 롤백 기준점)
- [ ] 모바일 웹뷰 스모크 테스트 — **본 phase (DB-only) 면제** (conventions §7 Minor 8)

### 8.5 롤백 절차

| 종류 | 절차 |
|---|---|
| 마이그레이션 (immutable) | 적용된 후엔 절대 수정 금지. 새 `0002b_fix_*.sql` 추가 |
| 코드 (UI/RSC/헬퍼) | `git revert <commit>` 또는 직전 tag로 리버트 |
| 데이터 | 본 phase는 신규 테이블만 — 백필 없음. drop table 시 모든 dependent 데이터 손실 (dev 단계이므로 허용) |
| Supabase link 실패 시 | `supabase unlink` → 재시도 |
| Vercel | 이전 preview/production deployment로 promote (대시보드) |

---

## §9 위험 / 완화

| 위험 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| handle_new_user 트리거 RLS 충돌 | 중 | 고 | security definer + set search_path 명시 + INSERT 정책 미생성 (db-schema §3.2 패턴 그대로) |
| auth.users 트리거 권한 부족 | 저 | 고 | Supabase는 `auth.users`에 트리거 허용 — postgres 슈퍼유저로 마이그레이션 적용 |
| PG 15 미만 (unique nulls not distinct 미지원) | 중 | 중 | §0 사전 의존성에서 사전 확인. 미만이면 Phase 1 이후 partial unique index 패턴으로 대체 |
| types codegen 인증 실패 | 저 | 중 | `~/.supabase/access-token` 확인. `supabase login` 재실행 |
| .env 누출 | 저 | 고 | gitleaks 수동 1회 실행 (`pnpm dlx gitleaks detect`) + `.gitleaks.toml` 룰 파일 작성 |

### 9.5 관측 / 로깅
본 phase 추가 없음 (인프라만). 기존 `console.error` + Vercel logs 유지 (conventions §12). 성능 목표: PRD.md §성능 참조.

---

## (선택) 일별 작업 분배

- Day 1: supabase init / link / 0001 / 0002 파일 생성 / handle_new_user 트리거 로컬 검증 / db:reset 통과 확인
- Day 2: types codegen (`pnpm web db:types`) + 3개 클라이언트 generic 적용 / admin.ts 신설 / Result 헬퍼 / page.tsx 정리
- Day 3: `(app)` 라우트 그룹 신설 + account 이동 + proxy.ts 정리 / gitleaks 실행 / 가입 회귀 검증 / CHANGELOG.md / typecheck + lint 통과

## (선택) 모바일 통합
해당 없음 — Phase 0a (DB-only)는 모바일 스모크 테스트 면제 (conventions §7 Minor 8).
