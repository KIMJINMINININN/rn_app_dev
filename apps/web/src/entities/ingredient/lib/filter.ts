import type { IngredientWithMaster } from '@/entities/ingredient/model/types';

export function filterByStorage(
  items: IngredientWithMaster[],
  storageId: string | null,
): IngredientWithMaster[] {
  if (!storageId) return items;
  return items.filter((i) => i.storage_location_id === storageId);
}

export function filterByCategories(
  items: IngredientWithMaster[],
  categoryIds: string[],
  categoryByMasterId: Map<string, string | null>,
): IngredientWithMaster[] {
  if (categoryIds.length === 0) return items;
  const set = new Set(categoryIds);
  return items.filter((i) => {
    const cat = categoryByMasterId.get(i.ingredient_master_id);
    return cat !== null && cat !== undefined && set.has(cat);
  });
}

export function applyFilters(
  items: IngredientWithMaster[],
  storageId: string | null,
  categoryIds: string[],
  categoryByMasterId: Map<string, string | null>,
): IngredientWithMaster[] {
  return filterByCategories(
    filterByStorage(items, storageId),
    categoryIds,
    categoryByMasterId,
  );
}
