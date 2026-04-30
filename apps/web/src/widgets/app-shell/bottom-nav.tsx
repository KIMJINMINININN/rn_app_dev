'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = {
  href: string | null;
  label: string;
  icon: React.ReactNode;
};

const TABS: Tab[] = [
  { href: '/inventory', label: '인벤토리', icon: <InventoryIcon /> },
  { href: null, label: '레시피', icon: <RecipeIcon /> },
  { href: null, label: '히스토리', icon: <HistoryIcon /> },
  { href: '/account', label: '마이페이지', icon: <ProfileIcon /> },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid h-56 grid-cols-4 border-t border-gray-200 bg-white">
      {TABS.map((tab) => {
        const isActive = tab.href ? pathname.startsWith(tab.href) : false;
        const isDisabled = tab.href === null;

        const baseClass =
          'flex h-full flex-col items-center justify-center gap-2 transition-colors';
        const stateClass = isDisabled
          ? 'text-gray-300 cursor-not-allowed'
          : isActive
            ? 'text-primary-600'
            : 'text-gray-500 hover:text-gray-700';

        if (isDisabled) {
          return (
            <span
              key={tab.label}
              aria-disabled="true"
              className={`${baseClass} ${stateClass}`}
            >
              {tab.icon}
              <span className="text-button-xxs">{tab.label}</span>
            </span>
          );
        }

        return (
          <Link
            key={tab.label}
            href={tab.href!}
            aria-current={isActive ? 'page' : undefined}
            className={`${baseClass} ${stateClass}`}
          >
            {tab.icon}
            <span className="text-button-xxs">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function InventoryIcon() {
  return (
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
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M5 11h14" />
      <path d="M9 7v0" />
      <path d="M9 15v0" />
    </svg>
  );
}

function RecipeIcon() {
  return (
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
      <path d="M4 4v16a2 2 0 0 0 2 2h14V2H6a2 2 0 0 0-2 2z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function HistoryIcon() {
  return (
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ProfileIcon() {
  return (
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
  );
}
