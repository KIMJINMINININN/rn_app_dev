'use client';

import { Button } from '@/shared/ui/button';

import type { IngredientMaster, UserIngredient } from '../model/types';

import { DDayBadge } from './dday-badge';

interface Props {
  ingredient: UserIngredient & { master: Pick<IngredientMaster, 'name'> };
  onConsume?: () => void;
  onDelete?: () => void;
}

export function IngredientRow({ ingredient, onConsume, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between gap-12 border-b border-gray-100 px-16 py-12">
      <div className="flex flex-col gap-4">
        <span className="text-body-m-500 text-gray-900">
          {ingredient.master.name}
        </span>
        <span className="text-body-xs-400 text-gray-500">
          {ingredient.quantity} {ingredient.unit}
        </span>
      </div>
      <div className="flex items-center gap-8">
        <DDayBadge expiresAt={ingredient.expires_at} />
        {onConsume && (
          <Button variant="ghost" size="sm" onClick={onConsume}>
            소진
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete}>
            삭제
          </Button>
        )}
      </div>
    </div>
  );
}
