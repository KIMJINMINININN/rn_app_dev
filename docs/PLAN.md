# 스마트 냉장고 매니저 — 실행 로드맵

> **본 문서**: 마스터 진입점. Executive Summary + Phase 의존성 그래프 + 분할된 실행 파일 링크.
> **본문 위임**: DB 스키마는 `docs/plans/db-schema.md`, cross-cutting 룰은 `docs/plans/conventions.md`, 각 Phase 본문은 `docs/plans/phase-{0a,0b,1,2,3,4,5,6}.md`
> **진행 상태표**: `docs/plans/README.md` (단일 출처)
> **분할 전 원본**: `docs/plans/_archive/PLAN-pre-partition-2026-04-29.md` (1872줄 baseline 보존)

---

## 1. Executive Summary

PRD `docs/PRD.md`의 5개 핵심 기능 (인벤토리 / OCR·바코드 입력 / 맞춤 레시피 / 히스토리·듀얼 추천 / 장보기 브릿지)을 **6개 phase + Phase 0(셋업) 2개로 분할**한 점진적 로드맵.

| Phase | 이름 | 기간 | MVP 가치 |
|---|---|---|---|
| **0a** | 기반 셋업 (DB 인프라 + Type Codegen + 보일러플레이트 정리) | 2-3일 | 도메인 코드 작성 시작 가능 |
| **0b** | App Shell + Primitives + 테스트 인프라 | 3-4일 | UI 작성 시작 가능 |
| **1** ★ | 인벤토리 CRUD (수동 입력) | 1주 | 식재료 추가/조회/삭제, D-Day — **출시 가능** |
| **2** | 인벤토리 고도화 (정렬·필터·이동·소진) | 1-1.5주 | 보관 장소 분리, 부분 소진, 만료 알림 |
| **3** ★ | 레시피 마스터 + 단순 매칭 + YouTube | 1.5-2주 | 시드 100선 + 보유 재료 매칭 + 영상 — **데모 MVP** |
| **4** | 요리 히스토리 + 듀얼 추천 | 1주 | 만든 요리 기록, 재료 클릭 → 과거/신규 병렬 |
| **5** | 장보기 브릿지 (부족 재료 + 커머스 deeplink) | 1주 | 부족 재료 자동 + 쿠팡/B마트/마켓컬리 |
| **6** | 스마트 입력 (바코드 + OCR, ROI 검증) | 2주 | 바코드 스캔, 영수증 OCR (ML Kit + Clova fallback) |

★ 출시 가능 마일스톤
- Phase 1까지 = 최소 출시 단위 (가입 → 식재료 추가 → 만료 추적)
- Phase 3까지 = **데모 MVP** (PRD 핵심 가치 "재료 보고 메뉴 정함" 충족)
- Phase 6 = ROI 검증 후 진입 (비용 게이트 $5/월)

---

## 2. 시스템 아키텍처 개요

### 2.1 데이터 흐름

```
[RN 모바일 앱]
    │ (WebView)
    │     ↓ webview-protocol 메시지 (auth, OCR, barcode)
    │     ↑
[Next.js 16 App Router (apps/web)]
    │     ├─ RSC (페이지 데이터, supabase 직접 RPC 호출)
    │     ├─ Server Actions (폼 mutation)
    │     ├─ Route Handlers (외부 API proxy: YouTube, OCR, 식약처)
    │     └─ proxy.ts (세션 쿠키 자동 갱신)
    │
    ↓ supabase-js (sb_publishable_*  키, RLS 적용)
    ↓ supabase-js (sb_secret_*  키, admin client, RLS bypass — Route Handler 내부만)
    │
[Supabase 무료 티어]
    ├─ Postgres (auth + public schema)
    ├─ Auth (이메일/비밀번호)
    └─ Storage (영수증 이미지, Phase 6)
```

### 2.2 외부 API 결정 행렬

| 영역 | 1순위 | Plan B | 비용 게이트 | Phase |
|---|---|---|---|---|
| YouTube 영상 | YouTube Data API v3 (10000 unit/일) | 임베드 비활성 | quota 초과 시 toast 안내 | 3 |
| 바코드 → 상품 | 식약처 OpenAPI (1000회/일) | 사용자 수동 | 한도 초과 시 manual fallback | 6 |
| OCR (모바일) | Google ML Kit (디바이스 내장, $0) | Naver Clova (서버) | $5/월. DAU × 영수증 × 30 ≥ 2000 시 fallback OFF | 6 |
| OCR (데스크탑) | Naver Clova OCR (~$4.5/월 @ 1500 호출) | 사용자 모바일 안내 | 동일 | 6 |
| 커머스 deeplink | 쿠팡/B마트/마켓컬리 검색 URL | env 토글 비활성 | Pre-flight 30분 검증 | 5 |

### 2.3 핵심 기술 결정

- **BE**: Next.js Route Handlers + Supabase. 별도 BE 서버 X (`docs/plans/conventions.md §10`)
- **FE 상태**: TanStack Query (서버) + Zustand (클라이언트 UI) (`conventions.md §17/§18`)
- **인증**: Supabase Auth (이메일/비밀번호) + RLS 사용자별 격리 (3 패턴 — `db-schema.md §4`)
- **모바일**: RN 웹뷰 wrapping + webview-protocol 메시지 envelope (`apps/mobile`)
- **디자인 토큰**: 자체 (gray/primary/green/red, --spacing 1px, semantic typography — `conventions.md §3`)

---

## 3. DB 스키마 마스터 → `docs/plans/db-schema.md`

본 PLAN은 마스터. DB SSoT view는 `db-schema.md`에 통합:
- §1 SSoT 우선순위 + 마이그레이션 번호 룰 (4자리 zero-padded + alpha suffix + 충돌 회피 6 케이스)
- §2 db:* 스크립트 6개 (db:start, db:push, db:types, db:reset, db:diff, db:check-drift)
- §3 모든 테이블 + RPC + 트리거 SQL 본문 (20개 마이그레이션 일람표 + 본문)
- §4 RLS 정책 패턴 3종 (사용자별 격리 / 글로벌+사용자 추가 / read-only seed)
- §5 ERD / 관계 그래프

핵심 1차 SSoT: `apps/web/supabase/migrations/*.sql`. db-schema.md는 derivative view.

---

## 4. Cross-cutting 룰 → `docs/plans/conventions.md`

13 영역 모든 phase 적용 룰북:
- §1 Result<T, string> 에러 처리
- §10 Server Action vs Route Handler 결정 룰
- §17 TanStack Query queryKey + invalidation
- §18 Zustand vs Query 경계
- §5 인증 가드 (proxy.ts / (app) 그룹 / 개별 페이지 책임 분리)
- §3 디자인 시스템 토큰
- §14 SUPABASE_SECRET_KEY 사용 경로
- §16 gitleaks Lefthook
- §7 모바일 EAS 빌드/배포
- §19 단일 출처 상수 (WEIGHT_* / MIN_SCORE / URGENT_THRESHOLD_DAYS)
- §12 관측/로깅
- §13 성능 목표

---

## 5. Phase 본문 → `docs/plans/phase-*.md`

각 phase는 11 필수 + 2 선택 섹션 골격으로 자율 실행 가능:
§0 사전 의존성 + §0.5 cross-phase 미리보기 + §1 목표 + §1.5 Architect 결정 + §2 DB 마이그레이션 + §3 UI + §4 로직 + §5 외부 API + §6 테스트 + §7 Acceptance + §8 DoD (8.5 롤백) + §9 위험 (9.5 관측)

| 파일 | 마이그레이션 | 핵심 산출물 |
|---|---|---|
| [phase-0a.md](./plans/phase-0a.md) | 0001, 0002 | supabase init + types codegen + Result 헬퍼 + (app) 라우트 그룹 |
| [phase-0b.md](./plans/phase-0b.md) | (없음) | primitives 7종 + AppShell + Vitest/Playwright + Lefthook |
| [phase-1.md](./plans/phase-1.md) ★ | 0003-0008b | 인벤토리 CRUD + computeDDay + 한국어 typeahead |
| [phase-2.md](./plans/phase-2.md) | 0009, 0010 | 정렬/필터/이동/소진 + auto_consume 트리거 + inventory_summary |
| [phase-3.md](./plans/phase-3.md) ★ | 0011, 0012, 0013 | recipe_master 100선 + recommend_recipes + YouTube cache |
| [phase-4.md](./plans/phase-4.md) | 0014, 0015a, 0015b | cooking_history + recommend_for_ingredient + log_cooking_session |
| [phase-5.md](./plans/phase-5.md) | 0016 | shopping_list + 부족 재료 추출 + 커머스 deeplink |
| [phase-6.md](./plans/phase-6.md) | 0017, 0018 | 바코드 cache + receipt OCR (ML Kit + Clova) |

---

## 6. 의존성 그래프 (★ 단일 출처 — 본 PLAN.md만)

```
Phase 0a (DB 인프라)
    ↓
Phase 0b (App Shell)
    ↓
Phase 1 ★ (인벤토리 CRUD — MVP 출시 가능)
    ├─→ Phase 2 (권장, 의존 X — 병렬 가능)
    │
    └─→ Phase 3 ★ (레시피 — 데모 MVP)
            ├─→ Phase 4 (요리 히스토리)
            │
            └─→ Phase 5 (장보기 브릿지)
                    └─→ Phase 6 (스마트 입력 — ROI 검증 후 진입)
```

**권장 ralph 호출 순서**: 0a → 0b → 1 → (2 또는 3 — 병렬 가능) → 4 → 5 → 6
- Phase 2/3은 Phase 1 후 독립 진입
- Phase 6은 Phase 5 의존하지 않아도 됨 (Phase 1만 있으면 OK)

---

## 7. Out of Scope (이번 로드맵 외 — 영구 또는 v2 검토)

- **어드민 인터페이스** (PRD 외, 영구 OOS — 사이드 프로젝트)
- **결제 / 멤버십**
- **푸시 알림** (FCM / APNs)
- **i18n** (한국어 전용)
- **다크모드** (디자인 토큰 미정의 — v2 검토)
- **소셜 로그인** (이메일/비밀번호만)
- **음성 입력**
- **단위 자동 변환** (g↔kg, 개↔봉지) — v2 검토 (Phase 7+)
- **ML 기반 추천** — 단순 매칭 점수 가중만 (Phase 3 알고리즘)
- **사용자 행동 추적** (Mixpanel, Amplitude) — Phase 7+ 검토

---

## 8. 진행 상태 → `docs/plans/README.md §1`

본 마스터는 단순 진입점. **현재 진행 상태는 README.md 진행 상태표** (단일 출처) — 본 PLAN은 갱신 X.

---

## 9. 변경 이력

- **2026-04-29**: 1872줄 마스터 → 12개 파일로 분할 (PARTITION_PLAN.md 합의). baseline `_archive/PLAN-pre-partition-2026-04-29.md` 보존
- (이후 변경은 CHANGELOG.md 또는 git log로 추적)
