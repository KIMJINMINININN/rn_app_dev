# 다음 세션 인계 TODO

> 작성: 2026-04-30 (Phase 1 ★ MVP 완전 마감 후)
> 마지막 commit: `84010ad` (origin push 완료, 15 commits ahead → 0)
> 브랜치: `feature/smart-refrigerator`

---

## 0. 현재 상태 한 줄 요약

**Phase 0a + 0b + 1 코드 측면 모두 완료. Push 끝. 15 commits 반영.**

가입 → 식재료 CRUD → D-Day 표시까지 동작. ★ MVP 출시 가능 코드 베이스.

---

## 1. 다음 세션 첫 줄 (claude에게)

```
docs/TODO.md 읽어줘.
```

claude가 이 문서 읽고 옵션 A/B/C 중 선택 받고 진행.

---

## 2. 옵션 (선택)

### A. Phase 2 진입 (★ 권장 — 자연스러운 다음 단계)

**Phase 2 = 인벤토리 고도화 (7 Day, phase-2.md)**

- Day 1: 0009 트리거 (auto-consumed + partial consume) + db:reset 검증
- Day 2: 0010 `get_inventory_summary` RPC + db:types + D-Day 동치성 통합 테스트
- Day 3: `InventorySummaryHeader` 위젯 + 정렬 toggle
- Day 4: 카테고리/storage 필터 + Zustand `use-filter-store`
- Day 5: `moveIngredient` Server Action + 통합 테스트
- Day 6: `ConsumeIngredientSheet` (부분 소진 dialog) + `manage-storage` + widgets 통합
- Day 7: E2E inventory-advanced + 회귀

**시작 명령**:
```
phase-2.md §0 사전 의존성 체크하고 Day 1 ralph로 진입해줘.
```

### B. 액션 2-5 마감 후 Phase 2 (시간 여유 있을 때)

Phase 1 §7 Acceptance + §8 DoD 완전 충족 → 이후 Phase 2:

| # | 작업 | 환경 | 시간 |
|---|---|---|---|
| 2 | §7 측정 (RSC TTI < 500ms / typeahead < 200ms / "양"/"양ㅍ" ranking) | Chrome DevTools Lighthouse + Network | 5분 |
| 3 | 모바일 웹뷰 스모크 (phase-1.md §11) | Vercel preview + EAS preview build + APK sideload | 30-60분 |
| 4 | §6.2 통합 테스트 (Vitest + supabase local) | Docker + supabase CLI db:start | 1-2시간 |
| 5 | §6.3 E2E happy-path 본문 + RLS A vs B | 인증 fixture (storageState) 셋업 | 1-2시간 |

**시작 명령**:
```
액션 2부터 진행하자. 측정 결과 공유할게.
```

### C. 다른 우선순위

- Phase 0a residual debt 정리: `apps/web/src/app/(app)/account/{page,logout-button}.tsx`의 `zinc-*` / `rounded-md` (Phase 0a Day 3에서 deferral)
- 디자인 polish (Skeleton shimmer 격상, BottomNav 아이콘 추출 to `shared/ui/icons/`)
- Vercel deploy 환경 변수 점검

---

## 3. 명령 / 패턴 메모

### Phase 2 ralph 호출 패턴 (Phase 1과 동일)
- 각 Day 끝에 architect verification + 사용자 review
- 자동 진행 모드: "Day마다 15초 대기, 응답 없으면 commit + 다음 Day"
- lefthook hook 자동 (gitleaks + typecheck staged glob)

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
- gitleaks: 시스템 설치 완료 (`brew install gitleaks`)
- lefthook: pre-commit 활성 (gitleaks + typecheck)
- e2e port: **3100** (3000은 다른 프로젝트 점유 회피)

---

## 4. Phase 1 commits (참조)

```
84010ad chore(phase-1): 0008b 콘솔 적용 후 useTypeahead 정식 타입 정리
6f3e756 feat(phase-1): Day 7 (FINAL) — 회귀 검증 + CHANGELOG v0.1.0 통합
e4bcc0e feat(phase-1): Day 6 — inventory loading.tsx + E2E auth-guard 회귀
d5dc7a0 feat(phase-1): Day 5 — list/delete/consume + widgets/inventory-list
d13836d feat(phase-1): Day 4 — features/add-ingredient
e212ac9 feat(phase-1): Day 3 — entities/ingredient + 8 fixture
3ab4744 feat(phase-1): Day 2 — 0007/0008/0008b
6adde69 feat(phase-1): Day 1 — 0003-0006 + RLS + 시드 154 row
```

전체 history: `git log --oneline | head -20`
