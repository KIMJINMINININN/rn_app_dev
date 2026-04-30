import type { IngredientWithMaster } from '@/entities/ingredient/model/types';

export type SortMode = 'expiring' | 'recent' | 'name';

export function sortByExpiring(items: IngredientWithMaster[]): IngredientWithMaster[] {
  return [...items].sort((a, b) => {
    if (a.expires_at == null && b.expires_at == null) return 0;
    if (a.expires_at == null) return 1;
    if (b.expires_at == null) return -1;
    if (a.expires_at !== b.expires_at) return a.expires_at < b.expires_at ? -1 : 1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}

export function sortByRecent(items: IngredientWithMaster[]): IngredientWithMaster[] {
  return [...items].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
}

export function sortByName(items: IngredientWithMaster[]): IngredientWithMaster[] {
  return [...items].sort((a, b) =>
    a.master.name.localeCompare(b.master.name, 'ko'),
  );
}

export function applySort(items: IngredientWithMaster[], mode: SortMode): IngredientWithMaster[] {
  switch (mode) {
    case 'expiring':
      return sortByExpiring(items);
    case 'recent':
      return sortByRecent(items);
    case 'name':
      return sortByName(items);
  }
}
