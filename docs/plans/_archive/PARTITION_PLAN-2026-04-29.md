# PARTITION_PLAN — `docs/PLAN.md` 분할 전략 명세서

> **상태**: ralplan iteration 2/5 — Architect 자문 + Critic feedback 반영본.
> **목적**: 1872줄짜리 `docs/PLAN.md` 마스터 로드맵을 `/oh-my-claudecode:ralph` 루프가 phase 단위로 자율 실행 가능한 형태로 분할한다. 본 문서는 **분할 전략**만 정의하며, **실제 분할 작업은 Critic이 OKAY를 한 뒤 별도 단계에서 수행**한다.
>
> **이번 iteration에서 적용된 변경**:
> - Q1 (Architect): SSoT 우선순위 표 + drift checker 스크립트 + SOURCE 마커 + db:* 스크립트 6개 정정
> - Q2 (Architect): §0.5 "참조 자산 미리보기" 신설 + 자율성 dry-run 검증 절차 (§8.9–§8.10)
> - Q3 (Architect): 4자리 zero-padded 전역 순차 + 충돌 회피 룰 + `supabase migration new` 금지
> - Critic Issue 5: 분할 전 PLAN.md archive 보존 + grep 기반 §-마커 검증
> - Critic Issue 6: §1.5 "Architect 결정 적용" 신설
> - Critic Issue 7: §2.4 백필 / §8.5 롤백 / §9.5 관측 신설
> - Minor 1–9: 진행 상태표 단일출처(README.md) / TS↔SQL 상수 conventions.md 신설 / 환경 변수 phase 파일로 / 모바일 검증 룰 등

---

## 0. 합의된 결정 요약 (TL;DR)

| 결정 | 선택 | 핵심 이유 |
|---|---|---|
| **D1. 분할 단위** | **A — Phase 1개 = 파일 1개** (8개 phase 파일 + 마스터 1개 + 공유 자산 2개) | ralph 1회 실행 = phase 1개. 1:1 매핑이 가장 명료. 각 phase가 자율 실행 단위 |
| **D2. 마스터 PLAN.md** | **(a) 축소** — TOC / Executive Summary / Dependency Graph / 각 phase 파일로 가는 링크만 남김 (~250줄) | 단일 진입점은 유지. 본문은 phase 파일에 위임. 중복 제거 |
| **D3. DB SSoT** | **하이브리드 (a+b+c 절충) — phase 파일에 해당 phase 마이그레이션 SQL 본문을 inline + 단일 `db-schema.md`에 전체 ERD/일람표/RLS 패턴 통합본 유지** | ralph가 phase 파일 1개로 자율 실행 가능 (자율성). 동시에 cross-phase 참조 시 단일 SSoT (`db-schema.md`) 존재 — DRY 부분 보존 |
| **D4. Cross-cutting** | **하이브리드 (a+b 절충) — 적용도 높은 룰(에러 처리, RLS 패턴, 인증 가드, Server Action vs Route Handler)은 각 phase 파일에 inline 요약 + 단일 `conventions.md` 풀 본문 유지** | ralph는 phase 파일 한 번에 핵심 룰을 본다. 변경 시 `conventions.md`만 수정하면 phase 파일은 룰을 재인용하므로 drift 위험 최소화 |
| **D5. Phase 파일 자율성** | **11개 필수 섹션 + 2개 선택 섹션** (사양 §3 참고). 정량 기준: ralph가 다음 4개 파일만 보고 phase 1개를 끝낼 수 있음 — (1) phase-N.md, (2) db-schema.md, (3) conventions.md, (4) PRD.md. 추가 cross-file read는 phase 파일 §0.5 "참조 자산 미리보기" 섹션이 미리 발췌하여 1차 시도에서 cross-jump 없이 작성 가능하도록 보장 | ralph 가 다른 파일을 거의 따라가지 않아도 phase를 끝낼 수 있어야 함. 검증은 dry-run 시뮬레이션 (§8.9, §8.10) |

---

## 1. 결과 디렉토리 구조

```
docs/
├── PLAN.md                          # ← 축소 마스터 (TOC + Executive Summary + 의존성 그래프 + 링크) ~250줄
├── PRD.md                           # 기존 그대로 (제품 요구사항)
└── plans/
    ├── README.md                    # 신규: phase 파일 사용법 + ralph 호출 가이드 + 진행 상태표 (단일 출처 — Minor 1)
    ├── PARTITION_PLAN.md            # 본 문서. 분할 commit 후 _archive/PARTITION_PLAN-{date}.md 로 이동 (Minor 3, 6 / 재분할 시 부활)
    ├── conventions.md               # 신규: cross-cutting 결정 풀 본문 (PLAN.md §5) + Architect 부록 + 단일 출처 상수
    ├── db-schema.md                 # 신규: DB SSoT 풀 본문 (PLAN.md §3 / §부록 B) + 마이그레이션 번호 충돌 회피 룰
    ├── phase-0a.md                  # 신규: Phase 0a — DB 인프라 + Type Codegen + drift checker
    ├── phase-0b.md                  # 신규: Phase 0b — App Shell + Primitives + 테스트
    ├── phase-1.md                   # 신규: Phase 1 — 인벤토리 CRUD (MVP)
    ├── phase-2.md                   # 신규: Phase 2 — 인벤토리 고도화
    ├── phase-3.md                   # 신규: Phase 3 — 레시피 마스터 + YouTube
    ├── phase-4.md                   # 신규: Phase 4 — 요리 히스토리 + 듀얼 추천
    ├── phase-5.md                   # 신규: Phase 5 — 장보기 브릿지
    ├── phase-6.md                   # 신규: Phase 6 — 스마트 입력 (바코드 + OCR)
    └── _archive/                    # 신규: 분할 전 PLAN.md 보존 + PARTITION_PLAN 이력
        └── PLAN-pre-partition-2026-04-29.md   # Critic Issue 5 — 정보 손실 검증 baseline

apps/web/scripts/
└── check-migration-drift.mjs        # 신규: pnpm db:check-drift 구현 (Architect 1.B / 80줄 ESM)
```

**총 13개 파일** (+ archive 1 + 스크립트 1): 마스터 1 + 공유 자산 2 (`conventions.md`, `db-schema.md`) + phase 8 + 가이드 1 (`README.md`) + 본 명세서 1 + archive 1 + drift checker 1.

**삭제 없음**: 기존 `PRD.md`는 그대로 유지. `PLAN.md`는 축소되지만 동일 경로 유지하여 외부 링크/북마크 깨지지 않음. 분할 직전 원본은 `_archive/PLAN-pre-partition-2026-04-29.md`로 1회 보존 (정보 손실 검증용).

---

## 2. 분할 매핑 — PLAN.md 섹션 → 신규 파일

> **컬럼 의미** (Critic Issue 5):
> - **Primary** = 단일 SSoT. 변경 시 먼저 수정. drift checker가 이 파일을 정답지로 사용
> - **참조** = derivative 발췌본 또는 link. SSoT 변경 후 동기화 대상. drift checker가 SOURCE 마커로 검증

| PLAN.md 원본 섹션 | 라인 범위 | Primary (SSoT) | 참조 (derivative) | 변환 방식 |
|---|---|---|---|---|
| §1 Executive Summary | 10–30 | **PLAN.md (축소판)** | — | 그대로 |
| §2 시스템 아키텍처 개요 | 31–101 | **PLAN.md (축소판)** | phase 파일 §0 사전 의존성 (env vars만 발췌 — Minor 7) | env vars 풀 정의는 PLAN.md 축소판, 각 phase는 해당 phase에서 쓰는 키만 §0에 inline |
| §3 DB 스키마 마스터 (intro) | 103–107 | **db-schema.md** | — | 그대로 + phase 파일별 marker 추가 |
| §3.0 Supabase 디렉토리 결정 | 108–162 | **db-schema.md** §1 | — | 그대로. **db:* 스크립트 6개 정정** (Architect 1.F): db:start / db:push / db:types / db:reset / db:diff / db:check-drift |
| §3.0.1 Postgres 버전 호환성 | 163–183 | **phase-0a.md** §0 사전 의존성 | db-schema.md §1 (1줄 cross-link) | inline 이동 (Phase 0a pre-flight 필수 항목) |
| §3.1 테이블 일람 | 184–202 | **db-schema.md** §2 | — | 그대로 |
| §3.2 정밀 스키마 (모든 마이그레이션 SQL 본문) | 203–403 | **`apps/web/supabase/migrations/*.sql`** (Architect 1.A) | db-schema.md §3 + 각 phase 파일 §2.2 (SOURCE 마커 필수) | **3-tier**. migrations/*.sql = 유일한 SSoT. db-schema.md = 통합 view. phase 파일 = phase scope view. drift checker로 검증 |
| §3.3 RLS 정책 패턴 | 404–439 | **conventions.md** §RLS (코드 패턴) + **db-schema.md** §4 (테이블 매핑) | phase 파일 §1.5 또는 §4 inline 1줄 요약 | RLS 코드 패턴은 conventions.md, 테이블별 적용은 db-schema.md (둘 다 primary — 다른 차원) |
| §3.4 시드 데이터 전략 | 440–450 | **db-schema.md** §5 | — | 그대로 |
| §Phase 0a 본문 | 453–560 | **phase-0a.md** | — | 본문 + Phase 0a 마이그레이션 SQL inline + 사전 의존성 / pre-flight / DoD + drift checker 스크립트 추가 |
| §Phase 0b 본문 | 561–651 | **phase-0b.md** | — | 본문 + 테스트 인프라 셋업 (PLAN.md §5.9 부분 흡수) + DoD |
| §Phase 1 본문 | 652–841 | **phase-1.md** | — | 본문 + 0003–0008b SQL inline (SOURCE 마커) + 백필 §2.4 + 롤백 §8.5 + 관측 §9.5 + DoD |
| §Phase 2 본문 | 842–981 | **phase-2.md** | — | 본문 + 0009–0010 SQL inline + **§2.4 original_quantity backfill 절차** (Critic Issue 7) + DoD |
| §Phase 3 본문 | 982–1310 | **phase-3.md** | — | 본문 + 0011–0013 SQL inline + 시드 큐레이션 1–2일 절차 + DoD |
| §Phase 4 본문 | 1311–1531 | **phase-4.md** | — | 본문 + 0014–0015b SQL inline + DoD |
| §Phase 5 본문 | 1532–1599 | **phase-5.md** | — | 본문 + 0016 SQL inline + B마트 URL 검증 PoC + DoD |
| §Phase 6 본문 | 1600–1689 | **phase-6.md** | — | 본문 + 0017–0018 SQL inline + ROI 검증 게이트 + DoD |
| §5.1 에러 처리 | 1692–1697 | **conventions.md** §1 | 각 phase 파일 §4 헤더에 1줄 요약 inline | Result<T, string> 룰 |
| §5.2 로딩 UI | 1698–1701 | **conventions.md** §2 | — | 그대로 |
| §5.3 디자인 토큰 강제 | 1702–1705 | **conventions.md** §3 | phase-0a.md §pre-flight (`(account)` 이동 항목) | 토큰 룰은 conventions.md |
| §5.4 다국어 | 1706–1708 | **conventions.md** §4 | — | out of scope 명시 |
| §5.5 인증 가드 | 1709–1719 | **conventions.md** §5 | phase-0a.md §UI 작업 (account 이동 task) | 룰 표 + (auth)/(app) 라우트 그룹 정책 |
| §5.6 Realtime | 1720–1722 | **conventions.md** §6 | — | 그대로 |
| §5.7 모바일 검증 절차 | 1723–1730 | **conventions.md** §7 | 각 phase 파일 §8 DoD inline (Phase 0a 제외 — Minor 8) | DB-only phase는 모바일 검증 면제, UI phase 모두 적용 |
| §5.8 git 커밋 전략 | 1732–1735 | **conventions.md** §8 | phase-0a (gitleaks 룰 파일) / phase-0b (lefthook 도입) | 일반 룰은 conventions, 실제 도입은 0a/0b task |
| §5.9 테스트 인프라 | 1737–1742 | **phase-0b.md** §테스트 인프라 | conventions.md §9 (1줄 요약 + 링크) | 풀 본문은 phase-0b의 핵심 deliverable이므로 거기가 primary |
| §5.10 Server Action vs Route Handler | 1744–1755 | **conventions.md** §10 | 모든 phase 파일 §0.5.3 cross-cutting 룰 발췌 (Architect 2.B) | DRY 깨도 자율성 우선 |
| §6 Architect 결정 사항 | 1758–1795 | **conventions.md** §부록 | 영향받는 phase 파일 §1.5 "Architect 결정 적용" inline (Critic Issue 6) | 6.1 pg_trgm → phase-1 + db-schema / 6.2 트리거 → phase-0a + db-schema / 6.3 매칭 → phase-3 + db-schema / 6.4 supabase 위치 → phase-0a + db-schema / 6.5 OCR → phase-6 |
| §7 Out of Scope | 1796–1812 | **PLAN.md (축소판)** | — | 전역 적용 |
| §부록 A 의존성 그래프 | 1813–1831 | **PLAN.md (축소판)** | README.md (ralph 호출 순서 가이드만 — Minor 2) | 그래프 본문은 PLAN.md만, README는 호출 가이드만 |
| §부록 B 마이그레이션 일람 | 1833–1857 | **db-schema.md** §6 | — | 그대로 (전체 SSoT view, primary는 migrations/*.sql) |
| §부록 C 운영 원칙 | 1860–1869 | **conventions.md** §11 운영 원칙 | 각 phase 파일 §8 DoD release tag 항목 | 그대로 |
| **(신규) TS↔SQL 동치성 상수** | — | **conventions.md** §단일 출처 상수 (신설 — Minor 5) | phase-1/2/3 §0.5.3 inline 발췌 + `apps/web/src/shared/lib/scoring-constants.ts` / `dday-thresholds.ts` | TS 상수와 SQL 함수 분기값은 conventions.md가 SSoT. 코드 파일은 그 값을 import. SQL은 마이그레이션에 박지만 SOURCE 마커로 conventions.md 표 참조 |
| **(신규) 마이그레이션 번호 충돌 회피 룰** | — | **db-schema.md** §1 또는 **conventions.md** §부록 (Architect 3.B) | — | 4자리 zero-padded 전역 순차 / alpha suffix / `supabase migration new` CLI 금지 |

---

## 3. 각 Phase 파일 골격 — 자율 실행 가능 구조 (D5)

모든 `docs/plans/phase-*.md` 는 다음 **11개 필수 섹션 + 2개 선택 섹션**을 갖는다 (Architect 2.D — §0.5 신설로 +1). ralph 가 이 파일 하나만 보고 phase 를 끝낼 수 있어야 함.

### 필수 섹션 (모든 phase)

```markdown
# Phase {N} — {제목} ({기간})

> ralph 실행 단위. 본 파일 + 참조: docs/plans/db-schema.md, docs/plans/conventions.md, docs/PRD.md

## 0. 사전 의존성 (Prerequisites)
- 선행 phase: [Phase X 완료 — git tag `vX.Y.Z` 존재]
- 환경 변수: [본 phase 에서 사용하는 .env.local 키만 — 값 형식 예시 포함] (Minor 7)
- 외부 키 / 서비스: [API 키, Vercel env, Supabase 프로젝트 등]
- 도구 체크: [필요한 CLI 버전 — `pnpm --version`, `psql --version` 등]
- [ ] **마이그레이션 번호 충돌 확인** (Architect 3.F): `apps/web/supabase/migrations/` 마지막 번호 확인. 본 phase 시작 번호 미만이어야 함.

## 0.5 참조 자산 미리보기 (cross-phase dependencies) — Architect 2.B
> 본 phase 작업에 필요한 타 phase 자산을 inline 발췌. 풀 본문은 db-schema.md / conventions.md.
> phase별 길이 차이: Phase 0a/0b/1은 짧음 ("없음" 가능). Phase 4/5/6은 김.

### 0.5.1 인용 테이블 (컬럼 시그니처만)
| 테이블 | 정의 phase | 사용 컬럼 | 풀 본문 |
|---|---|---|---|
| recipe_master | Phase 3 | id, name, cook_minutes, difficulty, servings | db-schema.md §3.4 |
| ... | ... | ... | ... |

### 0.5.2 인용 RPC/함수 (시그니처 + returns만, 30줄 이내 발췌, SOURCE 마커 X — Architect 1.E)
```sql
-- 발췌. 전체: db-schema.md §3.4 또는 apps/web/supabase/migrations/0011_*.sql
recommend_recipes(p_user uuid, p_min_score real, p_limit int)
returns table ( ... )
```

### 0.5.3 영향받는 cross-cutting 룰 (conventions.md 발췌)
- §1 Result<T, string> 에러 처리 — 모든 mutation 반환 타입
- §5 인증 가드 — auth.uid() 검증 필수
- §10 Server Action vs Route Handler — 본 phase는 [...] 패턴 사용
- §단일 출처 상수 — 본 phase 가 import 하는 상수: scoring-constants.ts / dday-thresholds.ts (Minor 5)

## 1. Pre-flight 검증 (30분 ~ 1일)
- [ ] [PoC 항목 1: pg_trgm 한국어 동작 확인 / B마트 URL 응답 확인 등]
- [ ] [회피 결정 게이트: 실패 시 plan 변경 트리거]
- [ ] 검증 통과 시 본 phase 진행. 실패 시 STOP + 사용자 보고.

## 1.5 Architect 결정 적용 (해당 phase 영향) — Critic Issue 6
> 박스 그대로 복붙 X. PLAN.md §6.N 인용 + 결론 한 줄.

- 권고 6.X (PLAN.md §6.X 인용): [결론 한 줄 — 예: "ingredient_master.name_normalized에 GIN(name_normalized gin_trgm_ops) 인덱스 추가"]
- 권고 6.Y: [결론 한 줄]
- (해당 권고 없음 시) "본 phase 영향 없음"

## 2. DB 마이그레이션 작업
> SSoT 우선순위 (Architect 1.A): `apps/web/supabase/migrations/0NNN_*.sql` (1차) → db-schema.md §3 / 본 §2.2 (2차 view)
> 마이그레이션 번호 충돌 회피: db-schema.md §1 표 참조 (Architect 3.B)

### 2.1 추가/변경 마이그레이션 파일 목록
| 파일명 | 내용 | 의존성 |
|---|---|---|
| `0NNN_xxx.sql` | ... | ... |

### 2.2 SQL 본문 (inline — SOURCE 마커 필수, Architect 1.C)
<!-- SOURCE: apps/web/supabase/migrations/0NNN_xxx.sql -->
<!-- SSoT: docs/plans/db-schema.md §3.N -->
```sql
-- 0NNN_xxx.sql 전문 (자기 phase 신규 마이그레이션은 전문 inline)
...
```

### 2.3 마이그레이션 적용 절차 (Architect 1.F — db:* 스크립트 6개 정정)
1. **파일 생성**: `apps/web/supabase/migrations/0NNN_<snake_name>.sql` 직접 생성. **`supabase migration new` CLI 사용 금지** (timestamp prefix 자동 부여 → 4자리 형식과 충돌, Architect 3.D)
2. **로컬 검증**: `pnpm web db:reset` (모든 마이그레이션 재실행) — 또는 `pnpm web db:start` 후 새 마이그레이션만 적용
3. **타입 갱신**: `pnpm web db:types` — `apps/web/src/shared/api/supabase/types.ts` 재생성 + 커밋
4. **drift 확인**: `pnpm web db:check-drift` — phase 파일 §2.2 SOURCE 마커 블록과 migrations/*.sql byte 일치 검증 (Architect 1.B)
5. **원격 적용**: `pnpm web db:push` (수동, 1인 작업자 운영 — PLAN.md §부록 C)
6. **변경 검증**: [psql 쿼리 / RLS 통합 테스트]

### 2.4 데이터 백필 / 마이그레이션 데이터 처리 (해당 phase만) — Critic Issue 7
> 해당 phase에서 데이터 변환/백필이 필요한 경우만 작성. 없으면 "해당 없음".
> 예) Phase 2 — `user_ingredients.original_quantity` 컬럼 추가 후 기존 row의 quantity 값을 original_quantity 로 백필하는 1회성 SQL.

```sql
-- 백필 예시 (Phase 2)
update user_ingredients
set original_quantity = quantity
where original_quantity is null;
```

- 백필 절차: [별도 마이그레이션 파일 / 또는 같은 파일 내 IF NOT EXISTS 가드]
- 검증: `select count(*) from user_ingredients where original_quantity is null;` → 0 확인

## 3. UI 작업 (페이지 / 컴포넌트)
> FSD 레이어: `apps/web/src/{app|widgets|features|entities|shared}/...`

### 3.1 만들 라우트 (App Router)
- `apps/web/src/app/(app)/<route>/page.tsx` — RSC, 데이터 fetch + skeleton
- `apps/web/src/app/(app)/<route>/loading.tsx` — `<Skeleton>` Phase 0b primitive
- `apps/web/src/app/(app)/<route>/error.tsx` — fallback (Phase 0b 1개 + override)

### 3.2 만들 컴포넌트
| 경로 | 책임 | Props 시그니처 |
|---|---|---|
| `features/inventory/ui/IngredientForm.tsx` | 추가 폼 | `{ onSubmit, defaultValues? }` |
| ... | ... | ... |

### 3.3 디자인 토큰 (PLAN.md §5.3 — conventions §3 inline 발췌)
- `text-heading-*`, `text-body-*-*`, `rounded-*` 만 사용
- 임의 값 `text-[14px]` 사용 금지

## 4. 로직 작업 (Actions / Hooks / Stores / Route Handlers)
> Server Action vs Route Handler 룰 (conventions §10 inline 발췌):
| 패턴 | 선택 |
|---|---|
| 폼 제출 / 도메인 mutation | Server Action |
| 외부 API proxy (key 보호) | Route Handler |
| RSC RPC fetch | RSC 직접 호출 |
| 캐시 write (RLS bypass) | Route Handler + admin client |

### 4.1 Server Actions
- `features/inventory/api/actions.ts` — `addIngredient(input)`, `updateIngredient(id, input)`, ...
- 반환 타입: `Result<T, string>` (한국어 에러 메시지)

### 4.2 Route Handlers
- `app/api/.../route.ts` — 시그니처 + admin client 사용 여부

### 4.3 Hooks / Stores (TanStack Query / Zustand)
- `features/inventory/model/useIngredients.ts` — `useQuery({ queryKey, queryFn })`
- ...

## 5. 외부 API 연동 (해당 phase만)
- [YouTube Data API / B마트 / 바코드 / OCR 등 — phase 별 다름]
- 키 관리: `.env.local` + Vercel env (PLAN.md §2.3)
- 캐싱 전략: Route Handler + `youtube_cache` / `barcode_cache` (해당 시)

## 6. 테스트 작업
> 인프라: Phase 0b 셋업 완료 가정 (Vitest + Playwright + Supabase local CLI)

- 단위: `*.test.ts` — Server Action 로직 / RPC 변환
- 통합: Supabase local + RLS 시나리오
- E2E: Playwright — 핵심 happy path 1–2개

## 7. Acceptance 기준 (verifiable)
- [ ] [기능 1: 사용자가 X 할 수 있다 — 어떤 페이지 / 어떤 버튼 / 어떤 결과]
- [ ] [기능 2: ...]
- [ ] DB 마이그레이션 0NNN ~ 0MMM 모두 `pnpm web db:reset` 통과 (로컬) + `pnpm web db:push` 통과 (원격) — Architect 1.F db:* 6개 정정
- [ ] `pnpm web typecheck` 0 error
- [ ] `pnpm web lint` 0 error
- [ ] `pnpm web db:check-drift` 0 drift (Architect 1.B)
- [ ] 단위 테스트 모두 통과
- [ ] E2E happy path 통과

## 8. Definition of Done (phase 종료 조건)
- [ ] §7 Acceptance 모두 통과
- [ ] PRD.md §3 로드맵 체크박스 업데이트
- [ ] `docs/CHANGELOG.md` 항목 추가 (phase 결정 / PoC 결과 포함)
- [ ] `gitleaks detect` 통과
- [ ] **`pnpm web db:check-drift` 통과** (Architect 1.D — phase 파일 §2.2 SQL 블록과 migrations/*.sql byte 일치)
- [ ] 모바일 웹뷰 스모크 테스트 (Vercel preview → eas build preview Android → 안드로이드 sideload — conventions §7) — Phase 0a (DB-only) 제외, 그 외 모든 phase 적용 (Minor 8)
- [ ] git tag `v{X.Y.Z}` 부여 (PLAN.md §부록 C — 0a=v0.0.1, 0b=v0.0.2, 1=v0.1.0, 2=v0.2.0, 3=v0.3.0 ...)
- [ ] Architect 검증 (ralph 프로토콜 — 별도 호출)

## 8.5 롤백 절차 — Critic Issue 7
> 본 phase가 prod에 부분 적용된 상태에서 문제 발견 시 되돌리는 방법.

### 8.5.1 마이그레이션 롤백
- **이미 적용된 마이그레이션 정정 금지** (Architect 1.A): `migrations/0NNN_*.sql` 직접 수정 X
- 정정 방식: 새 `0MMM_fix_<원파일>.sql` 작성 (immutable). DROP / ALTER 명시적으로 작성

### 8.5.2 코드 롤백
- 직전 git tag 로 리버트: `git revert <commit-range>` 또는 `git reset --hard v{이전tag}` (1인 작업자 한정)
- Vercel: 이전 preview/production deployment 로 promote (대시보드)

### 8.5.3 데이터 복구 (백필이 있는 phase만)
- 백필 SQL은 idempotent로 작성 (이미 §2.4 권장)
- 복구 불가 케이스 (예: 컬럼 drop): Supabase Dashboard PITR (Point-In-Time Recovery — pro plan만, MVP에서는 N/A 명시)

## 9. 위험 / 완화
| 위험 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| [Postgres 버전 미스매치] | 중 | 고 | Pre-flight §1 확인 |
| [B마트 URL 변경] | 저 | 중 | Phase 5 시작 시 PoC, 변경 시 deeplink off |
| [마이그레이션 번호 충돌] | 저 | 중 | §0 사전 의존성 체크박스 + db:check-drift |
| ... | | | |

## 9.5 관측 / 로깅 (해당 phase만) — Critic Issue 7
> 본 phase에 추가되는 로깅 / 모니터링 항목. 풀 룰은 conventions.md §12 (관측). 성능 목표는 PRD.md 링크 1줄.

- 성능 목표: → PRD.md §성능 (RSC TTFB, 인터랙션 latency 등)
- 로깅 추가 항목:
  - Server Action 에러: `console.error` + Vercel logs (MVP, Sentry는 out of scope)
  - 외부 API 호출 실패율: [해당 phase가 외부 API 쓰는 경우만 — 예: YouTube 429 / B마트 4xx]
- 메트릭 (해당 시): [Supabase function logs / RLS deny 카운트 등]
```

### 선택 섹션 (해당 시)

```markdown
## 10. 일별 작업 분배 (1주 → 7일)
- Day 1 (월): DB 마이그레이션 + 시드
- Day 2 (화): RSC 라우트 골격 + skeleton
- Day 3 (수): Server Action 로직 + 단위 테스트
- ...

## 11. 모바일 통합 (해당 phase만)
- WebView deeplink 추가 항목
- EAS preview 빌드 후 검증할 시나리오
```

---

## 4. 마스터 `docs/PLAN.md` 신규 골격 (D2 — 축소판)

```markdown
# 스마트 냉장고 & 레시피 매니저 — 마스터 로드맵

> 이 문서는 **단일 진입점**. 본문은 phase 파일에 있음.
> 분할 전략: docs/plans/PARTITION_PLAN.md 참조.

## 1. Executive Summary
[기존 §1 그대로]

## 2. 시스템 아키텍처 개요
[기존 §2 그대로 — 데이터 흐름 / 외부 API 결정 행렬 / 환경 변수]

## 3. Phase 진행 가이드 (링크만 — 진행 상태표는 docs/plans/README.md 단일 출처, Minor 1)

| Phase | 파일 | 기간 | git tag |
|---|---|---|---|
| 0a | [phase-0a.md](./plans/phase-0a.md) | 2–3일 | v0.0.1 |
| 0b | [phase-0b.md](./plans/phase-0b.md) | 3–4일 | v0.0.2 |
| 1  | [phase-1.md](./plans/phase-1.md)   | 1주    | v0.1.0 |
| 2  | [phase-2.md](./plans/phase-2.md)   | 1–1.5주| v0.2.0 |
| 3  | [phase-3.md](./plans/phase-3.md)   | 1.5–2주| v0.3.0 |
| 4  | [phase-4.md](./plans/phase-4.md)   | 1주    | v0.4.0 |
| 5  | [phase-5.md](./plans/phase-5.md)   | 1주    | v0.5.0 |
| 6  | [phase-6.md](./plans/phase-6.md)   | 2주    | v0.6.0 |

> 상태(☐/☑/진행중)는 [README.md](./plans/README.md) 진행 상태표 참조 (단일 출처 — Minor 1)

## 4. 의존성 그래프 (단일 출처 — Minor 2)
[기존 §부록 A 그대로 — 본문은 PLAN.md만, README.md 는 ralph 호출 순서 가이드만]

## 5. 공유 자산
- DB SSoT view: [db-schema.md](./plans/db-schema.md) (primary는 `apps/web/supabase/migrations/*.sql`)
- Cross-cutting 결정 + 단일 출처 상수: [conventions.md](./plans/conventions.md)
- PRD: [PRD.md](./PRD.md)

## 6. Out of Scope
[기존 §7 그대로]

## 7. 환경 변수 (전역 정의 — Minor 7)
[기존 §2 env vars 그대로 — phase 파일 §0은 본 phase 에서 쓰는 키만 발췌]

## 8. 진행 시 ralph 호출 가이드
- 각 phase 시작 시: `/oh-my-claudecode:ralph docs/plans/phase-{N}.md`
- 대화/iteration: docs/plans/README.md 참조
```

**예상 라인 수**: ~250줄 (1872 → 86% 축소).

---

## 5. `docs/plans/db-schema.md` 골격 (D3 — DB SSoT view)

```markdown
# DB 스키마 마스터 (SSoT view)

> **SSoT 우선순위** (Architect 1.A): `apps/web/supabase/migrations/*.sql` (1차) → 본 문서 (2차 통합 view) → phase-N.md §2.2 (3차 phase scope view)
> 변경 절차: migrations/*.sql 수정 → 본 문서 §3 동기화 → phase-N.md §2.2 동기화 → `pnpm web db:check-drift` 통과
> 모든 phase 파일 §2.2 SQL 블록은 SOURCE 마커 필수 (Architect 1.C). drift checker가 byte-for-byte 검증.

## SSoT 우선순위 표 (Architect 1.A)

| 변경 종류 | 1차 SSoT (먼저 수정) | 2차 동기화 |
|---|---|---|
| 새 마이그레이션 추가 | `apps/web/supabase/migrations/*.sql` | (a) db-schema.md §3 (b) phase-N.md §2.2 |
| 기존 마이그레이션 수정 (개발 중, 미적용) | 동일 | 동일 |
| 적용된 마이그레이션 정정 | 새 `0NNNa_fix_*.sql` (immutable) | 동일 |
| RLS 패턴 룰 변경 | conventions.md §RLS | db-schema.md §4 |
| RPC/함수 시그니처 변경 | migrations/*.sql | (a) types.ts (db:types) (b) phase-N.md §2.2 (c) db-schema.md §3 |

**핵심 룰**: `migrations/*.sql`이 **유일한 SSoT**. db-schema.md / phase-N.md는 모두 derivative (1 source + 2 view).

## 1. Supabase 디렉토리 위치 + db:* 스크립트 + Vercel 흐름
[PLAN.md §3.0 — db:* 스크립트 6개 정정 적용 (Architect 1.F)]

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

### 마이그레이션 번호 충돌 회피 룰 (Architect 3.A–3.F)

- **번호 형식**: 4자리 zero-padded 전역 순차 (`0001` ~ `0018`). PLAN.md §부록 B 형식 유지
- **alpha suffix 허용**: `0008b`, `0015a/b` (같은 phase 다중 RPC 분리 / 적용 후 정정 등)
- **`supabase migration new` CLI 사용 금지** (Architect 3.D — timestamp prefix 자동 부여 → 4자리 형식과 충돌). 대신 `apps/web/supabase/migrations/0NNN_<snake_name>.sql` 직접 생성

| 상황 | 다음 번호 결정 |
|---|---|
| 정상 진행 | 마지막 + 1 |
| 같은 phase 다중 RPC 분리 | 0NNNa, 0NNNb |
| 적용된 후 정정 | 새 0MMM_fix_*.sql (절대 수정 금지) |
| Phase 진행 중 추가 | 그 phase 마지막 다음 |
| ralph ↔ 사용자 동시 작업 | git stash → ralph 번호 +1 → stash pop |
| 다른 phase 번호 침범 | 다음 phase 시작 전이면 OK, 후면 0NNNb |

- **Supabase CLI 호환성** (Architect 3.C): `supabase db push` lexicographic 정렬 사용 — `0008 < 0008b < 0009` 보장
- **충돌 회피 체크**: 모든 phase 파일 §0 사전 의존성 체크박스에 "마지막 번호 확인" 항목 (Architect 3.F)

### `pnpm db:check-drift` 스크립트 (Architect 1.B — phase 0a deliverable)
- 파일: `apps/web/scripts/check-migration-drift.mjs` (~80줄 Node ESM)
- 입력: `migrations/*.sql` + `db-schema.md` + `phase-*.md`의 SOURCE 마커 있는 SQL 블록
- 알고리즘: 정규화 (whitespace collapse, trailing comment 제거) → byte-for-byte 비교
- 출력:
  - 성공: `✓ drift 없음` (exit 0)
  - 실패: file:line + diff (exit 1)
- 호출: `pnpm web db:check-drift` (모든 phase DoD에 포함, Architect 1.D)

## 2. 테이블 일람 (전체 ERD 텍스트 트리)
[PLAN.md §3.1]

## 3. 정밀 스키마 (모든 마이그레이션 SQL 본문)
### 3.1 Phase 0a 마이그레이션 (0001 ~ 0002)
- `0001_init.sql` — extensions
- `0002_user_profiles.sql` — profiles + handle_new_user

### 3.2 Phase 1 마이그레이션 (0003 ~ 0008b)
- 0003 storage_locations
- 0004 ingredient_categories
- 0005 ingredient_master
- 0006 ingredient_master_seed
- 0007 user_ingredients
- 0008 user_default_storage_locations (handle_new_user OR REPLACE)
- 0008b search_ingredient_masters RPC

### 3.3 Phase 2 마이그레이션 (0009 ~ 0010)
...

### 3.4 Phase 3 마이그레이션 (0011 ~ 0013)
...

### 3.5 Phase 4 마이그레이션 (0014 ~ 0015b)
...

### 3.6 Phase 5 마이그레이션 (0016)
...

### 3.7 Phase 6 마이그레이션 (0017 ~ 0018)
...

## 4. RLS 정책 패턴 (테이블별 매핑)
[PLAN.md §3.3 — 패턴 풀 본문은 conventions.md §RLS, 본 문서는 테이블별 적용 매핑]

## 5. 시드 데이터 전략
[PLAN.md §3.4]

## 6. 마이그레이션 일람표 (전체 SSoT)
[PLAN.md §부록 B]

## 7. Architect 결정 영향 (DB 차원만)
- 6.1 pg_trgm: 0005 인덱스 + 0008b RPC
- 6.2 handle_new_user(): 0002 + 0008
- 6.3 recommend_recipes(): 0011
- 6.4 supabase 위치: 본 문서 §1
- (6.5 OCR 은 DB 영향 없음 — phase-6.md inline)
```

**phase 파일과의 관계** (Architect 1.A–1.E 갱신):
- phase 파일 §2.2는 자기 phase 신규 마이그레이션 SQL 전문 inline + **SOURCE 마커 필수**
- phase 파일 §0.5는 타 phase 마이그레이션 인용 시 30줄 이내 발췌 + 마커 X + 풀 본문 링크
- 1차 SSoT는 `apps/web/supabase/migrations/*.sql`. db-schema.md / phase 파일은 모두 derivative view
- 정합성 검증: `pnpm web db:check-drift` 자동 검증 (sed/diff PR 수동 검토 대체)

---

## 6. `docs/plans/conventions.md` 골격 (D4 — Cross-cutting)

```markdown
# Cross-cutting Conventions

> 모든 phase 에 적용. 각 phase 파일에 핵심 룰만 inline 발췌(DRY 깨도 자율성 우선). 변경 시 본 문서가 SSoT.

## 1. 에러 처리 — Result<T, string>
## 2. 로딩 UI — Skeleton + inline spinner
## 3. 디자인 토큰 강제 — text-heading-*, text-body-*, rounded-*
## 4. 다국어 — KO only (out of scope)
## 5. 인증 가드 — proxy 갱신 / (app) layout redirect / 페이지 X
## 6. Realtime — 도입 X (polling)
## 7. 모바일 검증 — phase 종료 시 EAS preview Android sideload (Phase 0a 제외, Minor 8)
## 8. git 커밋 전략 — gitleaks + lefthook
## 9. 테스트 인프라 — phase-0b.md 가 풀 본문, 본 문서는 1줄 요약 + 링크
## 10. Server Action vs Route Handler 결정 룰
## 11. 1인 작업자 운영 원칙 (PLAN.md §부록 C)
## 12. 관측 / 로깅 (Critic Issue 7) — MVP 룰: console.error + Vercel logs / Sentry out of scope / 성능 목표는 PRD.md 링크

## 단일 출처 상수 (TS↔SQL 동치성 — Minor 5)

> TS 상수와 SQL 함수 분기값은 본 섹션이 SSoT. `apps/web/src/shared/lib/scoring-constants.ts` / `dday-thresholds.ts` 는 본 표를 import. SQL 마이그레이션은 SOURCE 마커로 본 표 참조.

| 상수 | 값 | TS 파일 | SQL 사용처 |
|---|---|---|---|
| `EXPIRING_SOON_DAYS` | 3 | `shared/lib/dday-thresholds.ts` | (없음 — UI only) |
| `EXPIRED_PENALTY` | 0.5 | `shared/lib/scoring-constants.ts` | `recommend_recipes()` 0011 |
| `MATCH_BOOST_THRESHOLD` | 0.7 | `shared/lib/scoring-constants.ts` | `recommend_recipes()` 0011 |
| ... | ... | ... | ... |

(실제 표는 분할 작업 시 PLAN.md 본문 / 코드 commit 에서 채워 넣음)

## 부록. Architect 결정 사항 (5개 — phase 파일별 영향 매핑 포함)

> phase 파일은 본 부록을 §1.5 "Architect 결정 적용" 에서 결론 한 줄씩 인용 (Critic Issue 6).
```

---

## 7. `docs/plans/README.md` 골격 (가이드)

```markdown
# docs/plans — Phase 실행 가이드

## ralph 호출
- Phase 시작: `/oh-my-claudecode:ralph docs/plans/phase-{N}.md`
- ralph 는 본 phase 파일 + db-schema.md + conventions.md + PRD.md 만 보고 자율 실행 (정량 기준 — Architect 2.A)
- Architect 검증 (ralph 프로토콜) 통과 시 phase 종료

## ralph 호출 시 권장 순서 (Minor 2 — 의존성 그래프 본문은 PLAN.md §4)
- 0a → 0b → 1 → 2 → 3 → 4 → 5 → 6
- 의존성 본문은 [PLAN.md §4 의존성 그래프](../PLAN.md#4-의존성-그래프) 참조 (단일 출처)

## phase 파일 진행 상태 (단일 출처 — Minor 1)
| Phase | 파일 | 상태 | 마지막 업데이트 | git tag |
|---|---|---|---|---|
| 0a | phase-0a.md | ☐ pending | - | - (목표 v0.0.1) |
| 0b | phase-0b.md | ☐ pending | - | - (목표 v0.0.2) |
| 1  | phase-1.md  | ☐ pending | - | - (목표 v0.1.0) |
| 2  | phase-2.md  | ☐ pending | - | - (목표 v0.2.0) |
| 3  | phase-3.md  | ☐ pending | - | - (목표 v0.3.0) |
| 4  | phase-4.md  | ☐ pending | - | - (목표 v0.4.0) |
| 5  | phase-5.md  | ☐ pending | - | - (목표 v0.5.0) |
| 6  | phase-6.md  | ☐ pending | - | - (목표 v0.6.0) |

> **PLAN.md §3 Phase 진행 가이드는 링크만**. 상태 컬럼은 본 표 한 곳에서만 갱신 (Minor 1 — 진행 상태표 중복 제거)

## phase 별 주의사항 요약
- Phase 0a: Postgres 버전 호환성 pre-flight 필수 + drift checker 스크립트 deliverable
- Phase 0b: 테스트 인프라 셋업 — 향후 모든 phase 의존
- Phase 5: B마트 URL 검증 PoC — 실패 시 deeplink off 하고 진행
- Phase 6: ROI 검증 게이트 — 통과 못 하면 skip

## 변경 관리 (SSoT 우선순위 — Architect 1.A)
- **DB 변경**: `apps/web/supabase/migrations/*.sql` (1차 SSoT) → db-schema.md §3 동기화 → phase-N.md §2.2 동기화 → `pnpm web db:check-drift` 통과
- **RLS 패턴 변경**: conventions.md §RLS (1차) → db-schema.md §4 매핑 동기화
- **RPC 시그니처 변경**: migrations/*.sql (1차) → types.ts (db:types) → phase-N.md §2.2 → db-schema.md §3
- **Cross-cutting 변경**: conventions.md (1차) → phase 파일 §0.5.3 inline 요약 동기화
- **단일 출처 상수 변경**: conventions.md §단일 출처 상수 표 (1차) → TS 파일 (`scoring-constants.ts` / `dday-thresholds.ts`) → SQL 마이그레이션 (SOURCE 마커로 표 참조)
- 동기화 검증: phase DoD에서 `pnpm web db:check-drift` 통과 필수
```

---

## 8. 분할 작업 절차 (Critic OKAY 후 별도 단계)

본 명세서는 **분할 작업을 직접 수행하지 않는다**. Critic 검토 후 다음 작업으로 이전:

### 8.0 분할 전 baseline 보존 (Critic Issue 5)
0. `mkdir -p docs/plans/_archive`
0a. `cp docs/PLAN.md docs/plans/_archive/PLAN-pre-partition-2026-04-29.md` — 정보 손실 검증용 immutable baseline. 분할 commit 직전에만 수행

### 8.1 ~ 8.7 신규 파일 작성 + 기존 PLAN.md 축소
1. `docs/plans/db-schema.md` 작성 — PLAN.md §3 / §부록 B 통합 + SSoT 우선순위 표 + 마이그레이션 번호 충돌 회피 룰
2. `docs/plans/conventions.md` 작성 — PLAN.md §5 / §부록 C / §6 통합 + §12 관측 + 단일 출처 상수 표 (Minor 5)
3. `apps/web/scripts/check-migration-drift.mjs` 작성 — Architect 1.B 스펙대로 (~80줄 ESM)
4. `apps/web/package.json` db:* 스크립트 6개로 정정 (Architect 1.F)
5. `docs/plans/phase-0a.md` ~ `phase-6.md` 작성 — 각 phase 본문 + §3 골격(11 필수 + 2 선택) + SOURCE 마커 + §1.5 Architect 결정 적용 + §2.4 백필 + §8.5 롤백 + §9.5 관측
6. `docs/plans/README.md` 작성 — 진행 상태표 단일 출처 + ralph 호출 가이드
7. `docs/PLAN.md` 축소 — §4 골격으로 교체 (진행 상태표는 README 링크만)

### 8.8 정합성 검증 (Critic Issue 5 — 정보 손실 검증)
8. 검증 절차:
   a. **라인 수 합계**: `wc -l docs/plans/{phase-*,db-schema,conventions,README}.md docs/PLAN.md` 합계가 baseline (`_archive/PLAN-pre-partition-2026-04-29.md` ~1872줄) ±10% 이내 (의도적 압축이지만 손실 확인)
   b. **§-마커 grep**: baseline 의 모든 `## ` 섹션 헤더가 신규 파일 어딘가에 존재하는지 grep 으로 검증 (자동 누락 감지)
   c. **drift checker 통과**: `pnpm web db:check-drift` exit 0
   d. **로컬 DB 적용**: `pnpm web db:reset` 통과 (모든 마이그레이션 재실행)
   e. **타입 체크**: `pnpm web typecheck` 0 error
   f. **링크 깨짐**: 마크다운 링크 모두 유효 (수동 spot check 또는 markdown-link-check)

### 8.9 자율성 dry-run 검증 (Architect 2.C — 분할 완료 후)
9. phase-1.md, phase-3.md, phase-4.md 3개 dry-run:
   a. ralph 호출 (실제 실행 X, 첫 5분만 — kickoff phase 만 관찰)
   b. ralph가 Read한 파일 목록 추출
   c. 허용 파일: phase-N.md, db-schema.md, conventions.md, PRD.md, AGENTS.md, package.json
   d. 그 외 Read 발생 시 → 해당 phase 파일 §0.5 "참조 자산 미리보기" 에 추가
   e. 6번째 파일 Read 0 될 때까지 반복 (max 3회)

### 8.10 자율성 정량 통과 조건 (Architect 2.C)
10. 통과 기준:
    - phase-1.md: 추가 Read ≤ 1
    - phase-3.md: 추가 Read ≤ 2
    - phase-4.md: 추가 Read ≤ 3
    - 평균 < 2 / phase
11. git 커밋: `docs(plans): partition PLAN.md into phase-scoped ralph-executable files`
12. 본 PARTITION_PLAN.md → `docs/plans/_archive/PARTITION_PLAN-{date}.md` 로 이동 (Minor 3, 6 — 재분할 시 부활)

---

## 9. 의사결정 근거 — 트레이드오프 명시

### D1 (분할 단위 = A)
- **B (4개 그룹) 각하 이유**: ralph 1회 실행 단위가 1–2주 phase 두 개를 합치면 자율성 떨어지고 중간 실패 시 재시작 비용 큼. PLAN.md §부록 C "PR 단위는 슬라이스 또는 마이그레이션" 원칙과도 충돌
- **C (Hybrid cross-reference) 각하 이유**: ralph 가 cross-file 따라가야 하면 자율성이 약화됨. ralph 의 가치는 "한 파일로 끝내기"
- **A 채택**: ralph 1회 = phase 1개. 1:1. 명료. 단점(파일 수 많음 / 공통 context 위치)은 D3+D4 의 하이브리드로 해결

### D2 (마스터 = a 축소)
- **b (그대로 두고 추가) 각하**: 중복은 drift 의 근원. SSoT 깨짐
- **c (삭제) 각하**: 외부 링크 / 북마크 / 기존 PR 참조 깨짐. 단일 진입점 가치 손실
- **a 축소 채택**: 동일 경로 유지 + 본문은 위임. 가장 안전한 마이그레이션 경로

### D3 (DB SSoT = inline + 통합본 하이브리드)
- **a (inline only) 각하**: 같은 SQL 이 여러 phase 파일에 흩어지면 cross-reference (예: Phase 4 가 Phase 1 의 user_ingredients 컬럼 인용) 시 어디서 진실을 봐야 할지 모름
- **b (통합본 only) 각하**: ralph 가 phase 파일 + db-schema.md 두 개를 동시 봐야 함 → 자율성 약화
- **c (inline 풀패키지) 각하**: 각 phase 파일이 너무 비대해짐 (다른 phase 의 인용 테이블까지)
- **하이브리드 채택**: phase 파일은 자기 phase 마이그레이션 SQL 만 inline (자율 실행 가능), db-schema.md 는 cross-reference 시 진실원. 발췌본은 SSoT 가 아님 — 변경 시 db-schema.md → phase 파일 동기화 절차 명문화

### D4 (Cross-cutting = 핵심만 inline + 통합본 하이브리드)
- D3 와 같은 논리. 매 phase 가 봐야 하는 핵심(Server Action 룰, RLS 패턴, 인증 가드)은 inline 발췌. 풀 본문은 conventions.md

### D5 (자율 실행 = 11+2 섹션, iteration 2에서 +1)
- ralph 의 핵심 가치 = "한 파일 보고 끝내기". 사전 의존성 / **참조 자산 미리보기 (§0.5)** / pre-flight / Architect 결정 적용 / DB / UI / 로직 / 외부 API / 테스트 / Acceptance / DoD — 이 11개는 모두 자율 실행에 필수
- 일별 분배 / 모바일 통합은 phase 마다 다름 → 선택
- 정량 검증: dry-run 시뮬레이션 (§8.9, §8.10) — phase-1 추가 Read ≤ 1, phase-3 ≤ 2, phase-4 ≤ 3, 평균 < 2

---

## 10. Critic 검토 요청 사항 (iteration 2 — 적용 결과 요약)

### 10.1 iteration 1 → iteration 2 변경 매핑

| 이전 우려 / Critic feedback | 적용 위치 | 상태 |
|---|---|---|
| Issue 1 (SSoT 우선순위 + drift checker) | §2 매핑 표 + §3 §2.2 SOURCE 마커 + §3 §2.3 db:check-drift + §5 db-schema.md SSoT 표 + §5 drift checker 스펙 | 적용 |
| Issue 2 (Cross-cutting drift vs 자율성) | §3 §0.5 "참조 자산 미리보기" 신설 + §0.5.3 cross-cutting 룰 inline 발췌 | 적용 |
| Issue 3 (누락 섹션 — 백필/롤백/관측) | §3 §2.4 백필 + §3 §8.5 롤백 + §3 §9.5 관측 | 적용 |
| Issue 5 (정보 손실 검증) | §1 `_archive/` + §8 §8.0 baseline 보존 + §8.8 grep 기반 §-마커 검증 | 적용 |
| Issue 6 (Architect 자문 결과 inline 방식) | §3 §1.5 "Architect 결정 적용" 신설 (박스 복붙 X, 결론 한 줄만) | 적용 |
| Issue 7 — 위와 동일 (3,5,6 합집합) | 위와 같음 | 적용 |
| Architect Q1.A (SSoT 우선순위 표) | §5 db-schema.md 골격 상단 | 적용 |
| Architect Q1.B (drift checker 스크립트) | §5 db-schema.md 골격 + §8 §8.1 §3 deliverable | 적용 |
| Architect Q1.C (SOURCE 마커 형식) | §3 §2.2 inline 형식 | 적용 |
| Architect Q1.D (DoD 1줄 추가) | §3 §8 DoD `pnpm web db:check-drift` 통과 | 적용 |
| Architect Q1.E (인용 vs 발췌 룰) | §3 §0.5.2 30줄 발췌 + 마커 X 룰 명시 | 적용 |
| Architect Q1.F (db:* 스크립트 6개 정정) | §2 §3.0 행 + §5 db-schema.md §1 JSON 블록 | 적용 |
| Architect Q2.A (D5 표현 갱신) | §0 D5 row + §3 헤더 (10→11 필수) | 적용 |
| Architect Q2.B (§0.5 신설) | §3 §0.5 골격 (3 sub) | 적용 |
| Architect Q2.C (dry-run 시뮬레이션) | §8 §8.9, §8.10 | 적용 |
| Architect Q3.A (4자리 zero-padded 유지) | §5 db-schema.md §1 충돌 회피 룰 | 적용 |
| Architect Q3.B (충돌 회피 표) | §5 db-schema.md §1 표 | 적용 |
| Architect Q3.C (Supabase CLI 호환성) | §5 db-schema.md §1 | 적용 |
| Architect Q3.D (`supabase migration new` 금지) | §3 §2.3 1번 항목 + §5 db-schema.md §1 | 적용 |
| Architect Q3.F (ralph 충돌 회피) | §3 §0 사전 의존성 체크박스 | 적용 |
| Minor 1 (진행 상태표 단일 출처) | §4 PLAN.md 축소판 §3 (링크만) + §7 README.md 진행 상태표 (실 출처) | 적용 |
| Minor 2 (의존성 그래프 단일 출처) | §4 PLAN.md §4 본문 / §7 README.md 호출 가이드만 | 적용 |
| Minor 3, 6 (archive 처리 룰) | §1 디렉토리 + §8 §8.10 12번 항목 | 적용 |
| Minor 5 (TS↔SQL 동치성 상수) | §6 conventions.md "단일 출처 상수" 섹션 신설 | 적용 |
| Minor 7 (환경 변수 위치) | §2 §2 행 + §3 §0 사전 의존성 (해당 phase 키만) | 적용 |
| Minor 8 (모바일 검증 룰) | §3 §8 DoD (Phase 0a 제외 명시) | 적용 |
| Minor 9 (자율성 검증 루브릭) | §8 §8.9, §8.10 (Architect Q2.C 채택) | 적용 |

### 10.2 잔여 협의 항목 (iteration 2 → 3 가능 시점)

1. **Minor 4 — `PLAN_READY:` 마커 적절성**: 본 PARTITION_PLAN은 strategy spec 이지 구현 plan 이 아니므로 `PLAN_READY:` 의미가 모호. ralplan 메타에서 처리하므로 본 문서 본문 룰에는 영향 없음. **현 상태 유지** (마지막 줄 마커는 ralplan 자동화 호환성 위해 유지)
2. **§10.1 의 "적용" 항목 자체 검증**: Critic 이 각 항목의 위치/품질 spot check 권장
3. **분할 실제 작업 시간 평가** (이전 iteration 6번 문항): 1–2일 가정 유효. 단, drift checker 스크립트 작성 (~80줄) + dry-run 검증 (3 phase × 5분) 추가로 +0.5일 예상

---

PLAN_READY: docs/plans/PARTITION_PLAN.md
