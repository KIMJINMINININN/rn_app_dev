import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { AppShell } from '@/widgets/app-shell';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';

/**
 * (app) 라우트 그룹 레이아웃 — 인증 영역 공통 셸 + 인증 가드 (Develop §6.4 / §10).
 *
 * 모든 인증 후 화면(캘린더/기술/검색/프로필)을 AppShell(검색바+내비+FAB)로 감싼다.
 *
 * 인증 가드(env 게이팅):
 *  - NEXT_PUBLIC_AUTH_ENABLED=false(현재/인프라 전): 가드를 건너뛴다 →
 *    Supabase를 만지지 않으므로 (app) 라우트는 정적 프리렌더 가능(앱 셸 탐색 유지).
 *  - NEXT_PUBLIC_AUTH_ENABLED=true(인프라 후): getUser()로 세션 검증, 없으면 /login으로 redirect.
 *    이 시점부터 (app)은 동적 렌더가 된다(쿠키 접근).
 */
export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  if (isAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect('/login');
  }

  return <AppShell>{children}</AppShell>;
}
