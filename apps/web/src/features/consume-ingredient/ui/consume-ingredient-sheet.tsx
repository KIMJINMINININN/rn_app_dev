'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useTransition } from 'react';

import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';

import { consumeIngredient } from '../api/consumeIngredient';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredientId: string;
  ingredientName: string;
  currentQuantity: number;
  unit: string;
}

const QUICK_PERCENTS = [25, 50, 75, 100];

export function ConsumeIngredientSheet({
  open,
  onOpenChange,
  ingredientId,
  ingredientName,
  currentQuantity,
  unit,
}: Props) {
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const consume = useMutation({
    mutationFn: consumeIngredient,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('소진 처리되었습니다');
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    },
  });

  const handleConsume = (percent: number) => {
    setSelectedPercent(percent);
    const consumed = (currentQuantity * percent) / 100;
    const newQuantity = Math.max(0, currentQuantity - consumed);
    startTransition(() => {
      consume.mutate({ id: ingredientId, newQuantity });
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${ingredientName} 소진`}
      description={`현재 수량: ${currentQuantity} ${unit}`}
    >
      <div className="flex flex-col gap-12">
        <p className="text-body-s-400 text-gray-700">얼마나 소진하셨어요?</p>
        <div className="grid grid-cols-2 gap-8">
          {QUICK_PERCENTS.map((p) => (
            <Button
              key={p}
              variant={selectedPercent === p ? 'primary' : 'secondary'}
              size="md"
              onClick={() => handleConsume(p)}
              loading={isPending && selectedPercent === p}
            >
              {p === 100 ? '전부 소진' : `${p}% 소진`}
            </Button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
