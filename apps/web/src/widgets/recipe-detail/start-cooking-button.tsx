'use client';

// apps/web/src/widgets/recipe-detail/start-cooking-button.tsx
// Phase 4 Day 6 — recipe-detail "요리 시작" 버튼 + LogCookingDialog 통합 wrapper.
//
// 책임 (SoC — RSC widget 순수성 유지):
//   1. Client-only: open state(useState) + 다이얼로그 토글
//   2. recipe-detail.tsx (RSC) 안에 import 되어 button 만 렌더, dialog 는 Portal 로 띄움
//   3. LogCookingDialog 는 재료 차감 미리보기 + 평점/메모 폼 + Server Action 호출
//
// FSD 위치 결정: widgets/recipe-detail/* 안 — recipe-detail widget 의 보조 client
//   조각 (외부 features 와 directly 통신할 책임이 있음). features/log-cooking-session
//   은 Day 4 산출물 → 본 wrapper 에서 import 만 사용. 본 wrapper 자체를 widget
//   슬라이스 안에 둠으로써 widget 책임 (entities + features 조립) 유지.
//
// props 는 RSC page 가 미리 fetch 해 둔 데이터를 prop drilling 으로 전달.

import { useState } from 'react';

import type {
  RecipeIngredientRow,
  RecipeMaster,
} from '@/entities/recipe/model/types';
import { LogCookingDialog } from '@/features/log-cooking-session/ui/log-cooking-dialog';
import type { UserIngredientForPayload } from '@/features/log-cooking-session/lib/build-consumed-payload';
import { Button } from '@/shared/ui/button';

interface Props {
  recipe: RecipeMaster;
  recipeIngredients: RecipeIngredientRow[];
  userIngredients: UserIngredientForPayload[];
  /** master_id → ingredient name. 미리보기 라벨용. */
  ingredientNames: Map<string, string>;
}

export function StartCookingButton({
  recipe,
  recipeIngredients,
  userIngredients,
  ingredientNames,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        onClick={() => setOpen(true)}
        aria-label={`${recipe.name} 요리 시작`}
      >
        요리 시작
      </Button>
      {open && (
        <LogCookingDialog
          open={open}
          onClose={() => setOpen(false)}
          recipe={recipe}
          recipeIngredients={recipeIngredients}
          userIngredients={userIngredients}
          ingredientNames={ingredientNames}
        />
      )}
    </>
  );
}
