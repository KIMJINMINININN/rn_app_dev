# 스마트 냉장고 매니저 — 분할된 실행 계획

> 본 디렉토리는 `docs/PLAN.md` 마스터 로드맵을 phase 단위로 분할한 ralph-자율 실행 자산.
> 마스터 진입점: `docs/PLAN.md` (Executive Summary + 의존성 그래프 + 본 디렉토리 링크)

---

## 1. 진행 상태표 (단일 출처 — 본 문서만 갱신)

| Phase | 이름 | 예상 기간 | 상태 | 시작 | 완료 | tag | 파일 |
|---|---|---|---|---|---|---|---|
| **0a** | DB 인프라 + Type Codegen + 보일러플레이트 정리 | 2-3일 | 미시작 | - | - | - | [phase-0a.md](./phase-0a.md) |
| **0b** | App Shell + Primitives + 테스트 인프라 | 3-4일 | 미시작 | - | - | - | [phase-0b.md](./phase-0b.md) |
| **1** ★ | 인벤토리 CRUD (MVP 단위) | 1주 | 미시작 | - | - | - | [phase-1.md](./phase-1.md) |
| **2** | 인벤토리 고도화 | 1-1.5주 | 미시작 | - | - | - | [phase-2.md](./phase-2.md) |
| **3** ★ | 레시피 + 단순 매칭 + YouTube (데모 MVP) | 1.5-2주 | 미시작 | - | - | - | [phase-3.md](./phase-3.md) |
| **4** | 요리 히스토리 + 듀얼 추천 | 1주 | 미시작 | - | - | - | [phase-4.md](./phase-4.md) |
| **5** | 장보기 브릿지 | 1주 | 미시작 | - | - | - | [phase-5.md](./phase-5.md) |
| **6** | 스마트 입력 (바코드 + OCR, ROI 검증) | 2주 | 미시작 | - | - | - | [phase-6.md](./phase-6.md) |

**상태 종류**: 미시작 / 진행 중 (Day N) / 완료 / 보류

★ = 출시 가능 마일스톤

---

## 2. ralph 호출 가이드

각 phase는 `/oh-my-claudecode:ralph` 한 번으로 자율 실행 가능.

### 2.1 호출 명령

```bash
/oh-my-claudecode:ralph

# 또는 슬래시 args 형태
/oh-my-claudecode:ralph docs/plans/phase-1.md
```

ralph 자율 루프는 phase 파일을 읽어서:
1. §0 사전 의존성 체크박스 자동 검증
2. §2 마이그레이션 + §3 UI + §4 로직 + §5 외부 API + §6 테스트 작업 순차/병렬 실행
3. §7 Acceptance 충족 확인
4. §8 DoD 통과 (typecheck / db:check-drift / test / 모바일 스모크)
5. Architect 검증 + 사용자 review

### 2.2 ralph가 읽어야 할 파일 (자율성 4 파일)

[Architect 권고 2.A]
- 본 `phase-N.md` (작업 출처)
- `db-schema.md` (cross-phase DB SSoT)
- `conventions.md` (cross-cutting 룰)
- `docs/PRD.md` (제품 요구사항 fallback)

추가로 필요한 자산은 phase 파일 §0.5에 미리 발췌됨.

### 2.3 진행 순서 (의존성 기반)

[부록 A 본문은 PLAN.md §부록 A 참조 — 본 README는 호출 가이드만]

```
0a → 0b → 1 ─┬─ 2 (권장, 의존 X)
              │
              └─ 3 ─┬─ 4
                    │
                    └─ 5 ─── 6
```

**권장 호출 순서**: 0a → 0b → 1 → 3 (병렬: 2) → 4 → 5 → 6
- Phase 2와 3은 Phase 1 후 병렬 진입 가능 (서로 독립)
- Phase 6은 Phase 5 또는 Phase 1 의존 (선택)

---

## 3. 디렉토리 구조

```
docs/
├── PLAN.md                          # 마스터 (~250줄, 축소판)
├── PRD.md                           # 제품 요구사항
└── plans/
    ├── README.md                    # 본 문서 (진행 상태표 + ralph 가이드)
    ├── conventions.md               # cross-cutting 룰 풀 본문 (SSoT)
    ├── db-schema.md                 # DB SSoT view
    ├── phase-0a.md                  # DB 인프라
    ├── phase-0b.md                  # App Shell
    ├── phase-1.md                   # 인벤토리 CRUD ★
    ├── phase-2.md                   # 인벤토리 고도화
    ├── phase-3.md                   # 레시피 ★
    ├── phase-4.md                   # 히스토리 + 듀얼
    ├── phase-5.md                   # 장보기 브릿지
    ├── phase-6.md                   # 스마트 입력 (ROI)
    └── _archive/
        └── PLAN-pre-partition-2026-04-29.md   # 분할 전 baseline (1872줄)
```

---

## 4. SSoT 원칙

- **마이그레이션 SSoT**: `apps/web/supabase/migrations/0NNN_*.sql` (1차 — 실행 출처)
- **DB 문서 SSoT**: `db-schema.md` (2차 view — 통합본)
- **Cross-cutting 룰 SSoT**: `conventions.md`
- **Phase 본문**: `phase-N.md` (작업 출처, derivative of db-schema + conventions)
- **마스터**: `PLAN.md` (TOC + Executive Summary + 링크)

drift 자동 검증: `pnpm web db:check-drift`

---

## 5. 변경 흐름

| 변경 종류 | 1차 SSoT 수정 | 2차 동기화 |
|---|---|---|
| 새 마이그레이션 | `migrations/*.sql` | db-schema.md §3 + phase-N.md §2.2 |
| RLS 패턴 룰 | `conventions.md` | db-schema.md §4 |
| Phase 진행 상태 | **본 README 표** | PLAN.md (필요시) |
| Cross-cutting 결정 | `conventions.md` | phase-N.md §0.5.3 (해당 phase) |

상세는 `db-schema.md §1` 참조.

---

## 6. 분할 작업 이력

- **2026-04-29**: PLAN.md (1872줄) → 12개 파일로 분할 (PARTITION_PLAN.md 합의 + Stage 1-6 ralph 자율 실행)
- baseline 보존: `_archive/PLAN-pre-partition-2026-04-29.md`
