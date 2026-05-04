'use client';

// apps/web/src/features/extract-recipe-gap/ui/extract-gap-button.tsx
// Phase 5 §3.3 — 레시피 상세 "부족 재료 장바구니에 담기" 버튼.
//
// 흐름:
//   1) 클릭 → useTransition + extractRecipeGap(recipeId) 호출
//   2) 성공: toast.success("장바구니에 N개 추가됨") + Link to /shopping
//      (Link 는 toast 한국어 안내로 갈음 — UX 단순)
//   3) 실패: toast.error(error)
//
// 후속 invalidate 는 server-side revalidatePath('/shopping') 가 처리.

import { useTransition } from 'react';

import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';

import { extractRecipeGap } from '../api/actions';

interface Props {
  recipeId: string;
}

export function ExtractGapButton({ recipeId }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const res = await extractRecipeGap(recipeId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.value.added === 0) {
        toast.success('이미 모든 재료를 보유하고 있어요');
      } else {
        toast.success(`장바구니에 ${res.value.added}개 추가됨`, {
          description: '/shopping 페이지에서 확인하세요',
        });
      }
    });
  };

  return (
    <Button
      variant="secondary"
      size="md"
      onClick={handleClick}
      loading={isPending}
      aria-label="부족 재료 장바구니에 담기"
    >
      부족 재료 담기
    </Button>
  );
}
