import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';

import { LogoutButton } from './logout-button';

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            내 계정
          </h1>
          <p className="text-sm text-zinc-600">
            로그인 세션이 정상 동작합니다.
          </p>
        </div>
        <dl className="space-y-2 rounded-md border border-zinc-200 bg-white p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">이메일</dt>
            <dd className="font-medium text-zinc-950">
              {user.email}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">User ID</dt>
            <dd className="truncate font-mono text-xs text-zinc-950">
              {user.id}
            </dd>
          </div>
        </dl>
        <LogoutButton />
      </div>
    </div>
  );
}
