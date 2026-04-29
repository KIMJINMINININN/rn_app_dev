'use client';

import { useActionState } from 'react';

import { signupAction, type AuthFormState } from '../actions';

const initialState: AuthFormState = { error: null };

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="space-y-20">
      <div>
        <label
          htmlFor="signup-email"
          className="mb-8 block text-body-xs-500 text-gray-700"
        >
          이메일
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="block h-48 w-full rounded-m border border-gray-300 bg-white px-16 text-body-s-400 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="signup-password"
          className="mb-8 block text-body-xs-500 text-gray-700"
        >
          비밀번호
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="6자 이상 입력하세요"
          className="block h-48 w-full rounded-m border border-gray-300 bg-white px-16 text-body-s-400 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50"
        />
      </div>

      {state.error ? (
        <div className="flex items-start gap-12 rounded-m border border-red-200 bg-red-100 px-16 py-12">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-2 h-16 w-16 shrink-0 text-red-500"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-body-xs-400 text-red-700">{state.error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-48 w-full items-center justify-center rounded-m bg-green-500 text-button-l text-white transition-all hover:bg-green-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <span className="flex items-center gap-8">
            <svg
              className="h-16 w-16 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            가입 중…
          </span>
        ) : (
          '회원가입'
        )}
      </button>
    </form>
  );
}
