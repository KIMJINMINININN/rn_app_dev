import type { ReactNode } from 'react';
import { AppShell } from '@/widgets/app-shell';

/**
 * (app) 라우트 그룹 레이아웃 — 인증 영역 공통 셸 (Develop §6.4).
 *
 * 모든 인증 후 화면(캘린더/기술/검색/프로필)을 AppShell(검색바+내비+FAB)로 감싼다.
 *
 * 인증 가드(스텁): 아직 Supabase 미연결(인프라 last) → 가드 미동작, children 그대로 렌더.
 * TODO(F1): 세션 없으면 `/login`으로 redirect — Develop §10.
 *   예) const supabase = await createSupabaseServerClient();
 *       const { data } = await supabase.auth.getUser();
 *       if (!data.user) redirect('/login');
 *   (지금은 createSupabaseServerClient 호출 금지 — 인프라 프로비저닝 후 활성화.)
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
