'use client';

import { useIngredientCategories } from '@/entities/ingredient/lib/useIngredientCategories';

import { useFilterStore } from '../lib/use-filter-store';

interface Props {
  userId: string;
}

export function CategoryFilter({ userId }: Props) {
  const { data: categories = [] } = useIngredientCategories(userId);
  const categoryIds = useFilterStore((s) => s.categoryIds);
  const toggleCategory = useFilterStore((s) => s.toggleCategory);

  return (
    <div className="flex flex-wrap gap-8 px-16 py-8">
      {categories.map((c) => {
        const active = categoryIds.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggleCategory(c.id)}
            className={`inline-flex items-center gap-4 rounded-xs border px-12 py-4 text-button-s transition-colors ${
              active
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {c.icon && <span aria-hidden="true">{c.icon}</span>}
            <span>{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
