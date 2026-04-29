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
              새 계정 만들기
            </p>
          </div>

          <SignupForm />

          <p className="mt-24 text-center text-body-s-400 text-gray-500">
            이미 계정이 있나요?{' '}
            <Link
              href="/login"
              className="font-semibold text-green-600 underline-offset-2 hover:underline hover:text-green-700"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
