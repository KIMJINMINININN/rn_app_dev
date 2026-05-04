// apps/web/src/features/log-cooking-session/lib/__tests__/build-consumed-payload.spec.ts
// Phase 4 §6.1 — buildConsumedPayload 단위 테스트.
//
// 검증 시나리오:
//   1. 풀 매칭: 필수 5재료 + user 5보유 → consumed 5건, recipe quantity 그대로.
//   2. 부분 보유: 필수 5재료 + user 3보유 → 보유한 3건만 결과에 포함.
//   3. 선택 재료 제외: 필수 3 + 선택 2 → consumed 3건 (선택은 모두 제외).
//   4. 보유 부족: recipe 200g 필요 + user 100g 보유 → quantity = 100 (min).
//   5. 빈 user 인벤토리 → consumed = [].
// 추가 sanity:
//   6. consumed=true / quantity<=0 보유는 무시.
//   7. recipe.quantity null → 결과에서 제외 (차감 0 가드).
//   8. recipe.unit null → '개' fallback.
//   9. 동일 master_id 보유 다중 row → 합산.

import { describe, expect, it } from 'vitest';

import type { RecipeIngredientRow } from '@/entities/recipe/model/types';

import {
  buildConsumedPayload,
  type UserIngredientForPayload,
} from '../build-consumed-payload';

const RECIPE_ID = 'recipe-0';

const REQUIRED_IDS = ['m-1', 'm-2', 'm-3', 'm-4', 'm-5'] as const;
const OPTIONAL_IDS = ['o-1', 'o-2'] as const;

function makeRequired(
  ingredient_master_id: string,
  quantity: number | null = 100,
  unit: string | null = 'g',
): RecipeIngredientRow {
  return {
    recipe_id: RECIPE_ID,
    ingredient_master_id,
    quantity,
    unit,
    is_optional: false,
  };
}

function makeOptional(
  ingredient_master_id: string,
  quantity: number | null = 1,
  unit: string | null = 'tsp',
): RecipeIngredientRow {
  return {
    recipe_id: RECIPE_ID,
    ingredient_master_id,
    quantity,
    unit,
    is_optional: true,
  };
}

function makeHeld(
  ingredient_master_id: string,
  quantity = 100,
  opts: Partial<UserIngredientForPayload> = {},
): UserIngredientForPayload {
  return {
    ingredient_master_id,
    quantity,
    consumed: false,
    expires_at: null,
    ...opts,
  };
}

describe('buildConsumedPayload — Phase 4 §6.1', () => {
  it('full_match: 필수 5 + user 5보유 → consumed 5건', () => {
    const recipe = REQUIRED_IDS.map((id) => makeRequired(id, 100, 'g'));
    const user = REQUIRED_IDS.map((id) => makeHeld(id, 200));

    const result = buildConsumedPayload(recipe, user);
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.master_id)).toEqual([...REQUIRED_IDS]);
    for (const item of result) {
      expect(item.quantity).toBe(100);
      expect(item.unit).toBe('g');
    }
  });

  it('partial_holding: 필수 5 + user 3보유 → consumed 3건만 (보유한 것만)', () => {
    const recipe = REQUIRED_IDS.map((id) => makeRequired(id, 100, 'g'));
    const user = ['m-1', 'm-2', 'm-3'].map((id) => makeHeld(id, 200));

    const result = buildConsumedPayload(recipe, user);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.master_id)).toEqual(['m-1', 'm-2', 'm-3']);
  });

  it('optional_excluded: 필수 3 + 선택 2 → consumed 3건 (선택 제외)', () => {
    const recipe: RecipeIngredientRow[] = [
      makeRequired('m-1'),
      makeRequired('m-2'),
      makeRequired('m-3'),
      makeOptional('o-1'),
      makeOptional('o-2'),
    ];
    const user = [
      ...['m-1', 'm-2', 'm-3'].map((id) => makeHeld(id, 200)),
      ...OPTIONAL_IDS.map((id) => makeHeld(id, 5)),
    ];

    const result = buildConsumedPayload(recipe, user);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.master_id)).toEqual(['m-1', 'm-2', 'm-3']);
    // 선택 재료는 결과 잭재 X
    expect(result.find((r) => r.master_id === 'o-1')).toBeUndefined();
    expect(result.find((r) => r.master_id === 'o-2')).toBeUndefined();
  });

  it('insufficient_holding: recipe 200g 필요 + user 100g 보유 → quantity = 100 (min)', () => {
    const recipe = [makeRequired('m-1', 200, 'g')];
    const user = [makeHeld('m-1', 100)];

    const result = buildConsumedPayload(recipe, user);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ master_id: 'm-1', quantity: 100, unit: 'g' });
  });

  it('empty_user_inventory: 빈 user → consumed 빈 배열', () => {
    const recipe = REQUIRED_IDS.map((id) => makeRequired(id, 100, 'g'));
    const result = buildConsumedPayload(recipe, []);
    expect(result).toEqual([]);
  });

  it('consumed/quantity≤0 보유는 무시된다 (gate sanity)', () => {
    const recipe = [
      makeRequired('m-1', 100, 'g'),
      makeRequired('m-2', 100, 'g'),
      makeRequired('m-3', 100, 'g'),
    ];
    const user: UserIngredientForPayload[] = [
      makeHeld('m-1', 50, { consumed: true }), // consumed=true → 무시
      makeHeld('m-2', 0), // quantity=0 → 무시
      makeHeld('m-3', 200), // 정상 보유
    ];

    const result = buildConsumedPayload(recipe, user);
    expect(result).toHaveLength(1);
    expect(result[0]?.master_id).toBe('m-3');
  });

  it('recipe.quantity = null → 차감 0 가드로 제외된다', () => {
    const recipe = [
      makeRequired('m-1', null, 'g'),
      makeRequired('m-2', 100, 'g'),
    ];
    const user = [makeHeld('m-1', 500), makeHeld('m-2', 500)];

    const result = buildConsumedPayload(recipe, user);
    expect(result).toHaveLength(1);
    expect(result[0]?.master_id).toBe('m-2');
  });

  it("recipe.unit = null → '개' fallback", () => {
    const recipe = [makeRequired('m-1', 2, null)];
    const user = [makeHeld('m-1', 5)];

    const result = buildConsumedPayload(recipe, user);
    expect(result).toEqual([{ master_id: 'm-1', quantity: 2, unit: '개' }]);
  });

  it('동일 master_id 보유 다중 row → 합산하여 min 비교', () => {
    const recipe = [makeRequired('m-1', 250, 'g')];
    // 같은 master_id 의 row 2개: 100 + 200 = 300 → min(250, 300) = 250
    const user = [makeHeld('m-1', 100), makeHeld('m-1', 200)];

    const result = buildConsumedPayload(recipe, user);
    expect(result).toEqual([{ master_id: 'm-1', quantity: 250, unit: 'g' }]);
  });
});
