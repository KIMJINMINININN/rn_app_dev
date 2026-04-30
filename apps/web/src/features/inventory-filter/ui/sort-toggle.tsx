'use client';

import type { SortMode } from '@/entities/ingredient/lib/sort';

import { useFilterStore } from '../lib/use-filter-store';

const OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'expiring', label: '임박순' },
  { value: 'recent', label: '최근' },
  { value: 'name', label: '이름' },
];

export function SortToggle() {
  const sort = useFilterStore((s) => s.sort);
  const setSort = useFilterStore((s) => s.setSort);

  return (
    <div className="inline-flex rounded-s border border-gray-200 bg-white p-2">
      {OPTIONS.map((opt) => {
        const active = opt.value === sort;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSort(opt.value)}
            className={`rounded-xs px-12 py-4 text-button-s transition-colors ${
              active
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
