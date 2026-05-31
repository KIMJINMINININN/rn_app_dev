/**
 * 로그인 (F1 / Develop §6.4) — 인프라 연결 전 셸.
 *
 * (auth) 그룹은 AppShell 크롬 없이 중앙 정렬 단일 화면.
 * TODO(F1): login-form.tsx(client) + (auth)/actions.ts의 login Server Action 연결(Supabase).
 *   지금은 폼/서버액션 없이 자리만(인프라 last 제약).
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--surface-app)] px-6">
      <div className="w-full max-w-sm rounded-l border border-[var(--border-subtle)] bg-[var(--surface-base)] p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-heading-l text-[var(--text-strong)]">로그인</h1>
        <p className="mt-1 text-body-s-400 text-[var(--text-muted)]">
          트레이닝 저널에 로그인하세요.
        </p>

        {/* TODO(F1): <LoginForm /> — 이메일/비밀번호 입력 + login Server Action. */}
        <div className="mt-6 rounded-m border border-dashed border-[var(--border-default)] p-6 text-center text-body-s-400 text-[var(--text-disabled)]">
          로그인 폼 (준비 중)
        </div>
      </div>
    </main>
  );
}
