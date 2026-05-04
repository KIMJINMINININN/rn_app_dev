'use client';

// apps/web/src/entities/shopping-item/ui/shopping-item-row.tsx
// Phase 5 §3.2 — entities/shopping-item UI.
//
// 1개 row UI:
//   - 체크박스 (클릭 → toggleBought Server Action)
//   - 이름 (custom_name ?? master_name) + quantity / unit + note (있으면 강조)
//   - 우측: CommerceLinkMenu (env 토글 활성 사이트만)
//   - 삭제 버튼 (deleteShoppingItem)
//
// FSD 위치 결정 — entities/* 안에 있지만 features Server Actions 를 직접 호출.
// phase-5.md §3.2 표가 이 파일을 entities 슬라이스에 두도록 명시. features import 는
// "단일 row UI 가 자기 mutation 책임을 들고 있어야 페이지/위젯 재사용성이 올라감" 이라는
// 전제를 따름. (Phase 0a 수립된 entities ↔ features 경계 예외 — 본 파일은 client wrapper).
//
// Optimistic UX: useTransition + 로컬 state 로 즉각 반영, 실패 시 revert.

import { useTransition, useState } from 'react';

import type { ShoppingItem } from '@/entities/shopping-item/model/types';
import { deleteShoppingItem } from '@/features/delete-shopping-item/api/actions';
import { CommerceLinkMenu } from '@/features/commerce-deeplink/ui/commerce-link-menu';
import { toggleBought } from '@/features/toggle-bought/api/actions';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';

interface Props {
  item: ShoppingItem;
  /** ingredient_master_id → 이름 lookup (RSC 가 미리 fetch) */
  masterNames?: Map<string, string>;
}

export function ShoppingItemRow({ item, masterNames }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticBought, setOptimisticBought] = useState(item.bought);

  const displayName =
    item.custom_name ??
    (item.ingredient_master_id
      ? (masterNames?.get(item.ingredient_master_id) ?? '이름 없음')
      : '이름 없음');

  const showQuantity = item.quantity != null && item.quantity > 0;

  const handleToggle = () => {
    const next = !optimisticBought;
    setOptimisticBought(next);
    startTransition(async () => {
      const res = await toggleBought(item.id, next);
      if (!res.ok) {
        setOptimisticBought(!next);
        toast.error(res.error);
      }
    });
  };

  const handleDelete = () => {
    if (!window.confirm(`'${displayName}'을(를) 삭제하시겠어요?`)) return;
    startTransition(async () => {
      const res = await deleteShoppingItem(item.id);
      if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <li className="flex items-start gap-12 rounded-s border border-gray-200 bg-white px-12 py-12">
      <label className="flex shrink-0 items-center pt-4">
        <input
          type="checkbox"
          checked={optimisticBought}
          onChange={handleToggle}
          disabled={isPending}
          className="h-20 w-20 rounded-xxs border-gray-300 text-primary-600 focus:ring-primary-200"
          aria-label={`${displayName} 구매 ${optimisticBought ? '취소' : '완료'}`}
        />
      </label>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-baseline gap-8">
          <span
            className={`text-body-m-500 ${
              optimisticBought ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
          >
            {displayName}
          </span>
          {showQuantity && (
            <span className="text-body-s-400 text-gray-600">
              {item.quantity}
              {item.unit ?? ''}
            </span>
          )}
        </div>

        {item.note && (
          <p className="text-body-xs-400 text-yellow-600">⚠ {item.note}</p>
        )}

        <div className="pt-4">
          <CommerceLinkMenu ingredientName={displayName} />
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
        aria-label={`${displayName} 삭제`}
      >
        삭제
      </Button>
    </li>
  );
}
