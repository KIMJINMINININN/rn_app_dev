'use client';

// apps/web/src/entities/ingredient/ui/ingredient-row.tsx
// Phase 4 §3.6 — entities/ingredient 확장:
//   재료 이름/수량 영역 클릭 시 `/(app)/inventory/[ingredient_master_id]`로 이동
//   (듀얼 추천 페이지). 액션 버튼(소진/삭제)은 Link 영역 밖에 두어 button-in-anchor
//   invalid HTML 회피. MoveIngredientButton(외부)은 호출처에서 별도로 배치되므로
//   본 컴포넌트와 충돌 없음.

import Link from 'next/link';

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
      <Link
        href={`/inventory/${ingredient.ingredient_master_id}`}
        className="flex flex-col gap-4 flex-1 min-w-0 hover:opacity-70 transition-opacity"
        aria-label={`${ingredient.master.name} 추천 레시피 보기`}
      >
        <span className="text-body-m-500 text-gray-900 truncate">
          {ingredient.master.name}
        </span>
        <span className="text-body-xs-400 text-gray-500">
          {ingredient.quantity} {ingredient.unit}
        </span>
      </Link>
      <div className="flex items-center gap-8 shrink-0">
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
