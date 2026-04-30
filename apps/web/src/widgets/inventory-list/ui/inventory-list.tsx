'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { applyFilters } from '@/entities/ingredient/lib/filter';
import { applySort } from '@/entities/ingredient/lib/sort';
import { useIngredientCategories } from '@/entities/ingredient/lib/useIngredientCategories';
import type { StorageLocation } from '@/entities/ingredient/model/types';
import { IngredientRow } from '@/entities/ingredient/ui/ingredient-row';
import { InventorySummaryHeader } from '@/entities/ingredient/ui/inventory-summary-header';
import { StorageCard } from '@/entities/ingredient/ui/storage-card';
import { ConsumeIngredientSheet } from '@/features/consume-ingredient/ui/consume-ingredient-sheet';
import { deleteIngredient } from '@/features/delete-ingredient/api/deleteIngredient';
import { CategoryFilter } from '@/features/inventory-filter/ui/category-filter';
import { SortToggle } from '@/features/inventory-filter/ui/sort-toggle';
import { useFilterStore } from '@/features/inventory-filter/lib/use-filter-store';
import {
  type InventoryItem,
  useInventoryList,
} from '@/features/list-inventory/lib/useInventoryList';
import { MoveIngredientButton } from '@/features/move-ingredient/ui/move-ingredient-button';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from '@/shared/ui/toast';

interface Props {
  userId: string;
  storageLocations: StorageLocation[];
}

export function InventoryList({ userId, storageLocations }: Props) {
  const queryClient = useQueryClient();
  const { data: ingredients = [], isLoading } = useInventoryList(userId);
  const { data: categories = [] } = useIngredientCategories(userId);

  const sort = useFilterStore((s) => s.sort);
  const categoryIds = useFilterStore((s) => s.categoryIds);
  const storageId = useFilterStore((s) => s.storageId);

  const [consumeTarget, setConsumeTarget] = useState<InventoryItem | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteIngredient,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('삭제되었습니다');
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      } else {
        toast.error(result.error);
      }
    },
  });

  // categoryByMasterId Map (filterByCategories N+1 회피)
  const categoryByMasterId = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const ing of ingredients) {
      m.set(ing.ingredient_master_id, ing.master.category_id ?? null);
    }
    return m;
  }, [ingredients]);

  // 정렬 + 필터 파이프라인
  const visible = useMemo(() => {
    const filtered = applyFilters(
      ingredients,
      storageId,
      categoryIds,
      categoryByMasterId,
    );
    return applySort(filtered, sort);
  }, [ingredients, storageId, categoryIds, categoryByMasterId, sort]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-12 px-16 py-16">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rect" height={80} />
        ))}
      </div>
    );
  }

  // group by storage_location_id
  const grouped = new Map<string, InventoryItem[]>();
  for (const ing of visible) {
    const list = grouped.get(ing.storage_location_id) ?? [];
    list.push(ing);
    grouped.set(ing.storage_location_id, list);
  }

  return (
    <>
      <InventorySummaryHeader userId={userId} />

      {categories.length > 0 && <CategoryFilter userId={userId} />}

      <div className="flex items-center justify-between px-16 py-8">
        <SortToggle />
      </div>

      <div className="flex flex-col gap-16 px-16 py-16">
        {storageLocations.map((s) => {
          // storageId 필터가 적용된 경우 다른 storage 숨김
          if (storageId && storageId !== s.id) return null;
          const items = grouped.get(s.id) ?? [];
          return (
            <section key={s.id} className="flex flex-col gap-8">
              <StorageCard name={s.name} count={items.length} />
              {items.length === 0 ? (
                <p className="px-12 py-8 text-body-s-400 text-gray-500">
                  재료 없음
                </p>
              ) : (
                <div className="rounded-s border border-gray-200 bg-white">
                  {items.map((ing) => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between gap-8 border-b border-gray-100 px-12 py-8"
                    >
                      <div className="flex-1">
                        <IngredientRow
                          ingredient={ing}
                          onConsume={() => setConsumeTarget(ing)}
                          onDelete={() => {
                            if (
                              window.confirm(
                                `${ing.master.name}을(를) 삭제하시겠어요?`,
                              )
                            ) {
                              deleteMutation.mutate({ id: ing.id });
                            }
                          }}
                        />
                      </div>
                      <MoveIngredientButton
                        ingredientId={ing.id}
                        currentStorageId={ing.storage_location_id}
                        storageLocations={storageLocations}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {consumeTarget && (
        <ConsumeIngredientSheet
          open={!!consumeTarget}
          onOpenChange={(open) => {
            if (!open) setConsumeTarget(null);
          }}
          ingredientId={consumeTarget.id}
          ingredientName={consumeTarget.master.name}
          currentQuantity={Number(consumeTarget.quantity)}
          unit={consumeTarget.unit}
        />
      )}
    </>
  );
}
