'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTransition } from 'react';

import type { StorageLocation } from '@/entities/ingredient/model/types';
import { toast } from '@/shared/ui/toast';

import { moveIngredient } from '../api/moveIngredient';

interface Props {
  ingredientId: string;
  currentStorageId: string;
  storageLocations: StorageLocation[];
}

export function MoveIngredientButton({
  ingredientId,
  currentStorageId,
  storageLocations,
}: Props) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const move = useMutation({
    mutationFn: moveIngredient,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('보관 장소가 변경되었습니다');
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      } else {
        toast.error(result.error);
      }
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStorageId = e.target.value;
    if (newStorageId === currentStorageId) return;
    startTransition(() => {
      move.mutate({ id: ingredientId, newStorageId });
    });
  };

  return (
    <select
      value={currentStorageId}
      onChange={handleChange}
      disabled={isPending}
      aria-label="보관 장소 변경"
      className="h-32 rounded-xs border border-gray-300 bg-white px-8 text-button-s text-gray-900 disabled:opacity-50"
    >
      {storageLocations.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
