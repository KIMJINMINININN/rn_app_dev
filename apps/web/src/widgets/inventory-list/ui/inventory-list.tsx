'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { StorageLocation } from '@/entities/ingredient/model/types';
import { IngredientRow } from '@/entities/ingredient/ui/ingredient-row';
import { StorageCard } from '@/entities/ingredient/ui/storage-card';
import { consumeIngredient } from '@/features/consume-ingredient/api/consumeIngredient';
import { deleteIngredient } from '@/features/delete-ingredient/api/deleteIngredient';
import {
  type InventoryItem,
  useInventoryList,
} from '@/features/list-inventory/lib/useInventoryList';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from '@/shared/ui/toast';

interface Props {
  userId: string;
  storageLocations: StorageLocation[];
}

export function InventoryList({ userId, storageLocations }: Props) {
  const queryClient = useQueryClient();
  const { data: ingredients = [], isLoading } = useInventoryList(userId);

  const consumeMutation = useMutation({
    mutationFn: consumeIngredient,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('소진 처리되었습니다');
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      } else {
        toast.error(result.error);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIngredient,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('삭제되었습니다');
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      } else {
        toast.error(result.error);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-12 px-16 py-16">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rect" height={80} />
        ))}
      </div>
    );
  }

  const grouped = new Map<string, InventoryItem[]>();
  for (const ing of ingredients) {
    const list = grouped.get(ing.storage_location_id) ?? [];
    list.push(ing);
    grouped.set(ing.storage_location_id, list);
  }

  return (
    <div className="flex flex-col gap-16 px-16 py-16">
      {storageLocations.map((s) => {
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
                  <IngredientRow
                    key={ing.id}
                    ingredient={ing}
                    onConsume={() =>
                      consumeMutation.mutate({ id: ing.id })
                    }
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
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
