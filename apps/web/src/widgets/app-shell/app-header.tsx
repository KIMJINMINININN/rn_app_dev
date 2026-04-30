import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-56 items-center justify-between border-b border-gray-200 bg-white px-16">
      <span className="text-heading-s text-gray-900">냉장고 매니저</span>
      <Link
        href="/account"
        aria-label="마이페이지"
        className="inline-flex h-40 w-40 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
        </svg>
      </Link>
    </header>
  );
}
