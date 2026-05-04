# 다음 세션 인계 TODO

> 작성: 2026-05-04 (Phase 3 ★ 데모 가능 MVP 완전 마감 후)
> 마지막 commit: `5fe57cf`
> 마지막 tag: `v0.3.0` (annotated)
> 브랜치: `feature/smart-refrigerator`

---

## 0. 현재 상태 한 줄 요약

**Phase 0a + 0b + 1 + 2 + 3 모두 완료. 32+ commits 반영. ★ 데모 가능 MVP 도달.**

가입 → 식재료 CRUD + 정렬/필터/이동/부분소진/만료 알림 + 사용자 정의 보관 장소 + **레시피 추천 (점수 + 섹션 분리) + 레시피 상세 (보유/부족 재료 + 조리법 + YouTube 임베드)**까지 동작.

PRD §2.3 핵심 가치 ("재료 보고 메뉴 정함") 충족.

---

## 1. 다음 세션 첫 줄 (claude에게)

```
docs/TODO.md 읽어줘.
```

또는 직접:
```
사용자 환경 액션 한꺼번에 처리하자.
```

또는:
```
Phase 4 진입하자.
```

---

## 2. ★ 사용자 환경 액션 — 한 번에 처리

> Phase 3는 코드 100% 완성. 실제 동작 검증 + Phase 4 준비를 위한 환경 셋업.
> **모두 사용자 본인 환경에서 1회 실행. ralph는 사용자 환경(Docker, gcp 콘솔, EAS)에 접근 불가**

### A. 사전 준비 (1회, 5분)

| # | 작업 | 비고 |
|---|---|---|
| 1 | Docker Desktop 실행 | supabase local 필요 |
| 2 | `apps/web/.env.local` 확인 — 기존 `SB_PUBLISHABLE_KEY` / `SB_SECRET_KEY` 살아있는지 | Phase 0a 셋업 시 등록됨 |
| 3 | (선택) YouTube Data API v3 키 발급 | Google Cloud Console → Credentials → API Key. 일일 quota 10000 unit. **미발급도 OK** (graceful empty) |
| 4 | (선택) 발급한 키를 `apps/web/.env.local`에 `YOUTUBE_API_KEY=AIza...`로 추가 | 클라이언트 노출 절대 금지 (`NEXT_PUBLIC_` prefix X) |

### B. DB 적용 + 타입 갱신 + 시드 검증 (chained, 약 2-3분)

```bash
cd /Users/jinmin/Documents/Project/the_others/rn_app_dev

# 1. supabase local 시작 + 0011/0012/0013 포함 전체 마이그레이션 적용
pnpm web db:start && pnpm web db:reset

# 2. DB 타입 자동 생성 → recipe_master/youtube_cache/recommend_recipes RPC 타입 등장
#    이후 page.tsx / route-handler.ts의 untyped cast 제거 가능 (선택적 후속 PR)
pnpm web db:types

# 3. 시드 검증 — 100 recipes + 707 ingredient mappings
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from recipe_master;"
# 기대: 100
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from recipe_ingredients;"
# 기대: 707
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d youtube_cache"
# 기대: query_key text PK / payload jsonb / fetched_at timestamptz
```

→ 실패 시: `pnpm web db:stop && pnpm web db:start` 후 재시도. Docker 컨테이너 충돌이면 `docker ps` → `docker rm -f` 후.

### C. 통합/E2E 테스트 실행 (chained, 약 3-5분)

```bash
cd /Users/jinmin/Documents/Project/the_others/rn_app_dev

# 1. 단위 + (활성화된) 통합 테스트
export SUPABASE_LOCAL_URL=http://127.0.0.1:54321
pnpm web test
# 기대: equivalence.spec RPC 통합 블록 활성 (현재 placeholder만, 실제 fixture 비교 구현은 별도 작업으로 다음 phase)

# 2. E2E (Playwright + supabase 로컬 + 인증 환경)
pnpm web test:e2e
# 기대: auth + inventory-happy-path + inventory-advanced + recipes-happy-path 모두 PASS
# recipes-happy-path 3 케이스: happy / empty / unauth redirect
```

→ E2E 실패 시: `pnpm web dev` (port 3100)로 직접 띄워보고 `/recipes` 진입 확인 후 재시도.

### D. (선택, YOUTUBE_API_KEY 발급한 경우만) YouTube Route Handler 검증

```bash
# dev server 띄운 상태에서 별도 터미널
curl 'http://localhost:3100/api/youtube/search?q=김치찌개' | jq .
# 1차: cache miss → DB write → { ok: true, data: [...5건] }
# 2차: cache hit → 동일 응답 + Vercel logs/콘솔에 [youtube_cache] HIT 표시

# DB에서 캐시 확인
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select query_key, fetched_at from youtube_cache;"
```

quota 초과 모킹: `YOUTUBE_API_KEY`를 일부러 잘못된 값으로 바꾼 후 호출 → `{ ok: true, data: [], warning: 'quotaExceeded' }` 또는 빈 배열 graceful 확인.

### E. (선택) 모바일 웹뷰 스모크 (Vercel preview + EAS, 30-60분)

```bash
# 1. Vercel preview deploy (YOUTUBE_API_KEY env 포함)
cd /Users/jinmin/Documents/Project/the_others/rn_app_dev
git push origin feature/smart-refrigerator   # ← Vercel preview 자동 트리거

# 2. preview URL 확인 후 mobile env 갱신
# apps/mobile/.env.preview의 WEB_BASE_URL을 preview URL로 갱신

# 3. EAS preview build → APK
cd apps/mobile
eas build --profile preview --platform android
# 빌드 완료 후 APK 다운로드 → Android 기기 sideload
```

스모크 체크리스트:
- [ ] /(app)/recipes 추천 리스트 렌더
- [ ] 첫 카드 클릭 → 상세 진입
- [ ] 보유/필수 부족/선택 부족 3섹션 표시
- [ ] YouTube 임베드 (`youtube-nocookie.com` iframe) 모바일 웹뷰 정상
- [ ] quota 초과/키 미설정 graceful (페이지 깨짐 X)
- [ ] BottomNav "레시피" 탭 활성

### F. (선택) Push + 정리

```bash
# 1. 8 commits + tag v0.3.0 push
git push origin feature/smart-refrigerator
git push origin v0.3.0

# 2. (선택) main으로 PR 또는 merge — 프로젝트 워크플로우 따라

# 3. CHANGELOG line 51 회귀 수치 정정 (architect 권고 M3, 비블로킹)
#    "21 PASS" → "45 PASS / 1 skip" — 다음 commit에서 함께
```

---

## 3. Phase 4 진입 (★ 다음 세션 권장)

**Phase 4 = 히스토리 (예상 5-7 Day, phase-4.md 참조 — 미작성이라면 phase 시작 전 작성 필요)**

전형적 작업:
- DB: 0014 `consumption_history` 테이블 + 0009 트리거 확장 (consume 시 history INSERT)
- entities/history 슬라이스
- features/list-history + view-history-stats
- pages /(app)/history/page.tsx + BottomNav "히스토리" 탭 활성화 (현재 disabled)
- 통계 차트 (recharts 도입 여부 결정 필요 — 의존성)

**시작 명령**:
```
Phase 4 진입하자. ralph 자율 모드.
```

→ ralph는 phase-4.md 우선 탐색. 미작성 시 spec 작성 단계 먼저 (planner 호출 또는 사용자에게 spec 우선 요청).

---

## 4. 처리 안 한 / 보류 항목 (Phase 1+2+3 누적)

| # | 작업 | 우선도 | 예상 시간 |
|---|---|---|---|
| 1 | RLS 정책 추가 — `storage_locations` INSERT (Phase 2 Day 6 admin 우회 정리) | 낮음 | 30분 |
| 2 | DB 타입 갱신 후 untyped cast 제거 PR (Day 6/7 features+pages) | 낮음 | 30분 |
| 3 | equivalence.spec RPC 통합 블록 실제 fixture 비교 구현 (현재 placeholder) | 중간 | 1시간 |
| 4 | E2E 헬퍼 추출 (recipes-happy-path 인라인 헬퍼 → e2e/_helpers.ts) | 낮음 | 30분 |
| 5 | Phase 0a residual debt — `apps/web/src/app/(app)/account/{page,logout-button}.tsx`의 `zinc-*` / `rounded-md` (디자인 토큰 미준수) | 낮음 | 30분 |
| 6 | BottomNav 아이콘 추출 → `shared/ui/icons/` (UI polish) | 낮음 | 30분 |
| 7 | CHANGELOG line 51 회귀 수치 정정 ("21 PASS" → "45 PASS / 1 skip") | 매우 낮음 | 1분 |

**가장 신경 쓸만한 것**: #3 equivalence RPC 통합 (지금 정적 동치성만 검증, 실제 RPC 결과 비교는 미구현). Phase 4 entry 전 또는 entry 직후 처리 권장.

---

## 5. 명령 / 패턴 메모

### Phase 4 ralph 호출 패턴 (Phase 1/2/3과 동일)
- 각 Day 끝에 architect verification + 필요 시 사용자 review
- 자동 진행 모드: "Day마다 commit + 다음 Day"
- lefthook hook 자동 (gitleaks + typecheck staged glob)
- spec sync: phase-4.md §2.2 SOURCE 마커 ↔ migrations/*.sql byte 일치 (drift checker, SOURCE-EXEMPT는 auto-gen seed에 사용)

### 검증 5종 (각 Day 끝, Phase 1/2/3 동일)
```bash
pnpm web typecheck
pnpm web lint
pnpm web db:check-drift
pnpm web test
pnpm web test:e2e   # 사용자 환경 의존 — 보통 deferred
```

### 환경 메모
- Supabase project: linked (Phase 0a Day 1)
- 0011/0012/0013: Day 4 작성 완료, 사용자 db:reset/push로 적용 필요
- gitleaks: 시스템 설치 완료, lefthook pre-commit 활성
- e2e port: **3100**
- supabase local URL (default): http://127.0.0.1:54321
- supabase local DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### Phase 3 Spec deviations (architect 인지 완료, 인계 사항)
- **0011 SQL urgent fix** (Day 4): `<= 2` → `between 0 and 2` (already-expired 제외, 0010 패턴 + TS 정합)
- **0012 SOURCE-EXEMPT** 마커: auto-generated 75KB seed (마이그레이션 자체가 SSoT, drift checker 제외)
- **DB types 미재생성**: untyped cast로 우회 (사용자 db:types 후 cast 제거 가능)
- **YouTube 서버사이드 cache lookup만**: 실제 fetch는 Route Handler client-side로만. quota 보호.

---

## 6. 최근 commits (참조 — Phase 3 8개)

```
5fe57cf feat(phase-3): Day 9-10 (FINAL) — CHANGELOG v0.3.0 + 회귀 검증 5종 PASS ★ Phase 3 종료
aebf509 feat(phase-3): Day 8 — E2E recipes-happy-path.spec.ts (3 케이스, 사용자 환경 deferred)
2259367 feat(phase-3): Day 7 — pages /(app)/recipes + [id] + widgets + BottomNav 활성화 ★ 데모 MVP
bc5b980 feat(phase-3): Day 6 — features/list-recommendations + youtube-embed Route Handler + view-recipe-match
474b9d4 feat(phase-3): Day 5 — entities/recipe/ui 4개 컴포넌트
8f3d0aa feat(phase-3): Day 4 — 0013_youtube_cache + 0011 urgent fix + TS↔SQL 동치성 테스트
60bc036 feat(phase-3): Day 3 — 0011 recommend_recipes RPC + scoring SSoT + TS mirror + 단위 테스트
77effda feat(phase-3): Day 1-2 — 레시피 100선 큐레이션 + 0012_recipes_seed
```

전체 (Phase 0+1+2+3): `git log --oneline | head -35`
태그 목록: `git tag --list 'v0.*'`

---

## 7. 산출물 요약 (지금까지)

### DB 마이그레이션 13개 (apps/web/supabase/migrations/)
- 0001~0010 (Phase 0+1+2 — 인벤토리 핵심)
- **0011** recipe_master + recipe_ingredients + recipe_difficulty enum + recommend_recipes RPC + RLS
- **0012** 시드 100선 / 707 재료 매핑 (auto-generated, recipes_to_sql.mjs)
- **0013** youtube_cache + RLS read-only

### 기능 (사용자 관점, Phase 0~3 누적)
- 가입/로그인/로그아웃
- 식재료 검색 (typeahead, 한국어 trigram)
- 인벤토리 CRUD + 부분 소진 (25/50/75/100%) + 자동 consumed 트리거
- 정렬 (임박순/최근/이름)
- 필터 (카테고리 multi + 보관 장소)
- 보관 장소 간 이동
- 사용자 정의 보관 장소 추가/이름변경/삭제
- D-Day 표시 (KST + 동치성 검증)
- 인벤토리 헤더 카운트 배지 (전체/임박/만료)
- **★ 레시피 추천** (점수 ≥ 0.5, "지금 만들 수 있음" / "재료 1-2개 부족" 섹션 분리)
- **★ 레시피 상세** (보유/필수 부족/선택 부족 3섹션 + instructions_md + YouTube 임베드)
- **★ BottomNav 레시피 탭 활성**

### 테스트
- vitest 45 PASS / 1 skip (전체 8 file)
- E2E 4 spec (auth + inventory-happy-path + inventory-advanced + recipes-happy-path) — 사용자 환경 deferred 실행
- equivalence.spec 정적 동치성 (RPC 통합은 SUPABASE_LOCAL_URL conditional)
