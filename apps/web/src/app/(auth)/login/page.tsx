import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';

import { LoginForm } from './login-form';

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/account');
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            로그인
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            이메일과 비밀번호로 로그인하세요.
          </p>
        </div>
        <LoginForm />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          계정이 없으신가요?{' '}
          <Link
            href="/signup"
            className="font-medium text-zinc-950 underline dark:text-zinc-50"
          >
            가입
          </Link>
        </p>
      </div>
    </div>
  );
}
