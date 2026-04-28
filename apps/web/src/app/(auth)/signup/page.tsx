import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';

import { SignupForm } from './signup-form';

export default async function SignupPage() {
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
            가입
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            이메일과 비밀번호로 새 계정을 만듭니다.
          </p>
        </div>
        <SignupForm />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          이미 계정이 있나요?{' '}
          <Link
            href="/login"
            className="font-medium text-zinc-950 underline dark:text-zinc-50"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
