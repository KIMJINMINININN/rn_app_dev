# Conventions — Cross-cutting Rules

> 본 문서는 모든 phase에 적용되는 횡단 결정 풀 본문.
> Phase 파일은 `§0.5 영향받는 cross-cutting 룰` 섹션에서 본 문서의 해당 §을 인용.
> 변경 시 SSoT는 본 문서. phase 파일은 derivative.

---

## §1. Result<T, string> 에러 처리

모든 Server Action 반환 타입 + Route Handler JSON body 통일 패턴.

```ts
// apps/web/src/shared/lib/result.ts
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

**적용 범위**: 모든 Server Action 반환 타입 + Route Handler JSON body.

- Server Action: `Result<T, string>` (한국어 에러 메시지)
- Route Handler: `{ ok: boolean, data?, error? }` JSON, HTTP 상태는 200 위주 (외부 의존성 실패는 200 + ok:false)
- 클라이언트 측 에러 boundary: `app/(app)/error.tsx` 1개 + 화면별 inline 에러 UI
- RPC 에러는 한국어 메시지 변환 (예: `'unauthorized: ...'` → `'세션이 만료되었습니다'`)

인증 폼의 `AuthFormState`(이미 Phase 0a에서 시범 적용 중)는 Phase 0b에서 일반 `Result`로 통합 검토.

---

## §2. 로딩 UI

- RSC: `app/(app)/<route>/loading.tsx` — `<Skeleton>` (Phase 0b primitive)
- Client mutation: 버튼 inline spinner + `<Toast>` (Phase 0b primitive — 추가/수정/삭제 시 즉시 사용)

---

## §3. 디자인 토큰 강제

### 3.1 사용 가능한 토큰

- **색상**: `gray`, `primary`(블루), `green`, `red`, `yellow`, `teal`, `purple`, `white`, `black`, `black-30`
- **Spacing**: `--spacing: 1px` 즉 1unit = 1px (`h-48` = 48px, `px-32` = 32px)
- **Radius**: `rounded-{xxs|xs|s|m|l|xl|xxl}` (6/8/10/12/16/20/24px)
- **Typography**: `text-display-l`, `text-heading-{xxl..xxs}`, `text-body-{xl..xxs}-{500|400}`, `text-button-{l|m|s|xs|xxs}`

### 3.2 절대 사용 금지

- `zinc-*`, `emerald-*`, `slate-*`, `blue-*` (Tailwind 기본, theme reset됨)
- 4px 가정 spacing (`p-4`, `h-12` 등 — 1px 단위로 환산)
- `rounded-2xl`, `rounded-lg`, `rounded-md` 등 (radius reset됨)
- `dark:*` (다크 토큰 미정의 — 라이트만)
- 임의 값 `text-[14px]` 같은 Tailwind arbitrary values — PR 검토에서 reject

> `apps/web/src/app/account/page.tsx` 의 `dark:` 유틸은 정의되지 않은 토큰 → Phase 0a에서 제거됨.

---

## §4. 다국어

한국어 only (out of scope). 모든 문자열 하드코딩 OK. 필요 시 후속 phase에서 i18n 도입.

---

## §5. 인증 가드 — 단일 책임

(PLAN.md §5.5 — Critical Issue 10 해소)

| 레이어 | 책임 | redirect? |
|---|---|---|
| `apps/web/src/proxy.ts` (Next 16) | 세션 쿠키 갱신 only (`updateSession`) | **NO** |
| `app/(app)/layout.tsx` (RSC) | `supabase.auth.getUser()` → null이면 `redirect('/login')` | **YES — 단일 진입점** |
| 개별 페이지 (RSC) | 추가 가드 X | NO |

- 기존 `apps/web/src/app/account/page.tsx` 를 `apps/web/src/app/(app)/account/page.tsx` 로 이동 (Phase 0a).
- 미인증 라우트 (`(auth)/login`)는 `(app)` 그룹 밖 → 가드 적용 X.

`createSupabaseServerClient()` 패턴 (`next/headers cookies()` 내부 호출이라 layout/page에서 인자 전달 불필요):

```tsx
const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
```

---

## §6. Realtime

Phase 1–6 모두 polling/invalidate 충분. **Realtime 도입 X** (할당량·복잡도 회피). 협업 기능 도입 시 재평가.

---

## §7. 모바일 검증 절차 + EAS 빌드/배포 흐름

매 phase 끝에 모바일 웹뷰 빌드 1회 + 스모크 테스트 체크리스트 (로그인 / 인벤토리 / 신규 phase 기능 / 새 탭 deeplink). **Phase 0a (DB-only)는 면제** (Minor 8).

### 빌드 흐름

1. Vercel preview deploy 완료 → preview URL 확보 (예: `https://rn-app-dev-git-feature-smart-refrigerator-xxx.vercel.app`)
2. `apps/mobile` 의 `WEB_BASE_URL` env 갱신 (`apps/mobile/.env.preview` 수동 1줄)
3. EAS preview build: `eas build --profile preview --platform android` (Expo 무료 티어 월 30분 한도)
4. APK 다운 → 안드로이드 폰 sideload → 스모크 테스트 (가입 → 식재료 추가 → 로그아웃)

**EAS 빌드 비용/시간**: Free tier 월 30 build minutes, 일반 RN 빌드 5–10분. 월 3–6회 가능 — 사이드 프로젝트에 충분.

모바일 전용 코드 변경은 phase가 외부 하드웨어를 요구할 때(Phase 6)만.

---

## §8. git 커밋 전략

- 마이그레이션은 phase 시작 시 1커밋 (`feat(db): phase N migrations`)
- 도메인 코드는 슬라이스 단위 (예: `feat(inventory): add ingredient form`) atomic 커밋
- **gitleaks 필수** (Minor Issue 2 격상): `.gitleaks.toml` 룰 + git pre-commit hook (lefthook 확정 — Phase 0b). `.env*` 절대 커밋 금지. Phase 0a에서는 룰 파일 + 수동 `pnpm dlx gitleaks detect` 1회 실행. Phase 0b에서 `lefthook` + `gitleaks protect --staged` 자동 실행으로 격상.

---

## §9. 테스트 인프라

풀 본문은 `docs/plans/phase-0b.md` (Phase 0b 핵심 deliverable). 요약:

- Vitest 1개 config (`apps/web/vitest.config.ts`) — jsdom env + setup
- Playwright 1개 config (`apps/web/playwright.config.ts`) — chromium 1개 프로젝트
- Supabase local CLI (`db:start`) — RLS 통합 테스트용 Postgres 컨테이너
- CI는 phase 6까지 도입 보류 (1인 작업자 부담). 로컬 hook으로 typecheck + lint + 단위 테스트만 실행
- 의존성: `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `@playwright/test`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`

---

## §10. Server Action vs Route Handler 결정 룰

| 패턴 | 선택 | 예시 |
|---|---|---|
| 폼 제출 / 도메인 mutation | **Server Action** | `addIngredient`, `logCooking`, `createShoppingList`, `consumeRecipe` |
| 외부 API proxy (key 보호) | **Route Handler** | `/api/youtube/search`, `/api/barcode/[code]`, `/api/ocr/receipt` |
| RSC 데이터 fetch (RPC) | **RSC 직접 호출** | `recommend_recipes`, `recommend_for_ingredient` |
| 캐시 write (RLS bypass) | **Route Handler + admin client** | `youtube_cache` write, `barcode_cache` write |
| 사용자 데이터 read (RLS context) | **RSC 또는 client TanStack Query** | `user_ingredients` fetch |

**Cookies/Auth 가드**:
- Server Action: `createSupabaseServerClient()` 직접 사용 가능 (`next/headers cookies()` 자동 통합)
- Route Handler: 동일 패턴 사용. `getUser()` 호출로 인증 검증 + RLS는 cookies 통한 user context로 자동 적용

`SUPABASE_SECRET_KEY` (`createSupabaseAdminClient()`)는 **Route Handler 내부에서만 호출**. RSC/Server Action 절대 X (§8 참조).

---

## §11. 1인 작업자 운영 원칙

(PLAN.md §부록 C)

1. **phase 끝마다 release tag** (`v0.0.1` Phase 0a, `v0.0.2` Phase 0b, `v0.1.0` Phase 1, `v0.2.0` Phase 2 ...) — 롤백 용이
2. **PR 단위는 슬라이스 또는 마이그레이션** (5개 이내 파일) — 셀프 리뷰 부담 경감
3. **하루 작업 시작 전 `pnpm web typecheck` + `pnpm web lint` 1회 실행** — drift 조기 감지
4. **모든 phase 종료 시** PRD §3 로드맵 체크박스 업데이트 + `docs/CHANGELOG.md` 추가 (phase, 결정 사항, PoC 결과 등)
5. **Architect 자문은 본 plan에 박힌 5개로 충분** — 추가 자문은 새로운 미지수 발생 시에만 호출 (over-planning 방지)
6. **gitleaks 1회 실행** (`pnpm dlx gitleaks detect`) — 매 PR 직전 / 최소 매 phase 종료 시
7. **모바일 웹뷰 스모크 테스트** — 매 phase 종료 시 (월 EAS 30분 무료 티어 활용)

---

## §12. 관측 / 로깅

### MVP (Phase 1~6)

- 클라이언트/서버 에러: `console.error` + Vercel Function logs (자동)
- Server Action / Route Handler 에러: 한국어 사용자 메시지 반환 + 영문 stack trace를 `console.error`로 (Vercel logs에 기록)
- 외부 API 호출 실패율 (YouTube 429, 바코드 4xx 등): 해당 phase Route Handler에서 `console.error` + ok:false 응답

### Out of Scope (Phase 7+ 검토)

- Sentry / DataDog / 외부 APM
- 사용자 행동 추적 (Mixpanel, Amplitude)
- 메트릭 대시보드

---

## §13. 성능 목표

PRD.md에 성능 목표 섹션 미정의. 본 로드맵에서는 다음만 가드:

- 초기 페이지 로드 (가입/로그인): TTI < 2초 (Vercel + Supabase 모두 가까운 region)
- 인벤토리 리스트: 첫 페인트 < 500ms (RSC + RLS 인덱스)
- typeahead 검색: 디바운스 250ms + 응답 < 200ms (db-schema §0008b 참조)
- 재료 클릭 듀얼 추천 sheet: 0.5초 내 표시 (Phase 4 수락 기준)
- 바코드 캐시 hit: 상품명 표시 < 0.5초 (Phase 6 수락 기준)

성능 회귀 측정은 Phase 6 이후 검토 (현재는 Lighthouse 수동 1회/phase).

---

## §14. SUPABASE_SECRET_KEY 사용 경로

(PLAN.md §5.10 / §2.3)

`createSupabaseAdminClient()` (RLS bypass + service_role)는 **Route Handler 내부에서만** 호출.

- ✅ Route Handler (`/api/youtube/search`, `/api/ocr/receipt`, `/api/barcode/[code]` 등) — 외부 API proxy, RLS bypass 필요한 admin 작업 (`youtube_cache` write, `barcode_cache` write)
- ❌ RSC 페이지 — RLS 정책으로 데이터 격리되어야 함, admin client 사용 시 RLS 무력화
- ❌ Server Action — 사용자 컨텍스트 mutation은 cookies 기반 server client 사용
- ❌ 클라이언트 컴포넌트 — `'server-only'` 가드로 빌드 단계에서 차단

`admin.ts` 위치: `apps/web/src/shared/api/supabase/admin.ts` (Phase 0a 신설).

---

## §15. RLS 정책 패턴 reference

세부 SQL은 `db-schema.md §4`. 본 §은 결정 매핑만:

| 테이블 | 패턴 | db-schema.md 참조 |
|---|---|---|
| `user_profiles`, `storage_locations`, `user_ingredients`, `cooking_history`, `shopping_list`, `receipt_uploads`, `ingredient_categories`(개인) | **사용자별 격리** (`auth.uid() = user_id`) | §4.1 |
| `ingredient_master`, `ingredient_categories`(글로벌) | **글로벌 + 사용자 추가** (`user_id IS NULL OR auth.uid() = user_id`) | §4.2 |
| `recipe_master`, `recipe_ingredients`, `barcode_cache`, `youtube_cache` | **read-only seed** (`for select using (true)`) — admin client만 write | §4.3 |

**INSERT 정책 부재 케이스**: `user_profiles` / `storage_locations`는 `handle_new_user()` security definer 함수만 INSERT — RLS bypass. INSERT 정책 만들지 말 것 (Architect Answer 2 — 보안 약화).

---

## §16. gitleaks Lefthook 셋업

(PLAN.md §5.8 — Minor Issue 2 격상 후 Phase 0b deliverable)

```bash
pnpm add -D -w lefthook gitleaks
pnpm dlx lefthook install
```

`lefthook.yml` (워크스페이스 루트):

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

`.gitleaks.toml` 룰: Phase 0a에서 워크스페이스 루트에 기본 룰 파일 작성. Phase 0b에서 `lefthook install`로 자동 실행 격상.

Phase 0a에서는 수동 `pnpm dlx gitleaks detect` 1회 실행으로 검증. Phase 0b부터 `gitleaks protect --staged` 자동 실행.

---

## §17. TanStack Query queryKey + invalidation

### 17.1 queryKey 네이밍

Tuple-based, 가장 일반적 → 가장 구체적 순서:

```ts
['ingredients']                                  // 모든 ingredient 쿼리 prefix
['ingredients', 'list', { storageId, sort }]    // 인벤토리 리스트
['ingredients', 'detail', ingredientId]         // 특정 재료 상세
['ingredients', 'search', query]                // typeahead 검색
['recipes']
['recipes', 'recommendations', userId]          // RPC recommend_recipes 결과
['recipes', 'detail', recipeId]
['cooking-history']
['shopping-list']
['inventory-summary']                           // RPC get_inventory_summary
```

### 17.2 invalidation 전략

- **Mutation 후 invalidate**: 가장 일반적 prefix를 invalidate (`['ingredients']` invalidate → list/detail/search 모두 stale)
- **Optimistic update 우선**: list 추가 시 cache에 직접 unshift, mutation 실패 시 롤백
- **`staleTime`**: 일반 데이터 30초, RPC 추천 5분, master 캐시 1시간

---

## §18. Zustand vs Query 경계

| 종류 | 도구 | 예시 |
|---|---|---|
| **서버 상태** (DB 데이터, RPC 결과, 세션 자체 정보) | TanStack Query | `ingredients`, `recipes`, `user profile` |
| **클라이언트 UI 상태** (모달 open/close, 필터, 정렬, 토스트 큐) | Zustand | `useUiStore`, `useToastStore` |
| **폼 임시 상태** | React state (`useState`) | input value, validation state |
| **route 파라미터** | URL search params | filter, sort, page |

**원칙**: Zustand는 cross-component UI 상태만. 도메인 데이터는 절대 Zustand에 두지 말 것.

---

## §19. 단일 출처 상수 (TS↔SQL 동치성)

(PARTITION_PLAN Minor 5 — Architect 권고로 phase 간 drift 방지)

> TS 상수와 SQL 함수 분기값은 본 §이 SSoT. TS 파일은 본 표를 구현. SQL 마이그레이션은 SOURCE 마커로 본 표 참조.

| 상수 | 값 | TS 위치 | SQL 위치 | 참조하는 phase |
|---|---|---|---|---|
| `WEIGHT_REQUIRED` | `0.7` | `apps/web/src/entities/recipe/lib/scoring-constants.ts` | `0011_recipes.sql` (`recommend_recipes` 본문 inline — `0.7 * (필수보유/필수전체)`) | Phase 3 (`recommend_recipes`), Phase 4 (`recommend_for_ingredient`), TS mirror `computeRecipeMatch.ts` |
| `WEIGHT_OPTIONAL` | `0.2` | 동일 | 동일 | 동일 |
| `WEIGHT_URGENT` | `0.1` | 동일 | 동일 | 동일 |
| `MIN_SCORE` | `0.5` | 동일 | `0011_recipes.sql` (`p_min_score` 기본값 및 `0015a` new_candidates 필터) | Phase 3, Phase 4 (`recommend_for_ingredient` new_candidates 필터 `0.5`) |
| `URGENT_THRESHOLD_DAYS` | `2` | `apps/web/src/entities/ingredient/lib/dday-thresholds.ts` | `0010_dashboard_stats_function.sql` (`get_inventory_summary` — `between 0 and 2` inline 주석) | Phase 1 (`computeDDay.ts`), Phase 2 (`get_inventory_summary`), Phase 3 (urgent bonus) |

**SSoT 관리**:

- 값 변경 시 **TS 파일 변경** + SQL 파일 inline 주석 cross-ref 갱신
- SQL은 마이그레이션 immutable (적용 후 수정 X) → 값 변경 시 새 마이그레이션 추가 (예: `0010b_inventory_summary_v2.sql`)
- TS↔SQL 동치성 검증: `apps/web/src/entities/recipe/lib/computeRecipeMatch.spec.ts` (Phase 3) — TS 결과 vs Supabase RPC 결과 fixture 5–7개 비교

---

## §부록. Architect 결정 사항 (5개 — PLAN.md §6)

이 섹션은 plan에 직접 박혀 있으므로 ralph는 추가 자문 없이 진행 가능. phase 파일은 본 부록을 §1.5 "Architect 결정 적용"에서 결론 한 줄씩 인용 (Critic Issue 6).

### A.1 pg_trgm 한국어 검색 (Architect Answer 1)

- **메인**: `search_ingredient_masters(p_query, p_user_id, p_limit)` — ILIKE prefix(rank 1.0) + ILIKE substring(0.7) + similarity(trigram) hybrid (Phase 1 §0008b)
- **인덱스**: `gin (name gin_trgm_ops)` — 0005에서 생성
- **클라이언트 디바운스**: 250ms
- **Plan B**: `Fuse.js` 클라이언트 fuzzy + `hangul-js` 초성검색 (Phase 2 옵션, PoC 실패 시 발동)
- **PoC**: Phase 1 첫 30분 (시드 150개 + "양"/"양파"/"양ㅍ" 응답 측정 ≤ 50ms 목표)

### A.2 handle_new_user() 트리거 (Architect Answer 2)

- `security definer` + `set search_path = public, pg_temp` + idempotent `drop trigger if exists` 헤더
- `auth.uid()` 대신 **`NEW.id`** 사용 (트리거 컨텍스트 supabase_auth_admin)
- `user_profiles` / `storage_locations` INSERT 정책 절대 만들지 마라 — definer 함수만 INSERT
- 0002 초기 함수 생성 (profile INSERT만) + 0008 `CREATE OR REPLACE` 패턴으로 확장 (storage_locations INSERT 추가)

### A.3 recommend_recipes() 매칭 공식 (Architect Answer 3)

- **공식**: `0.7 * (필수보유/필수전체) + 0.2 * (선택보유/max(선택전체,1)) + 0.1 * (임박보유/필수전체)`
- **임계값**: ≥0.95 = "지금 만들 수 있음", 0.5~0.95 = "재료 1–2개 부족", <0.5 = 추천 제외
- 호출 패턴: RSC 직접 RPC. 50ms 측정 후 100ms+ 시 `unstable_cache` 도입
- TS/SQL 동치성 테스트 (Phase 3) — fixture 5–7개 비교 (§19 참조)

### A.4 supabase/ 위치 (Architect Answer 4)

- 위치: `apps/web/supabase/`
- db:* 스크립트 6종 (db-schema.md §2)
- Vercel 자동 마이그레이션 X — 수동 `pnpm web db:push --linked` + types 재생성 + 빌드 검증
- types.ts 커밋 O, turbo.json db task 추가 X

### A.5 OCR 결정 (Architect Answer 5)

- 1순위: ML Kit (모바일 on-device, $0)
- 2순위 fallback: Naver Clova OCR (~$4.5/월 @ 1500 호출)
- webview-protocol 메시지 4개 확장 (Phase 6 §본문)
- 비용 게이트 $5/월: `DAU × 인당영수증 × 30 ≥ 2000` 시 `OCR_FALLBACK_ENABLED=false`
- PoC: Phase 6 진입 전 1일 (영수증 5장씩 측정)

---
