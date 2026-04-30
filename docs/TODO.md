# 다음 세션 인계 TODO

> 작성: 2026-04-30 (Phase 2 ★ 인벤토리 고도화 완전 마감 후)
> 마지막 commit: `067ec51` (origin push 완료)
> 브랜치: `feature/smart-refrigerator`

---

## 0. 현재 상태 한 줄 요약

**Phase 0a + 0b + 1 + 2 모두 완료. Push 끝. 24+ commits 반영.**

가입 → 식재료 CRUD + 정렬/필터/이동/부분소진/만료 알림 + 사용자 정의 보관 장소까지 동작.

---

## 1. 다음 세션 첫 줄 (claude에게)

```
docs/TODO.md 읽어줘.
```

또는 직접:
```
Phase 3 진입하자.
```

---

## 2. 옵션 (선택)

### A. Phase 3 진입 (★ 권장 — 자연스러운 다음 단계, 가장 긴 phase)

**Phase 3 = 레시피 큐레이션 (10 Day, phase-3.md, ~28KB spec)**

- **Day 1-2**: 레시피 100선 큐레이션 (CSV 작성 → 변환 → `0012_recipes_seed.sql`)
- **Day 3**: 0011 `recommend_recipes` RPC + `scoring-constants.ts` + `computeRecipeMatch.ts` + 단위 테스트
- **Day 4**: 0012 시드 적용 + 0013 youtube_cache + TS↔SQL 동치성
- **Day 5**: `entities/recipe` 슬라이스 (RecipeCard / MatchScore / MissingIngredientsList / YouTube)
- **Day 6**: `features/list-recommendations` + youtube-embed Route Handler + view-recipe-match
- **Day 7**: pages `/(app)/recipes/page.tsx` + `/[id]/page.tsx` + BottomNav "레시피" 탭 활성화
- **Day 8**: 통합 테스트 + E2E `recipes-happy-path.spec.ts`
- **Day 9-10**: 모바일 웹뷰 스모크 + 회귀 + tag `v0.3.0` + CHANGELOG

**시작 명령**:
```
Phase 3 진입하자. Day마다 15초 대기 자동 진행 모드 시작!
```

**주의**: Day 1-2 레시피 100선 큐레이션은 도메인 작업 — Phase 1 0006 시드 154 row 큐레이션과 동일 패턴 (한식 50 + 양식/일식/중식 50 추정). ralph가 자율 큐레이션 진행 또는 사용자 직접.

**환경 변수 (Phase 3 신규)**:
- YouTube Data API v3 키 (옵션, 영상 fetch — phase-3.md §0.0 참조)

### B. 사용자 환경 액션 5건 처리 후 Phase 3

Phase 1 + Phase 2 잔여 액션:

| # | 작업 | 환경 | 시간 |
|---|---|---|---|
| 1 | 0009 트리거 manual SQL 검증 | Supabase 콘솔 | 5분 |
| 2 | RLS 정책 추가 (storage_locations INSERT) | Phase 3+ 별도 마이그레이션 | 30분 |
| 3 | §6.2 통합 테스트 (Vitest + supabase local) | Docker | 1-2시간 |
| 4 | §6.3 E2E happy-path 본문 + RLS A vs B | 인증 fixture | 1-2시간 |
| 5 | (선택) git tag v0.1.0 + v0.1.1 | — | 1분 |

### C. 다른 우선순위

- Phase 0a residual debt: `apps/web/src/app/(app)/account/{page,logout-button}.tsx`의 `zinc-*` / `rounded-md` (Phase 0a Day 3에서 deferral)
- 디자인 polish (Skeleton shimmer 격상, BottomNav 아이콘 추출 to `shared/ui/icons/`)
- 모바일 웹뷰 스모크 (Phase 1 §11 — Vercel preview + EAS build, 30-60분)

---

## 3. 명령 / 패턴 메모

### Phase 3 ralph 호출 패턴 (Phase 1/2와 동일)
- 각 Day 끝에 architect verification + 사용자 review
- 자동 진행 모드: "Day마다 15초 대기, 응답 없으면 commit + 다음 Day"
- lefthook hook 자동 (gitleaks + typecheck staged glob)
- spec sync: phase-3.md §2.2 SOURCE 마커 ↔ migrations/*.sql byte 일치 (drift checker)

### 검증 5종 (각 Day 끝)
```bash
pnpm web typecheck
pnpm web lint
pnpm web db:check-drift
pnpm web test          # vitest
pnpm web test:e2e      # Playwright (port 3100)
```

### 환경 메모
- Supabase project: linked (Phase 0a Day 1)
- 0008b RPC: 콘솔 적용 완료 (commit `84010ad`)
- 0009 트리거: 적용됨, manual 검증은 user 액션 #1
- gitleaks: 시스템 설치 완료
- lefthook: pre-commit 활성
- e2e port: **3100**
- Zustand `useFilterStore` (Phase 2 Day 3): 인메모리 only

### Phase 1/2 Spec deviations (Phase 3 진입 전 인지 필요)
- **0008b CLI 거부** → 콘솔 수동 적용 (Phase 3 신규 마이그레이션은 4자리 prefix 0011/0012/0013 → CLI 정상 인식)
- **addStorage admin client 우회** (Phase 2 Day 6) → Phase 3+ RLS 정책 마이그레이션으로 정리 가능
- **§6.2 통합 / §6.3 E2E 본문 / 모바일 스모크** — 모든 phase 공통 사용자 환경 의존, 별도 시점 처리

---

## 4. 최근 commits (참조)

```
067ec51 feat(phase-2): Day 7 (FINAL) — nit cleanup + E2E advanced + CHANGELOG v0.1.1 통합 + PRD §3 체크
22a92ae feat(phase-2): Day 6 — ConsumeIngredientSheet + manage-storage CRUD + widgets/inventory-list 통합
486464b feat(phase-2): Day 5 — features/move-ingredient (Server Action + UI)
ff0ffec feat(phase-2): Day 4 — 카테고리/storage 필터 + 카테고리 query
711c131 feat(phase-2): Day 3 — InventorySummaryHeader + sort + Zustand filter store + FSD fix
b7ff622 feat(phase-2): Day 2 — 0010 인벤토리 요약 RPC + D-Day 동치성 검증
0ed9e86 feat(phase-2): Day 1 — 0009 부분 소진 트리거 + types 갱신
84010ad chore(phase-1): 0008b 콘솔 적용 후 useTypeahead 정식 타입 정리
6f3e756 feat(phase-1): Day 7 (FINAL) — Phase 1 ★ MVP 종료
```

전체: `git log --oneline | head -25`

---

## 5. 산출물 요약 (지금까지)

### DB 마이그레이션 9개 (apps/web/supabase/migrations/)
- 0001 pg_trgm
- 0002 user_profiles + handle_new_user
- 0003 storage_locations + storage_kind enum + RLS
- 0004 ingredient_categories + 글로벌 시드 12 + RLS
- 0005 ingredient_master + gin_trgm_ops + RLS
- 0006 글로벌 시드 154 row (한국 식재료)
- 0007 user_ingredients + view + RLS
- 0008 handle_new_user OR REPLACE (storage 4종 자동)
- 0008b search_ingredient_masters RPC (CLI skip → 콘솔 적용)
- 0009 user_ingredient_partial_consume (auto-consume 트리거)
- 0010 get_inventory_summary RPC

### Phase 3 신규 예정
- 0011 recommend_recipes RPC + recipe_master/recipe_ingredients
- 0012 recipes_seed (~100 row)
- 0013 youtube_cache (24h TTL)

### 기능 (사용자 관점)
- 가입/로그인/로그아웃
- 식재료 검색 (typeahead, 한국어 trigram)
- 인벤토리 CRUD + 부분 소진 (25/50/75/100%)
- 정렬 (임박순/최근/이름)
- 필터 (카테고리 multi + 보관 장소)
- 보관 장소 간 이동
- 사용자 정의 보관 장소 추가/이름변경/삭제
- D-Day 표시 (KST + 동치성 검증)
- 인벤토리 헤더 카운트 배지 (전체/임박/만료)

### 테스트
- vitest 24 PASS (computeDDay 8 + sort 4 + filter 5 + equivalence 6 + button 1)
- E2E 3 PASS (auth + happy-path + advanced)
- 통합 테스트 / 본격 happy-path E2E는 사용자 환경 액션
