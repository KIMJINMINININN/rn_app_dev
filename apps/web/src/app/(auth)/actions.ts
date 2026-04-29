'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';

export type AuthFormState = {
  error: string | null;
  info: string | null;
};

const EMAIL_NOT_CONFIRMED_MESSAGE =
  '이메일 확인이 필요합니다. 받은 편지함에서 확인 메일의 링크를 눌러주세요.';

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 모두 입력해 주세요.', info: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message, info: null };
  }

  // Supabase "Confirm email" ON일 때 signUp 직후 session이 null
  if (!data.session) {
    return {
      error: null,
      info: '확인 메일을 보냈습니다. 받은 편지함에서 링크를 눌러 가입을 완료해 주세요.',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/account');
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 모두 입력해 주세요.', info: null };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === 'email_not_confirmed') {
      return { error: EMAIL_NOT_CONFIRMED_MESSAGE, info: null };
    }
    return { error: error.message, info: null };
  }

  revalidatePath('/', 'layout');
  redirect('/account');
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
