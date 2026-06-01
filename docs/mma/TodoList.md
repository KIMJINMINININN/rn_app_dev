# TodoList — MMA 트레이닝 저널 (다음 작업 체크리스트)

> 브랜치 **`feature/mma-record`** · 갱신 **2026-06-01** · *다음 세션에서 바로 이어서 시작하는 용도*
> **원칙: Supabase/Vercel 실제 프로비저닝은 맨 마지막.** 그 전까지는 코드·파일만 만든다.
> SSoT 문서: `docs/mma/PRD.md` · `docs/mma/Design.md` · `docs/mma/Develop.md`

---

## ✅ 완료된 것
- [x] 기획 문서 PRD/Design/Develop (리뷰 1회 반영본) — 커밋 `adb45ba`
- [x] DB 마이그레이션 `supabase/migrations/0001~0015` (테이블 10·enum 9·RLS·뷰·RPC·storage·시드) — `bf6df72` *(파일만, DB 미적용)*
- [x] enum 단일출처 `shared/model/enums.ts` + `entities/discipline`(메타·rank_track 매핑) — `3cab6fa` (typecheck ✅)
- [x] 냉장고 도메인 분리 확인 (이 브랜치는 깨끗한 템플릿 — 앱 셸+스타일만 추적)
- [x] **1. Tailwind red/black/white 재테마** + 다크모드/belt/discipline 토큰 — `tailwind-theme.css` `f1c2567` (build ✅)
- [x] **2. Supabase 클라이언트 토대** `shared/api/supabase/{server,client,admin,index,types}` + db 스크립트 5종 + `.env.example` — (build·typecheck ✅, DB 미적용)
- [x] **3. entity 슬라이스 6종** rank(+BeltBadge)·technique(+CategoryChip)·session·media(+youtube)·tag(+TagChip)·discipline(+DisciplineChip) + 공용 `shared/lib/zod.ts` + 테마 dark variant — 적대적 리뷰+architect APPROVED, build·typecheck ✅ (api/ 쿼리는 인프라 단계)
- [x] **6-F2. 캘린더 홈 UI 셸** — 월간 그리드(react-calendar 커스텀)+하루상세+조립, 데이터 휴면 — `18e021d` *(2026-06-01)*
- [x] **6-F3. 세션 에디터 UI 셸** — `features/log-session`(zod 스키마 + env-gated `logSession` 액션) + `widgets/session-editor`(반응형 바텀시트→md+모달, dialog a11y[ESC·포커스트랩·스크롤잠금·scrim-only], 날짜·종목 멀티토글 필수 + 접이식 세부정보·메모, useTransition 제출, sonner 토스트) + `shared/model/session-editor-store`(zustand 오버레이) + FAB·day-detail·calendar 3개 진입점 연결 + Toaster 도입. 저장 dormant, F4/F5/F7 섹션 스텁. architect APPROVED, typecheck·lint·build·gitleaks ✅ — `70015d9` *(2026-06-01)*
- [x] **6-F4. 기술 라이브러리** — `entities/technique` 보강(`PositionChip`+position-meta 12종) + `features/technique-library`(순수 `filterAndSortTechniques` 종목·분류·포지션·벨트+정렬 / `TechniqueFilterBar` 토큰 select 5 / `TechniqueCard`[다중엔티티 조합→feature 배치] / `TechniqueLibrary` client 아일랜드+EmptyState 2종) + `(app)/techniques` 목록(dormant []→정적) & 상세 셸(Position/CategoryChip + '미리보기' 마커). 데이터 휴면. architect APPROVED, typecheck·lint·build·gitleaks ✅ — `f1fdac7` *(2026-06-01)*
- [x] **6-F5. 미디어** — `entities/media/ui`(YoutubeEmbed·MediaThumb·VideoPlayer) + `features/media-upload`(MediaDraft+한도검증 / MediaPicker: 유튜브 링크 실동작·파일 검증+object-URL 프리뷰) + `/api/media/sign-upload`(env-gated dormant Route, `<uid>/videos/<uuid>`) + F3 미디어 섹션 연결. **유튜브=백엔드0 완전동작**, 업로드=dormant. architect APPROVED(object-URL 누수 수정 후), typecheck·lint·build·gitleaks ✅ — `894d95d` *(2026-06-01)*
- [x] **6-F6. 메모/주의점** — `shared/ui/markdown/MarkdownView`(marked→DOMPurify strict allowlist→inject, XSS 안전, SSR-safe useSyncExternalStore, 토큰 prose) + `shared/ui/callout/Callout`(주의점 강조 §9.3) + SessionCard memo_md & 기술상세 설명/주의점 연결. `marked` 추가. **architect XSS 적대 검증 APPROVED**, typecheck·lint·build·gitleaks ✅ — `fb1eeaa` *(2026-06-01)*
- [x] **6-F7. 태그+태그검색** — `features/tag-filter`(순수 tags helpers + **TagInput** 콤보박스: 자동완성·신규생성·AND 필터 양모드, TagChip 재사용, combobox a11y[role/aria-*·↑↓/Enter/Esc/쉼표/Backspace]) + `(app)/tags` 태그 보기(§7f, 선택 AND + 그룹 EmptyState, 정적) + F3 세션에디터 태그 stub 연결. persist dormant(tag_ids:[] seam). architect APPROVED(a11y 폴리시 반영), typecheck·lint·build·gitleaks ✅ — `d6fee4a` *(2026-06-01)*
- [x] **6-F8. 글로벌 검색** — `features/global-search`(searchAll[server-only env-gated dormant→search_all RPC] + groupResults/resultHref + SearchResults[기술/세션/태그 그룹] + **Highlight**[XSS 안전 regex-escape+React split]) + `/search` RSC 연동(?q, ƒ 유지). architect APPROVED(XSS/ReDoS·dormancy·exhaustiveness 검증), typecheck·lint·build·gitleaks ✅ — `b472c66` *(2026-06-01)*
- [x] **6-F9. 배지 일관 + 색약 3중인코딩** — 전 화면 칩/배지·상태 §10.1 감사+보강(TechniqueCard 벨트 라벨 복구 · MediaPicker 에러 토큰 교정+⚠ · login/signup ⚠/ⓘ, 글리프 통일). architect 독립 전수 감사 APPROVED(색-단독 인코딩 0), typecheck·lint·build·gitleaks ✅ — `22c1b3a` *(2026-06-01)* · **🎉 P0 기능 F2~F9 완료**
- [x] **5. 인증 골격** (F1) login/signup/logout Server Action + client form + `shared/ui/Input` + `src/proxy.ts`(Next 16 세션 미들웨어) + env-gated 가드/프로필 — `d44df32` (실동작은 인프라, 랭크/프로필 편집은 후속) *(2026-06-01)*
- [x] **4. 앱 셸 + 내비 + 글로벌 검색바** `widgets/app-shell`(SideNav[데스크톱]→BottomNav[모바일] 반응형·TopBar+SearchBar·ThemeToggle·빨강 FAB) + `shared/ui`(Button/IconButton/EmptyState/Skeleton/theme[FOUC]) + `app/{(app),(auth)}` 라우트 스캐폴드(걸어다니는 셸) + 루트 layout `data-theme`/FOUC 주입 + Providers(QueryClient) — typecheck·build ✅, FSD 깨끗, 의존성 0 추가 *(커밋 대기, DB/auth는 스텁)*

---

## ▶ 다음 시작점 (추천 순서)
각 항목 독립 커밋 가능. **1번(테마)·2번(토대)은 DB 없이 바로 가능.**

### 1. ✅ Tailwind 흑·백·빨 재테마  — Design.md §2  *(완료 `f1c2567`)*
- [x] `tailwind-theme.css` @theme를 red/black/white로 교체 (primary `#E11D2A`)
- [x] 다크모드 토큰 + `[data-theme]` 스위칭 + OS 자동(`prefers-color-scheme`)
- [x] 벨트색(8)·종목색(5) CSS 변수 — `discipline-meta.ts`와 일치
- ↪ 후속: `app/layout.tsx` `<html>`에 `data-theme` 주입 + FOUC 스크립트 → 앱 셸/F1(4·5번)

### 2. ✅ Supabase 클라이언트 + 타입 토대  — Develop §6/§6b/§4.7  *(완료)*
- [x] `shared/api/supabase/{server,client,admin,index,types}.ts` 스캐폴드 (server/admin은 `server-only`)
- [x] `package.json` db 스크립트 5종 (start/push/types/reset/diff) + `@supabase/ssr`·`supabase-js`
- [x] `.env.example` (Supabase/YouTube/Storage/e2e, 전부 placeholder, `!.env.example` 예외)
- [x] `types.ts` placeholder (인프라 단계 `db:types`가 덮어씀)
- ↪ 후속: `src/proxy.ts` 미들웨어(세션 갱신)는 인증(5번)에서

### 3. ✅ entity 슬라이스 — Develop §6.1  *(완료)*
- [x] `entities/rank`(UserRank model + **BeltBadge** ui) · `entities/technique`(model+zod + CategoryChip + category-meta)
- [x] `entities/session`(model+zod, session_disciplines N:M) · `entities/media`(model + youtube URL→id 파싱) · `entities/tag`(model + **TagChip**)
- [x] 시그니처 컴포넌트 **BeltBadge·DisciplineChip·TagChip**(+ CategoryChip) — Design §6 스펙 반영
- [x] 공용 `shared/lib/zod.ts`(isoTimestamp) + 테마 `@custom-variant dark`/belt-dark 토큰 보강
- ↪ 후속(인프라/이후): 각 슬라이스 `api/`(supabase 쿼리), `entities/technique` PositionChip·TechniqueCard, `entities/session` lib/ui, `entities/media` ui(MediaThumb/VideoPlayer)
- ↪ 네이밍 결정: Design §6 기준 `DisciplineChip`/`TagChip` 사용(Develop의 DisciplineBadge/TagPill 별칭 통일)

### 4. ✅ 앱 셸 + 내비 + 글로벌 검색바 — IA(PRD §7) / Design §7  *(완료, 커밋 대기)*
- [x] `widgets/app-shell` (SideNav 데스크톱→BottomNav 모바일 반응형 · TopBar+SearchBar→`/search?q=` · ThemeToggle+오늘로 · 빨강 QuickAddFab)
- [x] `app/(app)`(layout=AppShell+인증가드 스텁 · calendar/techniques/[id]/search/profile 페이지+loading) + `app/(auth)`(login/signup 셸) 라우트 그룹
- [x] `shared/ui` 원자: Button(cva)·IconButton·EmptyState·Skeleton·theme(ThemeProvider+FOUC 스크립트+zustand) — 1번 후속 `data-theme` 주입·FOUC 방지 여기서 처리
- ↪ 후속(각 기능 단계): FAB→세션에디터(F3) · "오늘로"→`/calendar?date=`(F2) · 인증가드 Supabase 연결(F1) · 페이지 실데이터 페치(F2/F4/F8) · Toaster(sonner) 도입(F3)

### 5. 🟡 인증 **골격** (F1) — Develop §10  *(골격 완료 `d44df32`, 실동작은 인프라)*
- [x] `(auth)/actions.ts` login/signup/logout Server Action(이메일+비번, zod, revalidate+redirect, signup은 profiles 미접촉=DB 트리거 위임)
- [x] `(auth)/login·signup` client form(useActionState) + `shared/ui/Input` 원자
- [x] `src/proxy.ts` Next 16 proxy(구 middleware) — `@supabase/ssr` 세션 갱신 + matcher
- [x] `(app)/layout` 가드 + `profile` 계정정보/로그아웃 — **env-gated**(`NEXT_PUBLIC_AUTH_ENABLED`, 기본 false). 플래그 OFF면 Supabase 무접촉→(app) 정적·셸 탐색 유지, 인프라 때 ON으로 자동 활성화
- ↪ 남음: **실 로그인 동작=인프라**(실 Supabase + 플래그 ON) · 표시명/타임존/**종목별 랭크 편집 UI(F1-AC3/AC4, user_ranks upsert)** · 소셜 로그인(T6) · email confirm 분기 확정(T5) · 모바일 토큰 핸드오프(§10)
- ⚠️ 인프라 메모: `.env.local`에 **냉장고(레퍼런스) 프로젝트의 stale Supabase 값**(+COUPANG/KURLY/BAEMIN 플래그) 잔존 → 인프라 때 MMA 키로 **교체** 필요

### 5b. F1 후속 — 프로필/랭크 편집 UI  *(인증 골격에서 분리, 미뤄둠 2026-06-01)*
- [ ] `profile`: 표시명·타임존(기본 Asia/Seoul) 편집 (F1-AC3, `profiles` update)
- [ ] **종목별 랭크 편집** (F1-AC4): bjj=BeltBadge+스트라이프(0~4), 비bjj=레벨(입문/중급/고급) — `entities/rank`·`BeltBadge` 재사용, `user_ranks` upsert(`userRankUpsertSchema`)
- ↪ 실제 저장은 인프라(실 Supabase). 지금은 UI + 휴면 액션(env-gated)까지. profile 페이지의 랭크 placeholder를 실 편집 UI로 대체.

### 6. P0 기능 — Develop §12 (빌드 순서), 화면 Design §7
- [~] **F2 캘린더 UI 셸** — `18e021d`: `features/calendar-view`(월간 그리드 react-calendar 커스텀, 종목 점+세션수, 오늘/선택 강조) + `widgets/day-detail`(세션카드/EmptyState) + `(app)/calendar` 조립(월네비·뷰탭·오늘로). 데이터 휴면(빈 맵/배열). ↪ 남음: `calendar_day_summary` 월별 조회 연결(Phase2/infra) · 셀 `+`/뷰탭 주·아젠다(P1) · `?date` 딥링크
- [x] **F3 세션 에디터 UI 셸** — `70015d9`(2026-06-01): `features/log-session` + `widgets/session-editor`(바텀시트/모달 + 폼) + shared 오버레이 스토어 + sonner Toaster + 3진입점. 저장은 env-gated dormant.
  - ↪ 남음(인프라/후속): **실 `log_session` RPC 동작**(플래그 ON) · 성공 시 **calendar 쿼리 invalidate**(QueryClient, 현재 revalidatePath만) · **다룬 기술(F4) 연결**(기술 검색/신규생성 → `p_techniques`) · **미디어(F5)**(`p_media`) · **태그(F7)**(`p_tag_ids`) 섹션 활성화 · **edit 모드 prefill**(현재 create 경로만; store는 mode/sessionId 보유) · 셀 `+`(`tileContent` 내 추가 버튼)
- [x] **F4 기술 라이브러리** — `f1fdac7`(2026-06-01): `entities/technique`(PositionChip+position-meta) + `features/technique-library`(필터/정렬 순수함수 + FilterBar + TechniqueCard[feature 배치] + Library 아일랜드) + `(app)/techniques` 목록·상세 셸. 데이터 dormant(빈 배열→EmptyState), 필터는 실동작.
  - ↪ 남음(인프라/후속): **techniques RSC/쿼리 페치**(목록·상세 실데이터) · **기술 생성/편집**(별도 폼, 현재 '기술 추가' 스텁) · 상세 **미디어(F5)**·**역참조 세션**(`session_techniques`) 연결 · 카드 **대표 썸네일**(F5) · F3 세션에디터의 '다룬 기술' 연결(기술 검색/신규생성)
- [x] **F5 미디어** — `894d95d`(2026-06-01): `entities/media/ui`(YoutubeEmbed·MediaThumb·VideoPlayer) + `features/media-upload`(MediaDraft 모델+한도검증 / MediaPicker: **유튜브=백엔드0 실동작**, 파일=검증+object-URL 프리뷰[업로드 dormant]) + `/api/media/sign-upload`(POST, env-gated dormant→503, Zod+한도+인증, `<uid>/videos/<uuid>` 경로) + F3 세션에디터 미디어 섹션 연결. architect APPROVED(object-URL 누수 수정 후).
  - ↪ 남음(인프라/후속): 실 업로드 플로우(sign-upload→Storage PUT→`media_assets` row→`media_id`) · **MediaDraft → logSession.media 매핑**(youtube=row 생성, upload=업로드 후 row) · 재생용 `createSignedUrl`(VideoPlayer src) · 업로드 썸네일 생성(§5.5) · F4 상세/SessionCard 미디어 행에 실제 컴포넌트 연결 · 네이티브 촬영 브릿지(P1) · external 링크(P1) · 유튜브 검색(`/api/youtube/search`, API키)
- [x] **F6 메모·주의점**(강조 박스) — `fb1eeaa`(2026-06-01): `shared/ui/markdown/MarkdownView`(marked→DOMPurify strict allowlist→inject, XSS 안전 · SSR-safe useSyncExternalStore · 토큰 prose) + `shared/ui/callout/Callout`(주의점 §9.3) + SessionCard memo_md & 기술상세 설명/주의점 연결. `marked` 추가. architect XSS APPROVED.
  - ↪ 남음(후속): 메모 **편집** 시 지원 마크다운 안내(소제목 h3~) · h1/h2·표는 현재 텍스트로만 표시(의도) · F4 상세 실 description_md/details_md 연결(인프라)
- [x] **F7 태그+태그검색** — `d6fee4a`(2026-06-01): `features/tag-filter`(순수 tags helpers + **TagInput** 콤보박스[자동완성·신규생성·AND 필터 양모드, TagChip 재사용, combobox a11y]) + `(app)/tags` 태그 보기(§7f, 선택 AND + 그룹 EmptyState, 정적) + F3 세션에디터 태그 stub 연결. 태그 persist는 dormant(tag_ids:[] seam). architect APPROVED.
  - ↪ 남음(인프라/후속): 사용자 태그 조회(autocomplete suggestions) · 선택 태그 **AND 조회**(taggables→기술/세션 그룹 결과) · 세션/기술 저장 시 **이름→tags upsert→tag_id 매핑** · 태그칩 클릭→`/tags` 진입 · 필터 모드 no-match 안내 · 태그 색상/사용빈도순(P1)
- [x] **F8 글로벌 검색** — `b472c66`(2026-06-01): `features/global-search`(SearchResult 모델+groupResults+resultHref + **searchAll**[server-only, env-gated dormant→[], search_all RPC] + **SearchResults**[기술/세션/태그 그룹] + **Highlight**[XSS 안전]) + `/search` RSC 연동(?q→searchAll, ƒ 유지). SearchBar 기존 연결. architect APPROVED(XSS/ReDoS·dormancy 검증).
  - ↪ 남음(인프라/후속): 실 `search_all` RPC 동작(플래그 ON) · RPC **DISTINCT(result_type,result_id)** 확인 · RPC 에러 서버 로깅 · `/calendar?date=` 딥링크 처리(세션 결과 진입) · (P1) 패싯 필터(종목·벨트·기간)
- [x] **F9 배지 일관 + 색약 3중인코딩** — `22c1b3a`(2026-06-01): 전 화면 칩/배지·상태 §10.1 감사. TechniqueCard 벨트 라벨 복구 · MediaPicker 에러 `--danger` 교정+⚠ · login/signup ⚠/ⓘ. 상태 글리프 통일(⚠ danger/ⓘ info). architect 독립 전수 감사 APPROVED — 색-단독 인코딩 잔존 0.
  - ↪ **🎉 P0 기능 F2~F9 전부 UI 셸 완료.** 다음은 미뤄둔 5b(프로필/랭크) · 기술 생성폼 · 모바일 WebView(7) · 그리고 🟥 인프라 점등.

### 7. 모바일 (P0 = WebView)
- [ ] `apps/mobile` WebView가 MMA 웹 로드 + auth 브릿지 점검 *(네이티브 촬영 브릿지는 P1)*

---

## 🔧 도구 (아무 때나)
- [x] **lefthook + gitleaks 시크릿 보호 복구** (Develop §3.3) — 완료 `ae30146` (2026-06-01):
  - ① 루트 `pnpm add -D -w lefthook`(2.1.9) → 훅이 `node_modules` 참조(기존 fragile pnpm dlx 캐시 경로 탈출) ② `lefthook.yml` pre-commit→`gitleaks git --staged --no-banner --redact` ③ `.gitleaks.toml`(`[extend] useDefault` + allowlist `docs/`·`pnpm-lock`; `.env.example`는 오탐 0 검증돼 **비제외**) ④ `pnpm exec lefthook install`.
  - 검증 ✅: 가짜 AWS키+RSA키 staged→차단(exit 1) / 동일 패턴 `docs/`→allowlist 통과 / `.env.example` placeholder→오탐 없음 / 실제 커밋이 훅 통과(`no leaks found`).
  - ↪ 남음(인프라): GitHub push protection ON(서버측 이중 방어) · 진짜 키는 `.env.local`(gitignore, allowlist 아님 → 강제 add돼도 차단).

## 🟥 인프라 — **맨 마지막에 몰아서** — Develop §13
- [ ] `supabase init` + `config.toml` (bucket `training-media`, `file_size_limit` 등 §4.1)
- [ ] 새 Supabase 프로젝트 생성 → `pnpm web db:push` (0001~0015 적용)
- [ ] 로컬 `supabase db reset`로 **마이그레이션 실제 검증** (현재까지 파일만, 미검증)
- [ ] `pnpm web db:types` → 클라이언트 `Database` 제네릭 적용 (placeholder 대체)
- [ ] `.env.local` 키 작성 — **절대 커밋 금지** (push protection / gitleaks)
- [ ] Vercel 프로젝트 + env → 배포
- [ ] (선택) 독립 레포 추출 여부 결정

## ❓ 열린 결정 / 콘텐츠 — Develop §14
- [ ] 제품명/브랜드 (가칭 RollLog) — T12
- [ ] **프리셋 기술 목록** 큐레이션 종목별 8~12개 → `0015_starter_techniques.sql` 채우기 — T13
- [ ] 영상 업로드 한도 수치 (잠정 ≤60s/≤100MB) — T1
- [ ] 썸네일 생성 방식(T2) · 서명URL TTL(T3) · email confirm(T5) · 소셜 로그인(T6) · 모바일 업로드 인증(T9)

---

## 📌 재개 팁
- 데이터 필요한 화면은 **UI+타입 셸**까지 만들고, 실제 동작은 인프라 단계에 연결.
- 스키마 변경 시 동기화 순서: **PRD §4 → Develop §4 → 마이그레이션 SQL + `shared/model/enums.ts`** (같은 PR에서).
- 현재 커밋: `git log --oneline` → `3cab6fa`(enum/discipline) `bf6df72`(migrations) `adb45ba`(docs).
