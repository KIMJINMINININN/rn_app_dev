// apps/web/src/features/log-cooking-session/lib/build-consumed-payload.ts
// Phase 4 §4.4 — recipe_ingredients + user_ingredients → consumed jsonb shape.
//
// 결과 shape는 0019 `log_cooking_session(p_consumed jsonb)` 인자와 1:1 매칭:
//   [{ "master_id": "<uuid>", "quantity": <numeric>, "unit": "<text>" }]
//
// 정책 (phase-4.md §4.4 + Architect 결정):
//   1. 필수 재료(`is_optional = false`)만 처리. 선택 재료는 본 Phase 차감 대상 X.
//   2. user_ingredients 중 동일 ingredient_master_id 보유 + `consumed = false`
//      + `quantity > 0` 만 합산.
//   3. 차감량 = `min(recipe.quantity, sum(user.quantity))`.
//      recipe.quantity 가 null/undefined 면 0 으로 간주 → consumed 0g 항목은 제외.
//   4. unit 은 recipe.unit 우선 (RPC 입력은 사용자 직관보다 레시피 정의가 SSoT).
//      recipe.unit 이 null/undefined 면 `'개'` fallback (RPC NOT NULL 제약 회피).
//   5. user 보유가 0 인 재료는 결과에 포함하지 않는다 (RPC 가 빈 차감 row 를
//      쓰지 않도록 클라이언트에서 가드).
//
// 본 함수는 순수 함수 — Vitest 단위 테스트(__tests__/build-consumed-payload.spec.ts)로
// 모든 분기를 검증한다.

import type { RecipeIngredientRow } from '@/entities/recipe/model/types';

export interface UserIngredientForPayload {
  ingredient_master_id: string;
  quantity: number;
  consumed: boolean;
  expires_at: string | null;
}

export interface ConsumedItem {
  master_id: string;
  quantity: number;
  unit: string;
}

const DEFAULT_UNIT = '개';

export function buildConsumedPayload(
  recipeIngredients: RecipeIngredientRow[],
  userIngredients: UserIngredientForPayload[],
): ConsumedItem[] {
  // master_id → 보유 합계 (consumed=false + quantity>0 만 누적).
  const heldByMaster = new Map<string, number>();
  for (const ui of userIngredients) {
    if (ui.consumed) continue;
    if (!Number.isFinite(ui.quantity) || ui.quantity <= 0) continue;
    const prev = heldByMaster.get(ui.ingredient_master_id) ?? 0;
    heldByMaster.set(ui.ingredient_master_id, prev + ui.quantity);
  }

  const result: ConsumedItem[] = [];
  for (const ri of recipeIngredients) {
    if (ri.is_optional) continue; // 필수만

    const held = heldByMaster.get(ri.ingredient_master_id) ?? 0;
    if (held <= 0) continue; // 보유 0 → 차감 항목 자체를 만들지 않음

    const need = Number.isFinite(ri.quantity ?? NaN) ? (ri.quantity as number) : 0;
    if (need <= 0) continue; // 레시피 수량 미정의 → 차감 0 → 제외

    const consumeQty = Math.min(need, held);
    result.push({
      master_id: ri.ingredient_master_id,
      quantity: consumeQty,
      unit: ri.unit ?? DEFAULT_UNIT,
    });
  }
  return result;
}
