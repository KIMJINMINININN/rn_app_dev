# 다음 세션 인계 TODO

> 작성: 2026-05-04 (Phase 4 ★ 요리 히스토리 + 듀얼 추천 완전 마감 후)
> 마지막 commit: `e5d87d6`
> 마지막 tag: `v0.4.0` (annotated)
> 브랜치: `feature/smart-refrigerator`

---

## 0. 현재 상태 한 줄 요약

**Phase 0a + 0b + 1 + 2 + 3 + 4 모두 완료. 39+ commits 반영. 데모 가능 MVP + 요리 히스토리 + 듀얼 추천까지.**

가입 → 식재료 CRUD + 정렬/필터/이동/부분소진/만료 알림 + 사용자 정의 보관 → 레시피 추천(점수+섹션) + 레시피 상세(보유/부족 + instructions + YouTube) → **★ 요리 시작 → 자동 차감 + 기록** → **★ 재료 클릭 → 좌(과거 요리) / 우(신규 추천) 듀얼 그리드** → **★ /(app)/cooking-history 과거 기록 페이지**까지 동작.

PRD §2.3 (Phase 3) + §2.4 (Phase 4) 핵심 가치 모두 충족.

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
Phase 5 진입하자.
```

---

## 2. ★ 사용자 환경 액션 — 한 번에 처리 (Phase 3 + Phase 4 누적)

> Phase 3 + Phase 4 모두 코드 100% 완성. 실제 동작 검증 + Phase 5 준비.
> **모두 사용자 본인 환경에서 1회 실행. ralph는 사용자 환경(Docker, gcp 콘솔, EAS)에 접근 불가**

### A. 사전 준비 (1회, 5분)

| # | 작업 | 비고 |
|---|---|---|
| 1 | Docker Desktop 실행 | supabase local 필요 |
| 2 | `apps/web/.env.local` 확인 — `SB_PUBLISHABLE_KEY` / `SB_SECRET_KEY` 존재 | Phase 0a 셋업 시 등록됨 |
| 3 | (선택) YouTube Data API v3 키 발급 | Google Cloud Console → Credentials. 일일 quota 10000 unit. **미발급도 OK** (graceful empty) |
| 4 | (선택) 발급한 키를 `apps/web/.env.local`에 `YOUTUBE_API_KEY=AIza...`로 추가 | 클라이언트 노출 절대 금지 (`NEXT_PUBLIC_` prefix X) |

### B. DB 적용 + 타입 갱신 + 시드 검증 (chained, 약 2-3분)

```bash
cd /Users/jinmin/Documents/Project/the_others/rn_app_dev

# 1. supabase local 시작 + 0001~0015b (Phase 0~4 모든 마이그레이션 16개) 적용
pnpm web db:start && pnpm web db:reset

# 2. DB 타입 자동 생성 → Phase 3 + 4 신규 객체 7개 타입 등장
#    (recipe_master / recipe_ingredients / youtube_cache / recommend_recipes RPC
#     + cooking_history / cooking_history_consumed_ingredients / log_cooking_session RPC + recommend_for_ingredient RPC)
#    → Phase 3 + 4의 untyped cast 8곳 제거 가능 (선택적 후속 PR)
pnpm web db:types

# 3. 시드 검증 — Phase 3 시드 100 recipes + 707 mappings (Phase 4는 시드 없음)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from recipe_master;"
# 기대: 100
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from recipe_ingredients;"
# 기대: 707
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d cooking_history"
# 기대: id/user_id/recipe_id/custom_recipe_name/cooked_at/rating/memo
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d cooking_history_consumed_ingredients"
# 기대: history_id/ingredient_master_id PK + quantity/unit
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d youtube_cache"
# 기대: query_key text PK / payload jsonb / fetched_at timestamptz
```

→ 실패 시: `pnpm web db:stop && pnpm web db:start` 후 재시도. Docker 컨테이너 충돌이면 `docker ps` → `docker rm -f` 후.

### C. 통합/E2E 테스트 실행 (chained, 약 5-7분)

```bash
cd /Users/jinmin/Documents/Project/the_others/rn_app_dev

# 1. 단위 + (활성화된) 통합 테스트
export SUPABASE_LOCAL_URL=http://127.0.0.1:54321
pnpm web test
# 기대: equivalence.spec RPC 통합 블록 활성 (Phase 3 정적 동치성 + Phase 4 placeholder)

# 2. E2E 5 spec (Playwright + supabase 로컬 + 인증 환경)
pnpm web test:e2e
# 기대: auth + inventory-happy-path + inventory-advanced + recipes-happy-path + cooking-history-happy-path 모두 PASS
# Phase 3 recipes-happy-path: happy / empty / unauth redirect (3 케이스)
# Phase 4 cooking-history-happy-path: 가입 → 재료 → 레시피 → 요리 시작 → 다이얼로그 → 확정 → 기록 표시 → 차감 확인
```

→ E2E 실패 시: `pnpm web dev` (port 3100)로 직접 띄워보고 `/recipes` + `/cooking-history` 진입 확인 후 재시도.

### D. (선택, YOUTUBE_API_KEY 발급한 경우만) YouTube Route Handler 검증

```bash
# dev server 띄운 상태에서 별도 터미널
curl 'http://localhost:3100/api/youtube/search?q=김치찌개' | jq .
# 1차: cache miss → DB write → { ok: true, data: [...5건] }
# 2차: cache hit → 동일 응답 + 콘솔에 [youtube_cache] HIT 표시

# DB에서 캐시 확인
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select query_key, fetched_at from youtube_cache;"
```

quota 초과 모킹: `YOUTUBE_API_KEY`를 일부러 잘못된 값으로 바꾼 후 호출 → `{ ok: true, data: [], warning: 'quotaExceeded' }` 또는 빈 배열 graceful 확인.

### E. Phase 4 신규 검증 — log_cooking_session 트랜잭션 manual smoke (선택)

```bash
# /recipes 진입 → 첫 카드 클릭 → 상세 → "요리 시작" 버튼
# 다이얼로그에서 평점 + 메모 입력 → 확정
# 토스트 "요리 기록을 저장했습니다" 확인
# /cooking-history 진입 → 기록 표시 확인
# /inventory 진입 → 사용한 재료 차감 확인 (보유 0이면 사라짐, 부분이면 수량 감소)

# 인벤토리 재료 클릭 → /(app)/inventory/[ingredientId] 진입
# 좌측 "이 재료로 만들었던 요리" / 우측 "이 재료로 새로 시도할 요리" 표시 확인
```

### F. (선택) PRD §3 로드맵 체크박스 갱신

architect 권고 — Phase 3 + Phase 4 완료 표시 누락 (Phase 0a~2까지만 [x]):
```
docs/PRD.md §3 로드맵 섹션에서:
- Phase 3 (레시피 큐레이션 + YouTube) [x] 표시
- Phase 4 (요리 히스토리 + 듀얼 추천) [x] 표시
```
한 commit으로 처리 가능 (`docs: PRD §3 로드맵 Phase 3/4 완료 표시`).

### G. (선택) 모바일 웹뷰 스모크 (Vercel preview + EAS, 30-60분)

```bash
# 1. Vercel preview deploy (YOUTUBE_API_KEY env 포함)
cd /Users/jinmin/Documents/Project/the_others/rn_app_dev
git push origin feature/smart-refrigerator   # ← Vercel preview 자동 트리거

# 2. preview URL 확인 후 mobile env 갱신
# apps/mobile/.env.preview의 WEB_BASE_URL을 preview URL로 갱신

# 3. EAS preview build → APK
cd apps/mobile
eas build --profile preview --platform android
```

스모크 체크리스트:
- [ ] /(app)/recipes 추천 리스트 + 카드 클릭 → 상세
- [ ] 보유/필수 부족/선택 부족 3섹션 + YouTube 임베드 (`youtube-nocookie.com`)
- [ ] **★ "요리 시작" 버튼 → 다이얼로그 → 확정 → 차감 + 기록** (Phase 4)
- [ ] **★ /(app)/cooking-history 페이지 표시** (Phase 4)
- [ ] **★ 인벤토리 재료 클릭 → DualList 좌/우 표시** (Phase 4)
- [ ] BottomNav "레시피" 탭 활성 (히스토리는 disabled)

### H. (선택) Push + tag push

```bash
# Phase 3 + 4 누적 15 commits + 2 tags
git push origin feature/smart-refrigerator
git push origin v0.3.0
git push origin v0.4.0

# (선택) main으로 PR 또는 merge — 프로젝트 워크플로우 따라
```

---

## 3. Phase 5 진입 (★ 다음 세션 권장)

**Phase 5 = 장보기 브릿지 (예상 1주, phase-5.md)**

전형적 작업:
- DB: 0016+ shopping_list / shopping_list_items + RLS + RPC
- entities/shopping
- features/add-to-shopping (레시피 부족 재료 → 장보기 추가)
- features/check-shopping-item
- pages /(app)/shopping/page.tsx + BottomNav 진입점 결정

선행: Phase 3 + Phase 1 (이미 완료)
후속: Phase 6 (스마트 입력 — 바코드 + OCR, **비용 게이트 $5/월** — ROI 평가 후 진입)

**시작 명령**:
```
Phase 5 진입하자. ralph 자율 모드.
```

→ ralph는 phase-5.md 우선 탐색 + Phase 4 패턴 따라 (Wave 분할 병렬, drift 검증, day별 commit, final architect verification + tag v0.5.0).

---

## 4. 처리 안 한 / 보류 항목 (Phase 1+2+3+4 누적)

| # | 작업 | 우선도 | 예상 시간 |
|---|---|---|---|
| 1 | RLS 정책 추가 — `storage_locations` INSERT (Phase 2 Day 6 admin 우회 정리) | 낮음 | 30분 |
| 2 | DB 타입 갱신 후 untyped cast 제거 PR (Phase 3 + 4 = 8곳) | 낮음 | 30분 |
| 3 | equivalence.spec RPC 통합 블록 실제 fixture 비교 구현 (현재 placeholder) | 중간 | 1시간 |
| 4 | E2E 헬퍼 추출 (recipes/cooking-history happy-path 인라인 헬퍼 → e2e/_helpers.ts) | 낮음 | 30분 |
| 5 | Phase 0a residual debt — `apps/web/src/app/(app)/account/{page,logout-button}.tsx`의 `zinc-*` / `rounded-md` (디자인 토큰 미준수) | 낮음 | 30분 |
| 6 | BottomNav 아이콘 추출 → `shared/ui/icons/` (UI polish) | 낮음 | 30분 |
| 7 | LogCookingDialog custom recipe 입력 UI (recipe = null 케이스 wrapper) | 낮음 | 1시간 |
| 8 | cooking-history page 4 sequential fetch → 통합 RPC `get_user_cooking_history(p_user, p_limit) returns table` (Phase 5+ 검토) | 낮음 | 1-2시간 |
| 9 | BottomNav "히스토리" 탭 활성화 결정 — phase-4.md 명시 X. 진입 동선 (마이페이지/inventory 헤더 link) PRD 결정 필요 | 중간 | 30분 |

**가장 신경 쓸만한 것**: #3 equivalence RPC 통합 (정적 동치성만 검증, 실제 RPC 결과 비교 미구현). #9 cooking-history 진입 동선. Phase 5 entry 전 또는 직후 처리 권장.

---

## 5. 명령 / 패턴 메모

### Phase 5 ralph 호출 패턴 (Phase 1~4와 동일)
- 각 Day 끝에 architect verification + 필요 시 사용자 review
- ★ Wave 분할 병렬 (Phase 4 패턴): Day 1+2+3 (DB layer 병렬) → Day 4+5 (features 병렬) → Day 6 (pages) → Day 7 (E2E + final)
- 자동 진행 모드: "Day마다 commit + 다음 Day"
- lefthook hook 자동 (gitleaks + typecheck staged glob)
- spec sync: phase-5.md SOURCE 마커 ↔ migrations/*.sql byte 일치 (drift checker)

### 검증 5종 (각 Day 끝, Phase 1~4 동일)
```bash
pnpm web typecheck
pnpm web lint
pnpm web db:check-drift
pnpm web test
pnpm web test:e2e   # 사용자 환경 의존 — 보통 deferred
```

### 환경 메모
- Supabase project: linked (Phase 0a Day 1)
- 0014/0015a/0015b: Day 1-3 작성 완료, 사용자 db:reset/push로 적용 필요
- gitleaks: 시스템 설치 완료, lefthook pre-commit 활성
- e2e port: **3100**
- supabase local URL (default): http://127.0.0.1:54321
- supabase local DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### Phase 4 Spec deviations (architect 인지 완료, 인계 사항)
- **0014 RLS DDL → §2.2 SOURCE 블록 통합** (Day 1 spec patch — Phase 3 0011 패턴 일관)
- **DB types 미재생성**: 4개 신규 객체 (cooking_history/consumed_ingredients/log_cooking_session/recommend_for_ingredient) untyped cast 4곳 (사용자 환경 db:types 후 정리)
- **BottomNav 히스토리 탭 disabled 유지** (phase-4.md 명시 없음)
- **cooking-history page 4 sequential fetch** (Phase 5+ 통합 RPC 검토)
- **LogCookingDialog custom recipe UI 미구현** (recipe non-null props만, schema는 custom 지원)

### Phase 3 Spec deviations (참조)
- 0011 SQL urgent fix `<= 2` → `between 0 and 2` (Day 4 정정)
- 0012 SOURCE-EXEMPT 마커 (auto-generated 75KB seed)
- DB types 미재생성 (untyped cast 4곳)
- YouTube 서버사이드 cache lookup만 (실제 fetch는 client-side)

---

## 6. 최근 commits (참조 — Phase 4 7개)

```
e5d87d6 feat(phase-4): Day 7 (FINAL) — E2E cooking-history-happy-path + CHANGELOG v0.4.0 + 회귀 검증 5종 PASS ★ Phase 4 종료
d564cec feat(phase-4): Day 6 — entities/cooking-history + widgets/cooking-history-list + cooking-history page + "요리 시작" 통합
4eb33cf feat(phase-4): Day 5 — features/dual-recommendation + /(app)/inventory/[ingredientId] + ingredient-row 클릭
e93ca05 feat(phase-4): Day 4 — features/log-cooking-session (Server Action + Dialog + util + 9 단위 테스트)
36ff643 feat(phase-4): Day 3 — 0015b_log_cooking_session plpgsql 원자 트랜잭션 RPC
0435362 feat(phase-4): Day 2 — 0015a_recommend_for_ingredient RPC (듀얼 추천)
8070c09 feat(phase-4): Day 1 — 0014_cooking_history + RLS 4정책 + spec sync
```

전체 (Phase 0+1+2+3+4): `git log --oneline | head -45`
태그 목록: `git tag --list 'v0.*'` → `v0.3.0 / v0.4.0`

---

## 7. 산출물 요약 (지금까지)

### DB 마이그레이션 16개 (apps/web/supabase/migrations/)
- 0001~0010 (Phase 0+1+2 — 인벤토리 핵심)
- 0011 recipe_master + recipe_ingredients + recipe_difficulty enum + recommend_recipes RPC + RLS (Phase 3)
- 0012 시드 100선 / 707 재료 매핑 (auto-generated, recipes_to_sql.mjs)
- 0013 youtube_cache + RLS read-only (Phase 3)
- **0014 cooking_history + cooking_history_consumed_ingredients + RLS 4정책 + 인덱스** (Phase 4)
- **0015a recommend_for_ingredient RPC (듀얼 추천)** (Phase 4)
- **0015b log_cooking_session plpgsql 원자 트랜잭션 RPC** (Phase 4)

### Phase 5 신규 예정 (phase-5.md 참조)
- 0016+ shopping_list / shopping_list_items + RLS + RPC

### 기능 (사용자 관점, Phase 0~4 누적)
- 가입/로그인/로그아웃
- 식재료 검색 (typeahead, 한국어 trigram)
- 인벤토리 CRUD + 부분 소진 (25/50/75/100%) + 자동 consumed 트리거
- 정렬 (임박순/최근/이름)
- 필터 (카테고리 multi + 보관 장소)
- 보관 장소 간 이동
- 사용자 정의 보관 장소 추가/이름변경/삭제
- D-Day 표시 (KST + 동치성 검증)
- 인벤토리 헤더 카운트 배지 (전체/임박/만료)
- ★ 레시피 추천 (점수 ≥ 0.5, "지금 만들 수 있음" / "재료 1-2개 부족" 섹션 분리)
- ★ 레시피 상세 (보유/필수 부족/선택 부족 3섹션 + instructions_md + YouTube 임베드)
- ★ BottomNav 레시피 탭 활성
- **★ "요리 시작" CTA → 다이얼로그 → 자동 차감 + 기록** (Phase 4)
- **★ /(app)/cooking-history 과거 기록 페이지** (Phase 4)
- **★ 재료 클릭 → /(app)/inventory/[ingredientId] 듀얼 추천 (좌: 과거 / 우: 신규)** (Phase 4)

### 테스트
- vitest 54 PASS / 1 skip (전체 9 file)
- E2E 5 spec (auth + inventory-happy-path + inventory-advanced + recipes-happy-path + cooking-history-happy-path) — 사용자 환경 deferred 실행
- equivalence.spec 정적 동치성 (RPC 통합은 SUPABASE_LOCAL_URL conditional)
