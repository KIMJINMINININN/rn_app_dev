# Changelog

본 프로젝트의 모든 주요 변경 사항은 phase 단위로 본 파일에 기록한다. 형식: [Keep a Changelog](https://keepachangelog.com/) 약식.

## v0.0.2 (Phase 0b) — App Shell + Primitives + 테스트 인프라 (2026-04-30)

### Added
- shared/ui primitives 7종: Button, Card, Badge, Input, Dialog, Skeleton, Toast (CVA 기반, 디자인 토큰 100% 사용)
- `@radix-ui/react-dialog`, `sonner` 의존성 추가
- widgets/app-shell — AppHeader (sticky, 마이페이지 링크), BottomNav (4탭, `usePathname` 기반 active)
- `app/(app)/inventory/page.tsx` placeholder
- shared/lib/query-client.ts + query-provider.tsx — TanStack Query Provider (per-mount 싱글톤, dev-gated devtools)
- root layout — `<QueryProvider>{children}</QueryProvider><Toaster />` 주입
- 테스트 인프라 — Vitest 4 + jsdom + @testing-library/react 16 + @testing-library/jest-dom + Playwright 1.59 + chromium
- vitest.config.ts (e2e/* exclude), vitest.setup.ts (jest-dom matchers)
- playwright.config.ts (chromium, PORT=3100, 120s webServer + 30s locator timeout)
- 단위 테스트 1개 (button.test.tsx — `await findByRole`)
- E2E 테스트 1개 (auth.spec.ts — /login 페이지 렌더, port 3100)
- 5 test scripts (test/watch/ui/coverage/e2e)
- lefthook (워크스페이스 루트) — pre-commit hook (gitleaks protect --staged + typecheck) 자동 격상

### Changed
- `app/(app)/layout.tsx` — Phase 0a 인증 가드 유지 + AppHeader/main(pb-56)/BottomNav shell 통합
- root layout.tsx body — QueryProvider + Toaster 추가
- gitleaks 자동화 격상 (Phase 0a 수동 1회 → Phase 0b pre-commit 자동)
- `app/page.tsx` `'use client'` 선행 코멘트 제거 (디렉티브 첫 줄 보장)

### Verified
- `pnpm web typecheck` / `lint` / `db:check-drift` 모두 0 errors
- `pnpm web test` (vitest) 1/1 PASS
- `pnpm web test:e2e` (Playwright) 1/1 PASS (port 3100)

### Spec deviations (phase-0b.md 와 다른 결정)
- `vitest@^1` → `^4` (1.x EOL)
- `@vitejs/plugin-react ^6` (vite 8 호환 — vitest 4 의존성)
- e2e port 3000 → 3100 (로컬 환경 충돌 회피, 향후 환경 정리 시 3000 복귀 검토)
- `vitest.config.exclude` 확장 (e2e/* — Playwright `test()` 충돌 회피)
- `button.test.tsx` `await findByRole` (React 19 concurrent mount 대응)
- gitleaks는 시스템 binary 사용 (npm 미배포, `brew install gitleaks` 필수)

## v0.0.1 (Phase 0a) — DB infra + codegen 셋업 (2026-04-30)

### Added
- supabase 디렉터리 + `config.toml` (`supabase init`)
- 마이그레이션 0001 — `pg_trgm` extension
- 마이그레이션 0002 — `user_profiles` 테이블 + `handle_new_user()` 트리거 (security definer, search_path 명시)
- 3 supabase 클라이언트 (`browser`/`server`/`admin`)에 `<Database>` generic 적용
- `apps/web/src/shared/api/supabase/types.ts` (auto-generated, `pnpm web db:types`)
- `apps/web/src/shared/lib/result.ts` — `Result<T, E>` + `ok()` / `err()` 헬퍼
- `apps/web/src/app/(app)/layout.tsx` — 인증 가드 RSC layout (단일 진입점)
- `.gitleaks.toml` 룰 파일 (워크스페이스 루트, 기본 ruleset extend + 노이즈 경로 allowlist)
- 6 db 스크립트 (`db:start`/`push`/`types`/`reset`/`diff`/`check-drift`)

### Changed
- `app/page.tsx` — create-next-app 보일러플레이트 제거, 로그인 여부에 따라 `/login` 또는 `/inventory` redirect
- `app/layout.tsx` metadata 한글화 (`냉장고 매니저`)
- `app/account/{page,logout-button}.tsx` → `app/(app)/account/`로 이동 + `dark:*` 클래스 제거 (conventions §3.2)

### Verified
- 트리거 실동작 (재가입 시 `user_profiles` row 자동 생성, FK 매칭 OK)
- `pnpm web typecheck` 0 errors
- `pnpm web lint` 0 errors
- `pnpm web db:check-drift` drift 0
- 수동 `gitleaks detect` PASS (수동 1회 실행, lefthook 자동화는 Phase 0b)
