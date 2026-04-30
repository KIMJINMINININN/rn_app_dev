'use client';

import { create } from 'zustand';

import type { SortMode } from '@/entities/ingredient/lib/sort';

interface FilterState {
  sort: SortMode;
  categoryIds: string[];
  storageId: string | null;
  setSort: (s: SortMode) => void;
  toggleCategory: (id: string) => void;
  setStorageId: (id: string | null) => void;
  reset: () => void;
}

const initial = {
  sort: 'expiring' as SortMode,
  categoryIds: [] as string[],
  storageId: null as string | null,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initial,
  setSort: (sort) => set({ sort }),
  toggleCategory: (id) =>
    set((state) => ({
      categoryIds: state.categoryIds.includes(id)
        ? state.categoryIds.filter((c) => c !== id)
        : [...state.categoryIds, id],
    })),
  setStorageId: (storageId) => set({ storageId }),
  reset: () => set(initial),
}));
