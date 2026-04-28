'use client';

import { useTransition } from 'react';

import { logoutAction } from '../(auth)/actions';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => logoutAction())}
      className="flex h-10 w-full items-center justify-center rounded-md border border-zinc-300 bg-white text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
    >
      {isPending ? '로그아웃 중…' : '로그아웃'}
    </button>
  );
}
