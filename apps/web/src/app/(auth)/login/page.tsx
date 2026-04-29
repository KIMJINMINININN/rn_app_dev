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
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gray-50 px-16 py-64">
      {/* Subtle radial gradient behind the card */}
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 30%, #b1f2cf 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-[440px]">
        {/* Card */}
        <div className="rounded-l border border-gray-200 bg-white px-40 py-48 shadow-xl">
          {/* Service identifier */}
          <div className="mb-32 flex flex-col items-center gap-8 text-center">
            <div className="flex h-56 w-56 items-center justify-center rounded-l bg-green-100" style={{ fontSize: 28 }}>
              🥬
            </div>
            <h1 className="text-heading-l text-gray-900">
              냉장고 매니저
            </h1>
            <p className="text-body-s-400 text-gray-500">
              계정에 로그인하세요
            </p>
          </div>

          <LoginForm />

          <p className="mt-24 text-center text-body-s-400 text-gray-500">
            계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="font-semibold text-green-600 underline-offset-2 hover:underline hover:text-green-700"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
