'use client';

// apps/web/src/features/log-cooking-session/ui/log-cooking-dialog.tsx
// Phase 4 §3.2 — "요리 시작" 다이얼로그.
//
// 책임:
//   1. recipe + 사용자 인벤토리 → buildConsumedPayload() 미리보기 표시
//   2. 평점(1-5) + 메모(<=500자) 입력
//   3. 확정 클릭 → logCookingSession Server Action 호출 (useTransition)
//   4. 성공 → toast + queryClient.invalidate(['cooking-history'], ['ingredients'],
//      ['inventory-summary']) + onClose
//   5. 실패 → toast.error + 재시도 가능 (다이얼로그 유지)
//
// 참조 패턴: features/consume-ingredient/ui/consume-ingredient-sheet.tsx
//   (Dialog + useMutation + useTransition + toast).
//
// Custom recipe (recipe = null) 입력 UI 는 Day 6 통합 시점에서 추가하기로 하고
// 본 Day 4 에서는 recipe 가 주어진 경우만 처리한다 (타입 가드만 노출).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useTransition } from 'react';

import type {
  RecipeIngredientRow,
  RecipeMaster,
} from '@/entities/recipe/model/types';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';

import { logCookingSession } from '../api/log-cooking-session';
import {
  buildConsumedPayload,
  type ConsumedItem,
  type UserIngredientForPayload,
} from '../lib/build-consumed-payload';

interface Props {
  open: boolean;
  onClose: () => void;
  recipe: RecipeMaster;
  recipeIngredients: RecipeIngredientRow[];
  userIngredients: UserIngredientForPayload[];
  /** master_id → ingredient name. 미리보기 라벨용. 미해석 master_id 는 fallback 표시. */
  ingredientNames: Map<string, string>;
}

const RATING_VALUES = [1, 2, 3, 4, 5] as const;
const MEMO_MAX = 500;

export function LogCookingDialog({
  open,
  onClose,
  recipe,
  recipeIngredients,
  userIngredients,
  ingredientNames,
}: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const consumed: ConsumedItem[] = useMemo(
    () => buildConsumedPayload(recipeIngredients, userIngredients),
    [recipeIngredients, userIngredients],
  );

  const mutation = useMutation({
    mutationFn: logCookingSession,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('요리 기록을 저장했습니다');
        // conventions §17.2 — 가장 일반적 prefix 단위 invalidate
        queryClient.invalidateQueries({ queryKey: ['cooking-history'] });
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
        // 폼 초기화 + 닫기
        setRating(null);
        setMemo('');
        onClose();
      } else {
        toast.error(result.error);
      }
    },
    onError: (e) => {
      console.error('[LogCookingDialog] mutation error', e);
      toast.error('요리 기록 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    },
  });

  const handleSubmit = () => {
    startTransition(() => {
      mutation.mutate({
        recipeId: recipe.id,
        customRecipeName: null,
        consumed,
        rating,
        memo: memo.trim().length > 0 ? memo.trim() : null,
      });
    });
  };

  const handleClose = () => {
    if (isPending || mutation.isPending) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && handleClose()}
      title={`${recipe.name} 요리 시작`}
      description="아래 재료가 인벤토리에서 차감됩니다. 평점과 메모는 선택입니다."
    >
      <div className="flex flex-col gap-16">
        {/* 차감 미리보기 */}
        <section className="flex flex-col gap-8">
          <h3 className="text-body-s-500 text-gray-700">차감 재료</h3>
          {consumed.length === 0 ? (
            <p className="text-body-s-400 text-gray-500">
              차감할 재료가 없습니다 (보유 0). 그래도 기록만 저장합니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {consumed.map((c) => (
                <li
                  key={c.master_id}
                  className="flex items-center justify-between rounded-xs bg-gray-50 px-12 py-8"
                >
                  <span className="text-body-s-400 text-gray-900">
                    {ingredientNames.get(c.master_id) ?? c.master_id}
                  </span>
                  <span className="text-body-s-500 text-gray-700">
                    {c.quantity}
                    {c.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 평점 */}
        <section className="flex flex-col gap-8">
          <h3 className="text-body-s-500 text-gray-700">평점 (선택)</h3>
          <div className="flex gap-8" role="radiogroup" aria-label="평점">
            {RATING_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={rating === v}
                onClick={() => setRating(rating === v ? null : v)}
                className={`h-32 w-32 rounded-xs text-body-s-500 transition-colors ${
                  rating !== null && v <= rating
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </section>

        {/* 메모 */}
        <section className="flex flex-col gap-8">
          <Input
            label="메모 (선택)"
            placeholder="요리 후 한 줄 메모"
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX))}
            helper={`${memo.length} / ${MEMO_MAX}`}
            maxLength={MEMO_MAX}
          />
        </section>

        {/* 액션 */}
        <div className="flex justify-end gap-8 pt-8">
          <Button
            variant="ghost"
            size="md"
            onClick={handleClose}
            disabled={isPending || mutation.isPending}
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={isPending || mutation.isPending}
          >
            확정
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
