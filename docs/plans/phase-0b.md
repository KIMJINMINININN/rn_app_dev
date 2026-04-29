# Phase 0b — App Shell + Primitives + Query Provider + 테스트 인프라

> ralph 실행 단위. 본 파일 + 참조: docs/plans/db-schema.md, docs/plans/conventions.md, docs/PRD.md
>
> **상태**: 미시작
> **선행 phase**: Phase 0a
> **후속 phase**: Phase 1
> **예상 기간**: 3-4일

---

## §0 사전 의존성 + 환경 변수

### 체크박스
- [ ] Phase 0a 완료 (§7 Acceptance + §8 DoD 모두 통과)
- [ ] `apps/web/supabase/migrations/` 마지막 번호 = `0002` (본 phase는 마이그레이션 추가 없음. 0002 초과이면 Phase 0a 이후 추가 마이그레이션 존재 — 확인 필요)
- [ ] `apps/web/src/shared/lib/result.ts` 존재 (Phase 0a 산출물 — `Result<T,E>` + `ok/err` 헬퍼)
- [ ] `apps/web/src/app/(app)/layout.tsx` 존재 + 인증 가드 동작 (Phase 0a — 미인증 → `/login` redirect)
- [ ] `apps/web/src/shared/api/supabase/types.ts` 존재 (`Database` 타입 export — Phase 0a `db:types` 산출물)
- [ ] **마이그레이션 번호 충돌 확인** (Architect 3.F): `apps/web/supabase/migrations/` 마지막 번호가 본 phase 시작(마이그레이션 없음) 기준 0002임을 확인. Phase 1 시작 번호(`0003`)가 충돌 없음 전제.
- [ ] `pnpm web typecheck` 0 errors (Phase 0a DoD 조건 — 회귀 없음 확인)
- [ ] `husky` 또는 타 git hook 도구 없음 확인 (`.husky/` 디렉토리 부재 — Lefthook 충돌 방지)

### 환경 변수
신규 없음. Phase 0a에서 설정된 변수 그대로 사용:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_PROJECT_ID`

---

## §0.5 참조 자산 미리보기 (cross-phase dependencies)

> 본 phase 작업에 필요한 타 phase 자산을 inline 발췌. 풀 본문은 db-schema.md / conventions.md.

### 0.5.1 인용 테이블

없음 (본 phase는 DB 마이그레이션 없음).

### 0.5.2 인용 RPC/함수

없음.

### 0.5.3 영향받는 cross-cutting 룰 (conventions.md)

- **§1 Result<T, string>** — 모든 Server Action 반환 타입. Phase 0a에서 헬퍼 작성됨. 본 phase에서는 Toast 피드백 채널로 연동 (mutation 결과 → `toast({tone:'danger'})`)
- **§3 디자인 토큰** — primitives 7종 작성 시 반드시 준수. 허용: `gray/primary/green/red/yellow/teal/purple` + `--spacing 1px` 단위 + semantic typography. **절대 금지**: `zinc-*`, `emerald-*`, `slate-*`, `dark:*`, arbitrary values `text-[14px]`
- **§8 git 커밋 전략** — gitleaks Lefthook 본 phase에서 자동 hook으로 격상 (Phase 0a에서 수동 1회 실행 완료. 본 phase에서 `lefthook install` + `gitleaks protect --staged` pre-commit hook 셋업)
- **§9 테스트 인프라** — 본 phase가 SSoT (풀 본문 아래 §6). conventions.md §9는 1줄 요약 + 본 파일 링크
- **§17 TanStack Query queryKey** — Provider 셋업 + queryKey 네이밍 룰 적용. 실제 query는 Phase 1부터. 기본 설정: `staleTime: 30_000`, `gcTime: 5 * 60_000`, `retry: 1`

### 0.5.4 인용 자산 (Phase 0a 산출물)

| 자산 | 위치 | 용도 |
|---|---|---|
| `Result<T,E>` + `ok/err` | `apps/web/src/shared/lib/result.ts` | Toast 에러 피드백 패턴 참조 |
| `Database` 타입 | `apps/web/src/shared/api/supabase/types.ts` | 모든 supabase 클라이언트 generic — 본 phase는 직접 사용 없음 |
| `(app)` 라우트 그룹 | `apps/web/src/app/(app)/layout.tsx` | 인증 가드 layout — 본 phase에서 AppHeader + BottomNav 슬롯 추가 |

---

## §1 목표 / 출시 가능 가치

(PLAN.md §Phase 0b 본문 직접 추출)

**목표**: 인증된 사용자가 진입할 RSC 라우트 그룹 + 디자인 토큰 사용 primitives 7종 + TanStack Query Provider + Vitest/Playwright 셋업.

App Shell + UI primitives 7종 + TanStack Query Provider + Vitest/Playwright 테스트 인프라 + gitleaks Lefthook. Phase 1부터 시작될 도메인 코드의 모든 토대.

**가시적 변화**: 가입 후 `(app)/inventory` 이동 시 AppHeader + BottomNav 표시됨. 어떤 페이지든 primitives로 일관된 UI 구성 가능. 첫 단위 테스트(Button) + 첫 E2E 테스트(`/login` 렌더) 1개씩 통과.

---

## §1.5 Architect 결정 적용

- **권고 (PARTITION_PLAN Minor 7 — primitives 7종)**: Button/Card/Badge/Input/Dialog/Skeleton/Toast (PLAN.md §Phase 0b 본문 기준 5종 → 7종으로 확장 합의. Dialog + Skeleton 추가). Dialog는 `@radix-ui/react-dialog` 래퍼.
- **권고 (PARTITION_PLAN Minor 1 격상 — gitleaks Lefthook)**: Phase 0a에서 `.gitleaks.toml` 룰 파일 + 수동 1회 실행 완료. 본 phase에서 `lefthook` + `gitleaks protect --staged` pre-commit hook 자동 실행으로 격상. Phase 0b가 hook 자동화의 SSoT.
- **권고 (PARTITION_PLAN Architect — 테스트 인프라)**: Vitest + Playwright 셋업이 Phase 0b의 핵심 deliverable. Phase 1 진입 전 두 인프라 모두 동작 가능 상태 필수. Critical Issue 9 해소.
- **권고 (PLAN.md §Phase 0b — Toast)**: `sonner` 1줄 셋업 권장 (또는 `@radix-ui/react-toast`). Zustand 기반 자체 큐 구현도 허용 — 구현 선택은 작성자 재량.
- **권고 (PLAN.md §Phase 0b — FSD 베이스 모듈)**: `shared/config/`, `shared/model/`, `entities/`, `features/`, `widgets/` 디렉토리 + `.gitkeep` 또는 placeholder `index.ts` 생성.

---

## §2 DB 마이그레이션

없음 (본 phase는 UI/인프라 전용).

`pnpm web db:check-drift`는 DoD에 포함 (본 phase 마이그레이션 0개라도 0001/0002 회귀 검증).

---

## §3 UI 작업 (FSD 레이어 + 정확한 파일 경로)

> FSD 레이어: `apps/web/src/{app|widgets|features|entities|shared}/...`
> 디자인 토큰 준수 필수 — conventions.md §3 참조. `dark:*` 클래스 절대 금지.

### 3.1 shared/ui primitives 7종

모든 primitive는 디자인 토큰만 사용. Tailwind arbitrary values + `zinc-*` + `emerald-*` + `dark:*` 0건.

| 컴포넌트 | 파일 | 핵심 props |
|---|---|---|
| Button | `apps/web/src/shared/ui/button.tsx` | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'destructive'`, `size: 'sm' \| 'md' \| 'lg'`, `disabled`, `loading` (spinner inline) |
| Card | `apps/web/src/shared/ui/card.tsx` | `padding: 'sm' \| 'md' \| 'lg'` (토큰 기반), hover lift 효과 |
| Badge | `apps/web/src/shared/ui/badge.tsx` | `tone: 'default' \| 'success' \| 'warning' \| 'danger' \| 'info'` (D-Day 색상 매핑에 Phase 1에서 활용) |
| Input | `apps/web/src/shared/ui/input.tsx` | `label`, `error`, `helper`, `type: 'text' \| 'number' \| 'date'` |
| Dialog | `apps/web/src/shared/ui/dialog.tsx` | `@radix-ui/react-dialog` 래퍼 — `open`, `onOpenChange`, `title`, `description` |
| Skeleton | `apps/web/src/shared/ui/skeleton.tsx` | `width`, `height`, `variant: 'text' \| 'rect' \| 'circle'` (RSC `loading.tsx`에서 사용) |
| Toast | `apps/web/src/shared/ui/toast.tsx` | `sonner` 또는 `@radix-ui/react-toast` 기반 — mutation 피드백 채널 (Phase 1 추가/수정/삭제 시 즉시 사용) |

**의존성 추가** (primitives):
```bash
pnpm --filter @the-others/web add @radix-ui/react-dialog
# Toast 선택 시:
pnpm --filter @the-others/web add sonner
# 또는:
pnpm --filter @the-others/web add @radix-ui/react-toast
```

### 3.2 widgets/app-shell

| 컴포넌트 | 파일 | 역할 | 비고 |
|---|---|---|---|
| AppHeader | `apps/web/src/widgets/app-shell/app-header.tsx` | 상단 — 좌측 로고/서비스명, 우측 마이페이지 아이콘 링크 | `'use client'` |
| BottomNav | `apps/web/src/widgets/app-shell/bottom-nav.tsx` | 하단 탭 4개: 인벤토리(active) / 레시피(disabled) / 히스토리(disabled) / 마이페이지 | `'use client'` |

### 3.3 (app) layout 통합

`apps/web/src/app/(app)/layout.tsx`에 AppHeader + BottomNav 슬롯 배치:

```tsx
// apps/web/src/app/(app)/layout.tsx (Phase 0a 기존 파일 수정)
// 인증 가드는 그대로 유지 (Phase 0a 작업).
// 아래 shell 추가:
import { AppHeader } from '@/widgets/app-shell/app-header';
import { BottomNav } from '@/widgets/app-shell/bottom-nav';

// ...
return (
  <div className="flex flex-col min-h-screen">
    <AppHeader />
    <main className="flex-1 pb-16">{children}</main>
    <BottomNav />
  </div>
);
```

### 3.4 (app)/inventory placeholder 페이지

`apps/web/src/app/(app)/inventory/page.tsx`:
- RSC
- 내용: `<p>Phase 1에서 구현</p>` (placeholder)
- AppHeader + BottomNav가 layout에서 자동 표시됨 — Acceptance §7 3번째 항목 검증 기준

### 3.5 FSD 베이스 모듈 디렉토리

```
apps/web/src/shared/config/.gitkeep
apps/web/src/shared/model/.gitkeep
apps/web/src/entities/.gitkeep
apps/web/src/features/.gitkeep
apps/web/src/widgets/.gitkeep  (app-shell 작성 시 자동 생성됨)
```

> `.gitkeep` 대신 `index.ts` (빈 파일 또는 `export {}`) 사용 가능. git 추적 목적.

---

## §4 로직 작업

> Server Action vs Route Handler 룰 (conventions §10 inline):
> 본 phase는 Server Action + Route Handler 없음.

### 4.1 TanStack Query Provider

**의존성 추가**:
```bash
pnpm --filter @the-others/web add @tanstack/react-query
pnpm --filter @the-others/web add -D @tanstack/react-query-devtools
```

**파일 구조**:
- `apps/web/src/shared/lib/query-client.ts` — `QueryClient` 인스턴스 생성 (defaultOptions)
- `apps/web/src/shared/lib/query-provider.tsx` — `'use client'` Provider 래퍼

`query-client.ts` 기본 설정:
```ts
// apps/web/src/shared/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1_000,       // 30초
        gcTime: 5 * 60 * 1_000,      // 5분
        retry: 1,
      },
    },
  });
}
```

`query-provider.tsx`:
```tsx
// apps/web/src/shared/lib/query-provider.tsx
'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { makeQueryClient } from './query-client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**root layout 주입** (`apps/web/src/app/layout.tsx`):
```tsx
import { QueryProvider } from '@/shared/lib/query-provider';
// ...
<QueryProvider>{children}</QueryProvider>
```

### 4.2 Toast 셋업

**sonner 사용 시** (`apps/web/src/shared/ui/toast.tsx`):
```tsx
// apps/web/src/shared/ui/toast.tsx
export { Toaster } from 'sonner';
export { toast } from 'sonner';
```
`apps/web/src/app/layout.tsx`에 `<Toaster />` 추가.

**사용 패턴** (Phase 1 도메인 코드 참조용):
```ts
import { toast } from '@/shared/ui/toast';
// mutation 성공
toast.success('재료가 추가되었습니다');
// mutation 실패 (Result.error 메시지)
toast.error('재료 추가에 실패했습니다');
```

### 4.3 Server Actions / Route Handlers

없음 (Phase 1부터).

---

## §5 외부 API 연동

해당 없음.

---

## §6 테스트 작업

> 본 phase가 테스트 인프라 SSoT. conventions.md §9는 1줄 요약 + 본 파일 링크.
> Critical Issue 9 해소.

### 6.1 의존성 설치

```bash
pnpm --filter @the-others/web add -D \
  vitest@^1 \
  @vitest/coverage-v8 \
  @vitest/ui \
  @testing-library/react \
  @testing-library/jest-dom \
  jsdom \
  @vitejs/plugin-react

pnpm --filter @the-others/web add -D @playwright/test

# Playwright chromium 1회 설치 (200MB+ — 로컬 1회, CI 미도입)
pnpm --filter @the-others/web exec playwright install chromium --with-deps
```

### 6.2 Vitest 셋업

`apps/web/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

`apps/web/vitest.setup.ts`:
```ts
import '@testing-library/jest-dom';
```

`apps/web/package.json` 스크립트 추가:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

### 6.3 Playwright 셋업

`apps/web/playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm web dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
```

`apps/web/e2e/` 디렉토리 생성.

### 6.4 gitleaks Lefthook 셋업 (conventions §8 자동화 격상)

**의존성 추가** (워크스페이스 루트):
```bash
pnpm add -D -w lefthook gitleaks
pnpm dlx lefthook install
```

워크스페이스 루트 `lefthook.yml`:
```yaml
pre-commit:
  parallel: true
  commands:
    gitleaks:
      run: gitleaks protect --staged --no-banner
    typecheck:
      glob: "apps/web/src/**/*.{ts,tsx}"
      run: pnpm web typecheck
```

`.gitleaks.toml` 위치:
- Phase 0a에서 `apps/web/.gitleaks.toml`로 생성된 경우 → 워크스페이스 루트로 승격 (이동 또는 복사)
- 루트에 없으면 신규 생성

`lefthook install` 실행 후 `.git/hooks/pre-commit` 갱신 확인.

> **충돌 방지**: `.husky/` 디렉토리 있으면 `rm -rf .husky` 후 Lefthook 전환.

### 6.5 단위 테스트 (1개 — 셋업 검증용)

`apps/web/src/shared/ui/button.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders and fires click handler', () => {
    const onClick = vi.fn();
    render(<Button variant="primary" onClick={onClick}>클릭</Button>);
    fireEvent.click(screen.getByRole('button', { name: '클릭' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

> PLAN.md §Phase 0b 기준: `shared/ui/Button.test.tsx` — render + click handler 1개.

### 6.6 E2E 테스트 (1개 — 셋업 검증용)

`apps/web/e2e/auth.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('/login 페이지 렌더', async ({ page }) => {
  await page.goto('/login');
  // 로그인 폼 또는 로고 존재 확인 (회귀 방지)
  await expect(page.locator('form')).toBeVisible();
});
```

> PLAN.md §Phase 0b 기준: `app.spec.ts` — `/login` 로딩 + 로고 표시 1개 (파일명은 auth.spec.ts로 변경).

---

## §7 Acceptance 기준

- [ ] `pnpm web test` 실행 시 Button 단위 테스트 (`button.test.tsx`) PASS
- [ ] `pnpm web test:e2e` 실행 시 Playwright `/login` 렌더 테스트 (`auth.spec.ts`) PASS (chromium)
- [ ] `<AppHeader>` + `<BottomNav>`가 `(app)/inventory` placeholder 페이지에 렌더링됨 (브라우저 수동 확인)
- [ ] primitives 7종(Button/Card/Badge/Input/Dialog/Skeleton/Toast) 모두 파일 존재 + 디자인 토큰만 사용 (`zinc-*` / `emerald-*` / `dark:*` / arbitrary values 0건 — grep 또는 수동 확인)
- [ ] `pnpm web typecheck` 0 errors
- [ ] `pnpm web lint` 0 errors
- [ ] `<QueryProvider>`가 root layout에 주입됨 — child component에서 `useQueryClient()` 호출 가능 (DevTools 또는 수동 확인)
- [ ] `pnpm dlx lefthook install` 후 `git commit` 시 gitleaks 자동 검사 실행됨

---

## §8 Definition of Done

- [ ] §7 Acceptance 기준 모두 충족
- [ ] `pnpm web typecheck` 0 errors
- [ ] `pnpm web lint` 0 errors
- [ ] `pnpm web db:check-drift` 통과 (본 phase 마이그레이션 0개라도 0001/0002 회귀 검증)
- [ ] `gitleaks detect` 통과 (`.env*` 누출 없음)
- [ ] PRD.md §3 로드맵 체크박스 Phase 0b 항목 업데이트
- [ ] `docs/CHANGELOG.md` 항목 추가 (`## v0.0.2 (Phase 0b) — App Shell + Primitives + 테스트 인프라`)
- [ ] **모바일 웹뷰 스모크 테스트** (conventions §7 — Phase 0a DB-only 면제 해당 안 됨, 본 phase는 UI 변경이므로 적용):
  1. Vercel preview deploy 완료 → preview URL 확보
  2. `apps/mobile/.env.preview` `WEB_BASE_URL` 갱신
  3. `eas build --profile preview --platform android` (Free tier ~5-10분)
  4. APK 다운 → 안드로이드 sideload → 가입 → `(app)/account` → BottomNav 표시 확인 → 로그아웃 flow 정상
- [ ] git tag `v0.0.2` 부여 (권장 — 롤백 기준점)
- [ ] Architect 검증 (ralph 프로토콜 — 별도 호출)

### 8.5 롤백 절차

| 종류 | 절차 |
|---|---|
| 코드 (primitives, widgets, lib) | `git revert <commit>` 또는 직전 tag `v0.0.1`로 리버트 |
| 의존성 추가 (tanstack-query, sonner 등) | `pnpm remove <pkg>` + `git checkout apps/web/package.json apps/web/pnpm-lock.yaml` |
| Lefthook hook | `pnpm dlx lefthook uninstall` (`.git/hooks/pre-commit` 제거) |
| Vercel | 이전 preview/production deployment로 promote (대시보드) |
| EAS 빌드 | preview profile 자동 cleanup (운영 무영향) |

---

## §9 위험 / 완화

| 위험 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| primitives 디자인 토큰 미준수 (`zinc-*`/`emerald-*`/`dark:*`) | 중 | 중 (시각 깨짐) | Acceptance §7: grep으로 금지 토큰 0건 확인. code review 시 1차 검증 |
| TanStack Query Provider root layout 미주입 | 저 | 고 (모든 useQuery 실패) | `app/layout.tsx`에 `<QueryProvider>` wrapper 명시적 추가 + DevTools 동작 확인 |
| Playwright chromium install 누락 | 저 | 중 (E2E fail) | DoD `pnpm web test:e2e` 통과 필수 — 설치 누락 시 Phase 1 진입 차단 |
| Lefthook과 기존 husky 충돌 | 저 | 중 (git commit 차단) | §0 사전 의존성: `.husky/` 부재 확인 후 진행. 충돌 시 `rm -rf .husky` |
| EAS Free tier 30분 한도 초과 | 저 | 저 (스모크 못함) | preview build 1회만. 초과 시 다음 달 or Phase 1 스모크와 합산 |
| `@radix-ui/react-dialog` 버전 충돌 | 저 | 중 | pnpm peer deps 확인. 충돌 시 sonner-only 패턴으로 Dialog 자체 구현 |

### 9.5 관측 / 로깅

- Toast가 사용자 액션 피드백 채널 — 에러 케이스도 `toast.error(message)` 패턴 사용 (Phase 1 도메인 코드에서 `Result.error` 메시지를 Toast로 전달)
- `console.error` + Vercel Function logs (conventions §12 MVP 룰 유지)
- 성능 목표: PRD.md §성능 참조

---

## (선택) 일별 작업 분배

- **Day 1**: primitives 7종 (Button/Card/Badge/Input/Dialog/Skeleton/Toast) 작성 + 디자인 토큰 grep 검증
- **Day 2**: AppHeader + BottomNav 작성 + `(app)/layout.tsx` shell 통합 + `(app)/inventory` placeholder + TanStack Query Provider 주입
- **Day 3**: Vitest 셋업 + `button.test.tsx` pass + Playwright 셋업 + `auth.spec.ts` pass
- **Day 4**: gitleaks Lefthook `lefthook install` + pre-commit hook 검증 + 모바일 웹뷰 스모크 테스트 + CHANGELOG + tag

---

## (선택) 모바일 통합

EAS preview build 1회 (DoD §8 모바일 스모크 기준):

1. `git push` → Vercel preview deploy 자동 트리거 → preview URL 확보
2. `apps/mobile/.env.preview` `WEB_BASE_URL=<preview-url>` 갱신
3. `eas build --profile preview --platform android` (Free tier 월 30분, 본 phase 빌드 ~5-10분)
4. APK 다운 → 안드로이드 sideload
5. 스모크 체크리스트:
   - [ ] 앱 실행 → `/login` 렌더 정상
   - [ ] 가입 또는 로그인 → `(app)/inventory` 진입
   - [ ] AppHeader (상단 로고/타이틀) 표시
   - [ ] BottomNav (하단 탭 4개) 표시
   - [ ] 로그아웃 → `/login` redirect 정상

**EAS 비용**: Free tier 월 30 build minutes. 본 phase ~5-10분. 월 3-6회 가능.
