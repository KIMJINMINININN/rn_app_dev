# TodoList — MMA 트레이닝 저널 (다음 작업 체크리스트)

> 브랜치 **`feature/mma-record`** · 갱신 **2026-05-30** · *다음 세션에서 바로 이어서 시작하는 용도*
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

### 4. 앱 셸 + 내비 + 글로벌 검색바 — IA(PRD §7) / Design §7
- [ ] `widgets/app-shell` (캘린더·기술·검색·프로필 + 상단 검색바 + 빠른추가 FAB)
- [ ] `app/(app)` + `app/(auth)` 라우트 그룹 스캐폴드

### 5. 인증 (F1) — Develop §10
- [ ] `(auth)/login`·`signup` UI + Supabase auth(server actions) + 미들웨어 (profiles/user_ranks 연동)

### 6. P0 기능 — Develop §12 (빌드 순서), 화면 Design §7
- [ ] F2 캘린더(월간+하루상세, react-calendar 커스텀 + `calendar_day_summary`)
- [ ] F3 세션 기록(`session-editor` 바텀시트/모달 + `log_session` RPC)
- [ ] F4 기술 라이브러리(목록/상세 + 벨트·종목 배지)
- [ ] F5 미디어(웹 파일선택/getUserMedia 업로드 + `youtube-embed` 재사용 + `/api/media/sign-upload`)
- [ ] F6 메모·주의점(강조 박스) · F7 태그+태그검색 · F8 글로벌 검색(`search_all`) · F9 배지 일관 적용

### 7. 모바일 (P0 = WebView)
- [ ] `apps/mobile` WebView가 MMA 웹 로드 + auth 브릿지 점검 *(네이티브 촬영 브릿지는 P1)*

---

## 🔧 도구 (아무 때나)
- [ ] **lefthook + gitleaks 시크릿 보호 복구** (Develop §3.3) — *조사 끝, 구현만 남음 (2026-05-30):*
  - gitleaks `8.30.1` brew 설치됨 ✅. **`protect`는 레거시 → `gitleaks git --staged --no-banner --redact` 사용.**
  - `.git/hooks/pre-commit`에 lefthook shim은 있으나 **lefthook 미선언**(pnpm dlx 캐시 경로 의존=취약) + **`lefthook.yml` 없음** → 매 커밋 "config 없음" 후 무동작.
  - 할 일: ① 루트 `pnpm add -D -w lefthook` ② 루트 `lefthook.yml`(pre-commit→gitleaks) ③ 루트 `.gitleaks.toml`(`[extend] useDefault=true` + allowlist `docs/`·`pnpm-lock\.yaml`) ④ `pnpm exec lefthook install` 훅 재생성.
  - 검증: 가짜 시크릿 여러 포맷 staged→차단(exit 1) / `.env.example` placeholder·정상파일→통과. (config 자동탐지: `(target)/.gitleaks.toml`.) GitHub push protection ON은 인프라.

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
