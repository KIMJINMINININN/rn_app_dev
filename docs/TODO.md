# 다음 세션 인계 TODO

> 작성: 2026-05-04 (Phase 5 ★ 장보기 브릿지 완전 마감 후)
> 마지막 commit: (Day 7 commit pending — CHANGELOG v0.5.0 + PRD §3 + tag)
> 마지막 tag: `v0.5.0` (annotated, Day 7 마감 후 부여)
> 브랜치: `feature/smart-refrigerator`

---

## 0. 현재 상태 한 줄 요약

**Phase 0a + 0b + 1 + 2 + 3 + 4 + 5 모두 완료. 44+ commits 반영. 데모 가능 MVP + 요리 히스토리 + 듀얼 추천 + ★ 장보기 브릿지까지.**

가입 → 식재료 CRUD + 정렬/필터/이동/부분소진/만료 알림 + 사용자 정의 보관 → 레시피 추천 + 상세(보유/부족 + instructions + YouTube) → 요리 시작 → 자동 차감 + 기록 → 재료 클릭 → 좌(과거)/우(신규) 듀얼 추천 → 과거 기록 페이지 → **★ 레시피 부족 재료 자동 추출 → 장보기 목록 → 쿠팡/마켓컬리 deeplink**까지 동작.

PRD §2.5 (Phase 5) 핵심 가치 충족. **B마트는 웹 미지원 확정 → 영구 비활성** (Pre-flight 결과).

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
Phase 6 진입하자.
```
(★ ROI 평가 후 — phase-6.md §0 PoC 1일 필수)

---

## 2. ★ 사용자 환경 액션 — 한 번에 처리 (Phase 5 전용)

> Phase 5 코드 100% 완성. 실제 동작 검증 + Phase 6 PoC 준비.
> **모두 사용자 본인 환경에서 1회 실행. ralph는 사용자 환경(Docker, Vercel, EAS, 실 브라우저)에 접근 불가**

### A. 사전 준비 (1회, 5분)

| # | 작업 | 비고 |
|---|---|---|
| 1 | Docker Desktop 실행 | supabase local 필요 |
| 2 | `apps/web/.env.local` 확인 — `NEXT_PUBLIC_COUPANG_ENABLED=true` / `NEXT_PUBLIC_KURLY_ENABLED=true` / `NEXT_PUBLIC_BAEMIN_ENABLED=false` 존재 | Day 1에서 추가 완료 |
| 3 | (선택) 실 브라우저(데스크톱)에서 `https://www.coupang.com/np/search?q=양파` 1회 직접 확인 | 헤드리스 봇 차단 회피 검증. 차단되면 `NEXT_PUBLIC_COUPANG_ENABLED=false`로 토글 |

### B. DB 적용 + 타입 갱신 + 시드 검증 (chained, 약 2-3분)

```bash
cd /Users/jinmin/Documents/Project/the_others/rn_app_dev

# 1. supabase local 시작 + 0001~0016 (Phase 0~5 모든 마이그레이션 17개 + seed 1) 적용
pnpm web db:start && pnpm web db:reset

# 2. DB 타입 자동 생성 → Phase 5 신규 객체 2개 타입 등장
#    (shopping_list 테이블 + shopping_source enum)
#    → Phase 5 untyped cast 5곳 제거 가능 (선택적 후속 PR)
pnpm web db:types

# 3. 시드 검증
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d shopping_list"
# 기대: id/user_id/ingredient_master_id/custom_name/quantity/unit/source/recipe_id/bought/note/created_at
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from shopping_list;"
# 기대: 0 (신규 테이블)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select unnest(enum_range(null::shopping_source));"
# 기대: manual / recipe_gap (2 row)

# 4. RLS 격리 확인 (선택)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d+ shopping_list" | grep policy
# 기대: shopping_list_select_own / insert_own / update_own / delete_own (4 정책)
```

→ 실패 시: `pnpm web db:stop && pnpm web db:start` 후 재시도.

### C. 통합/E2E 테스트 실행 (chained, 약 5-7분)

```bash
cd /Users/jinmin/Documents/Project/the_others/rn_app_dev

# 1. 단위 + (활성화된) 통합 테스트
export SUPABASE_LOCAL_URL=http://127.0.0.1:54321
pnpm web test
# 기대: 11 file / 67 PASS / 1 skip (Phase 5 13 신규 + 기존 회귀)

# 2. E2E 7 spec (Playwright + supabase 로컬 + 인증 환경)
pnpm web test:e2e
# 기대: auth + inventory-happy-path + inventory-advanced + recipes-happy-path + cooking-history-happy-path + shopping-list + shopping-manual-add 모두 PASS
# Phase 5 신규 2: shopping-list (가입→재료→레시피→부족재료담기→/shopping→deeplink) + shopping-manual-add (직접 추가→체크→삭제)
```

→ E2E 실패 시: `pnpm web dev` (port 3100)로 직접 띄워보고 `/shopping` 진입 확인 후 재시도.

### D. (선택) 실제 브라우저에서 deeplink 동작 검증 (5분)

```bash
# dev server 띄운 상태
pnpm web dev

# 브라우저에서:
# 1. 가입/로그인
# 2. 식재료 추가
# 3. /recipes → 카드 클릭 → 상세
# 4. "부족 재료 장바구니에 담기" 버튼 → toast 확인
# 5. /shopping 직접 이동
# 6. ShoppingItemRow에서 "쿠팡" 또는 "마켓컬리" 링크 클릭 → 새 탭에서 검색 결과 노출 확인
# 7. 항목 추가 다이얼로그 → 추가 → 체크 → 삭제 흐름
```

### E. (선택) 모바일 웹뷰 스모크 (Vercel preview + EAS, 30-60분)

```bash
# 1. Vercel preview deploy
git push origin feature/smart-refrigerator   # ← Vercel preview 자동 트리거

# 2. preview URL 확인 후 mobile env 갱신
# apps/mobile/.env.preview의 WEB_BASE_URL을 preview URL로 갱신

# 3. EAS preview build → APK
cd apps/mobile
eas build --profile preview --platform android
```

스모크 체크리스트:
- [ ] /(app)/recipes 추천 리스트 + 카드 클릭 → 상세
- [ ] **★ "부족 재료 담기" 버튼 → toast → /(app)/shopping 진입** (Phase 5)
- [ ] **★ ShoppingItemRow + 쿠팡/마켓컬리 deeplink 클릭 → 외부 브라우저/앱 이동** (Phase 5)
- [ ] **★ 단위 충돌 시 ⚠ "단위 확인 필요" note 표시** (Phase 5)
- [ ] **★ 항목 추가/체크/삭제 흐름** (Phase 5)
- [ ] BottomNav 4 슬롯 그대로 (장보기 진입은 recipe-detail toast 안내 또는 직접 URL)

### F. (선택) Push + tag push

```bash
# Phase 3+4+5 누적 commits + 3 tags
git push origin feature/smart-refrigerator
git push origin v0.3.0
git push origin v0.4.0
git push origin v0.5.0

# (선택) main으로 PR 또는 merge — 프로젝트 워크플로우 따라
```

---

## 3. Phase 6 진입 (★ 다음 세션 권장 — 비용 게이트 통과 시만)

**Phase 6 = 스마트 입력 (바코드 + OCR, 예상 2주, phase-6.md)**

⚠️ **비용 게이트 $5/월 — PoC 1일 필수**:
- ML Kit + Naver Clova 영수증 5장씩 OCR 정확도 측정 → 둘 중 한 쪽 ≥ 70% 시 진입
- 비용 산정 → $5/월 초과 예상 시 phase deferred

전형적 작업:
- 외부 API 키 발급 (식약처 식품안전나라 OpenAPI / Naver Clova OCR / Google ML Kit native 모듈)
- DB: 0017+ barcode_cache + receipt_uploads + RLS + RPC
- features/scan-barcode + features/upload-receipt
- webview-protocol 메시지 확장 (apps/mobile RN ↔ apps/web)
- pages /(app)/scan + BottomNav 진입점 결정

선행: Phase 1 (이미 완료). Phase 5 종료 후 ROI 평가 권장.

**시작 명령** (PoC 통과 후):
```
Phase 6 진입하자. ralph 자율 모드.
```

→ ralph는 phase-6.md 우선 탐색 + Phase 5 패턴 따라 (Wave 분할 병렬, drift 검증, day별 commit, final architect verification + tag v0.6.0).

---

## 4. 처리 안 한 / 보류 항목 (Phase 1+2+3+4+5 누적)

| # | 작업 | 우선도 | 예상 시간 |
|---|---|---|---|
| 1 | RLS 정책 추가 — `storage_locations` INSERT (Phase 2 Day 6 admin 우회 정리) | 낮음 | 30분 |
| 2 | DB 타입 갱신 후 untyped cast 제거 PR (Phase 3 + 4 + 5 = 13곳) | 낮음 | 30분 |
| 3 | equivalence.spec RPC 통합 블록 실제 fixture 비교 구현 (Phase 3 placeholder) | 중간 | 1시간 |
| 4 | E2E 헬퍼 추출 (모든 spec 인라인 헬퍼 → e2e/_helpers.ts) | 낮음 | 30분 |
| 5 | Phase 0a residual debt — `apps/web/src/app/(app)/account/{page,logout-button}.tsx`의 `zinc-*` / `rounded-md` (디자인 토큰 미준수) | 낮음 | 30분 |
| 6 | BottomNav 아이콘 추출 → `shared/ui/icons/` (UI polish) | 낮음 | 30분 |
| 7 | LogCookingDialog custom recipe 입력 UI (Phase 4) | 낮음 | 1시간 |
| 8 | cooking-history page 4 sequential fetch → 통합 RPC `get_user_cooking_history` (Phase 5+ 검토) | 낮음 | 1-2시간 |
| 9 | BottomNav 진입점 — 장보기/히스토리 탭 활성화 결정 (5번째 슬롯 또는 history 슬롯 교체) | **중간** | 1시간 |
| 10 | shopping_list 부분 인덱스 외에 (recipe_id) 인덱스 추가 검토 — extractRecipeGap에서 동일 recipe 중복 추출 시 SELECT 성능 (현재 row 적어 미문제) | 낮음 | 30분 |
| 11 | shopping_list 합산 UPDATE를 RPC로 추출 (현재 Server Action 내 sequential SELECT+UPDATE) — 트랜잭션 격리 보강 | 낮음 | 1시간 |
| 12 | bmart 영구 비활성 → 대안 검토 (SSG / 11번가 / 홈플러스 등). 또는 사용자 직접 검색 안내로 충분한지 판단 | 낮음 | 자유 |

**가장 신경 쓸만한 것**: #9 BottomNav 진입점 (Phase 4 + 5 두 페이지 모두 진입 동선 미해결). #2 untyped cast (사용자 db:types 1회 실행 후 빠르게 정리). Phase 6 entry 전 또는 직후 처리 권장.

---

## 5. 명령 / 패턴 메모

### Phase 6 ralph 호출 패턴 (Phase 1~5와 동일, 단 PoC 게이트 추가)
- **Day 0 PoC (★ 비용 게이트, ralph가 사용자에게 PoC 진행 협조 요청)**: ML Kit + Clova 5장씩 OCR 정확도 측정. 미달 시 phase deferred 결정
- 각 Day 끝에 architect verification + 필요 시 사용자 review
- ★ Wave 분할 병렬 (Phase 4+5 패턴): Day 1+2+3 (DB layer 병렬) → Day 4+5 (features 병렬) → Day 6 (pages) → Day 7 (E2E + final)
- 자동 진행 모드: "Day마다 commit + 다음 Day"
- lefthook hook 자동 (gitleaks + typecheck staged glob)
- spec sync: phase-6.md SOURCE 마커 ↔ migrations/*.sql byte 일치 (drift checker)

### 검증 5종 (각 Day 끝, Phase 1~5 동일)
```bash
pnpm web typecheck
pnpm web lint
pnpm web db:check-drift
pnpm web test
pnpm web test:e2e   # 사용자 환경 의존 — 보통 deferred
```

### 환경 메모
- Supabase project: linked (Phase 0a Day 1)
- 0016: Day 1 작성 완료, 사용자 db:reset/push로 적용 필요
- gitleaks: 시스템 설치 완료, lefthook pre-commit 활성
- e2e port: **3100**
- supabase local URL (default): http://127.0.0.1:54321
- supabase local DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### Phase 5 Spec deviations (architect 인지 완료, 인계 사항)
- **0016 RLS DDL → §2.2 SOURCE 블록 통합** (Day 1 spec patch — Phase 4 0014 패턴 일관)
- **DB types 미재생성**: 2개 신규 객체 (shopping_list 테이블 + shopping_source enum) untyped cast 5곳 (사용자 환경 db:types 후 정리)
- **BottomNav 4 슬롯 그대로** (장보기 슬롯 미추가, 히스토리도 disabled 유지). 진입은 recipe-detail toast + 직접 URL
- **B마트 영구 비활성** (Pre-flight 웹 미지원 확정) — buildCommerceUrl bmart는 토글 true여도 빈 문자열 + console.warn
- **shopping_list 합산 UPDATE는 Server Action 내 sequential SELECT+UPDATE** (트랜잭션 RPC 미추출 — Phase 6+ 검토)
- **쿠팡 헤드리스 봇 차단** — Pre-flight 환경 한계, 실 브라우저 정상 가정. 사용자 1회 검증 권장

### Phase 4 Spec deviations (참조)
- 0014 RLS DDL → §2.2 SOURCE 블록 통합
- DB types 미재생성 (untyped cast 4곳)
- BottomNav "히스토리" 탭 disabled
- LogCookingDialog custom recipe UI 미구현

### Phase 3 Spec deviations (참조)
- 0011 SQL urgent fix `<= 2` → `between 0 and 2`
- 0012 SOURCE-EXEMPT 마커 (auto-generated 75KB seed)
- DB types 미재생성 (untyped cast 4곳)
- YouTube 서버사이드 cache lookup만

---

## 6. 최근 commits (참조 — Phase 5 5개)

```
(Day 7 pending) feat(phase-5): Day 7 (FINAL) — CHANGELOG v0.5.0 + PRD §3 + tag v0.5.0 + architect verification ★ Phase 5 종료
7dd16f1 feat(phase-5): Day 6 — E2E 2 spec (shopping-list + shopping-manual-add) + 검증 4/5 PASS
21811e4 feat(phase-5): Day 4-5 — Server Actions 4 + UI 컴포넌트 5 + /(app)/shopping 페이지 + recipe-detail 통합
6df656c feat(phase-5): Day 2-3 — entities/shopping-item (model + lib + 13 단위 테스트)
c88dde7 feat(phase-5): Day 1 — Pre-flight URL 검증 + 0016_shopping_list (table+enum+index+RLS) + spec sync
```

전체 (Phase 0+1+2+3+4+5): `git log --oneline | head -50`
태그 목록: `git tag --list 'v0.*'` → `v0.3.0 / v0.4.0 / v0.5.0`

---

## 7. 산출물 요약 (지금까지)

### DB 마이그레이션 18개 + seed 1 (apps/web/supabase/migrations/)
- 0001~0010 (Phase 0+1+2 — 인벤토리 핵심). **0008b는 supabase CLI 비호환 → 0017로 rename**
- 0011 recipe_master + recipe_ingredients + recipe_difficulty enum + recommend_recipes RPC + RLS (Phase 3)
- 0012 시드 100선 / 707 재료 매핑 (auto-generated, recipes_to_sql.mjs)
- 0013 youtube_cache + RLS read-only (Phase 3)
- 0014 cooking_history + cooking_history_consumed_ingredients + RLS 4정책 + 인덱스 (Phase 4)
- **0016 shopping_list + shopping_source enum + 부분 index + RLS 4정책** (Phase 5)
- 0017 search_ingredient_masters RPC (Phase 1, 원래 0008b — rename)
- 0018 recommend_for_ingredient RPC 듀얼 추천 (Phase 4, 원래 0015a — rename)
- 0019 log_cooking_session plpgsql 원자 트랜잭션 RPC (Phase 4, 원래 0015b — rename)

### Phase 6 신규 예정 (phase-6.md 참조)
- 0020+ barcode_cache / receipt_uploads + RLS + RPC

### 기능 (사용자 관점, Phase 0~5 누적)
- 가입/로그인/로그아웃
- 식재료 검색 (typeahead, 한국어 trigram)
- 인벤토리 CRUD + 부분 소진 (25/50/75/100%) + 자동 consumed 트리거
- 정렬 (임박순/최근/이름)
- 필터 (카테고리 multi + 보관 장소)
- 보관 장소 간 이동
- 사용자 정의 보관 장소 추가/이름변경/삭제
- D-Day 표시 (KST + 동치성 검증)
- 인벤토리 헤더 카운트 배지 (전체/임박/만료)
- 레시피 추천 (점수 ≥ 0.5, "지금 만들 수 있음" / "재료 1-2개 부족" 섹션 분리)
- 레시피 상세 (보유/필수 부족/선택 부족 3섹션 + instructions_md + YouTube 임베드)
- BottomNav 레시피 탭 활성
- "요리 시작" CTA → 다이얼로그 → 자동 차감 + 기록
- /(app)/cooking-history 과거 기록 페이지
- 재료 클릭 → /(app)/inventory/[ingredientId] 듀얼 추천 (좌: 과거 / 우: 신규)
- **★ 레시피 부족 재료 자동 추출 → 장보기 추가** (Phase 5)
- **★ /(app)/shopping 페이지 — 미구매/구매완료 섹션 + 쿠팡/마켓컬리 deeplink 새 탭** (Phase 5)
- **★ 단위 충돌 시 "단위 확인 필요" note 표시** (Phase 5)
- **★ 수동 항목 추가 다이얼로그 + 체크/삭제** (Phase 5)

### 테스트
- vitest 67 PASS / 1 skip (전체 11 file)
- E2E 7 spec (auth + inventory-happy-path + inventory-advanced + recipes-happy-path + cooking-history-happy-path + shopping-list + shopping-manual-add) — 사용자 환경 deferred 실행
- equivalence.spec 정적 동치성 (RPC 통합은 SUPABASE_LOCAL_URL conditional)
