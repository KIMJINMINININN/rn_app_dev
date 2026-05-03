// apps/web/src/entities/recipe/lib/__tests__/computeRecipeMatch.spec.ts
// Phase 3 §6.1 — 단일 레시피 매칭 점수 fixture 5-7개.
//
// 기대값은 §6.1 표와 일치해야 하며, 동시에 0011_recipes.sql `recommend_recipes()`의
// 결과와도 동치성을 가져야 한다 (Phase 3 §6.2 통합 테스트가 RPC 결과와 비교).
// 모든 score 비교는 4자리 소수점 정밀도를 사용한다.
import { describe, expect, it } from 'vitest';

import {
  computeRecipeMatch,
  type RecipeIngredient,
  type UserIngredientView,
} from '../computeRecipeMatch';

// 결정론적 today (KST/UTC 무관: 부동소수 비교만 검증).
const TODAY = new Date('2026-05-04T12:00:00Z');

// expires_at 헬퍼:
// - URGENT: today + 0..2일 (D-Day 0/1/2)
// - SAFE  : today + 26일 (urgent 아님)
const URGENT_EXPIRES = '2026-05-05'; // floor((+0.5d - 0d) / 1d) = 0 → urgent
const SAFE_EXPIRES = '2026-05-30'; // 약 26일 후 → urgent 아님

// 필수 5개 + 선택 2개 짜리 표준 레시피.
const REQUIRED_IDS = ['r-1', 'r-2', 'r-3', 'r-4', 'r-5'] as const;
const OPTIONAL_IDS = ['o-1', 'o-2'] as const;

const STANDARD_RECIPE: RecipeIngredient[] = [
  ...REQUIRED_IDS.map((id) => ({
    ingredient_master_id: id,
    is_optional: false,
    quantity: 100,
    unit: 'g',
  })),
  ...OPTIONAL_IDS.map((id) => ({
    ingredient_master_id: id,
    is_optional: true,
    quantity: 1,
    unit: 'tsp',
  })),
];

function makeHeld(
  ingredient_master_id: string,
  opts: Partial<UserIngredientView> = {},
): UserIngredientView {
  return {
    ingredient_master_id,
    expires_at: SAFE_EXPIRES,
    consumed: false,
    quantity: 1,
    ...opts,
  };
}

describe('computeRecipeMatch — fixture (Phase 3 §6.1)', () => {
  it('full_match: 필수 5/5 + 선택 2/2 → score = 0.9', () => {
    const userIngredients: UserIngredientView[] = [
      ...REQUIRED_IDS.map((id) => makeHeld(id)),
      ...OPTIONAL_IDS.map((id) => makeHeld(id)),
    ];
    const result = computeRecipeMatch(STANDARD_RECIPE, userIngredients, TODAY);
    expect(result.required_total).toBe(5);
    expect(result.required_have).toBe(5);
    expect(result.optional_total).toBe(2);
    expect(result.optional_have).toBe(2);
    expect(result.urgent_have).toBe(0);
    expect(result.missing_required).toEqual([]);
    expect(result.missing_optional).toEqual([]);
    // 0.7 * 5/5 + 0.2 * 2/2 + 0.1 * 0/5 = 0.9
    expect(result.score).toBeCloseTo(0.9, 4);
  });

  it('partial_required: 필수 3/5 → score = 0.42 (MIN_SCORE 미달)', () => {
    const userIngredients: UserIngredientView[] = [
      makeHeld('r-1'),
      makeHeld('r-2'),
      makeHeld('r-3'),
    ];
    const result = computeRecipeMatch(STANDARD_RECIPE, userIngredients, TODAY);
    expect(result.required_total).toBe(5);
    expect(result.required_have).toBe(3);
    expect(result.optional_total).toBe(2);
    expect(result.optional_have).toBe(0);
    expect(result.urgent_have).toBe(0);
    expect(result.missing_required.map((m) => m.ingredient_master_id)).toEqual([
      'r-4',
      'r-5',
    ]);
    expect(result.missing_optional.map((m) => m.ingredient_master_id)).toEqual([
      'o-1',
      'o-2',
    ]);
    // 0.7 * 3/5 + 0.2 * 0/2 + 0.1 * 0/5 = 0.42
    expect(result.score).toBeCloseTo(0.42, 4);
    expect(result.score).toBeLessThan(0.5);
  });

  it('no_optional: 필수 5/5, 선택 0개 정의 → score = 0.7', () => {
    const recipe: RecipeIngredient[] = REQUIRED_IDS.map((id) => ({
      ingredient_master_id: id,
      is_optional: false,
      quantity: 100,
      unit: 'g',
    }));
    const userIngredients: UserIngredientView[] = REQUIRED_IDS.map((id) =>
      makeHeld(id),
    );
    const result = computeRecipeMatch(recipe, userIngredients, TODAY);
    expect(result.required_total).toBe(5);
    expect(result.required_have).toBe(5);
    expect(result.optional_total).toBe(0);
    expect(result.optional_have).toBe(0);
    expect(result.urgent_have).toBe(0);
    expect(result.missing_required).toEqual([]);
    expect(result.missing_optional).toEqual([]);
    // 0.7 * 5/5 + 0.2 * 0/max(0,1) + 0.1 * 0/5 = 0.7
    expect(result.score).toBeCloseTo(0.7, 4);
  });

  it('urgent_bonus: 필수 5/5 + 임박 1개 → score = 0.72', () => {
    const userIngredients: UserIngredientView[] = [
      makeHeld('r-1', { expires_at: URGENT_EXPIRES }),
      makeHeld('r-2'),
      makeHeld('r-3'),
      makeHeld('r-4'),
      makeHeld('r-5'),
    ];
    const result = computeRecipeMatch(STANDARD_RECIPE, userIngredients, TODAY);
    expect(result.required_total).toBe(5);
    expect(result.required_have).toBe(5);
    expect(result.optional_total).toBe(2);
    expect(result.optional_have).toBe(0);
    expect(result.urgent_have).toBe(1);
    expect(result.missing_required).toEqual([]);
    expect(result.missing_optional.map((m) => m.ingredient_master_id)).toEqual([
      'o-1',
      'o-2',
    ]);
    // 0.7 * 5/5 + 0.2 * 0/2 + 0.1 * 1/5 = 0.72
    expect(result.score).toBeCloseTo(0.72, 4);
  });

  it('all_missing: 보유 0 → score = 0', () => {
    const result = computeRecipeMatch(STANDARD_RECIPE, [], TODAY);
    expect(result.required_total).toBe(5);
    expect(result.required_have).toBe(0);
    expect(result.optional_total).toBe(2);
    expect(result.optional_have).toBe(0);
    expect(result.urgent_have).toBe(0);
    expect(result.missing_required.map((m) => m.ingredient_master_id)).toEqual([
      'r-1',
      'r-2',
      'r-3',
      'r-4',
      'r-5',
    ]);
    expect(result.missing_optional.map((m) => m.ingredient_master_id)).toEqual([
      'o-1',
      'o-2',
    ]);
    expect(result.score).toBeCloseTo(0, 4);
  });

  it('unit_mismatch: ingredient_master_id 일치 → 단위 무시, 보유 판정 (Phase 3 정책)', () => {
    // 레시피 단위는 'g', 보유 단위는 'kg'. ingredient_master_id가 같으면 보유로 간주.
    const userIngredients: UserIngredientView[] = REQUIRED_IDS.map((id) => ({
      ingredient_master_id: id,
      expires_at: SAFE_EXPIRES,
      consumed: false,
      quantity: 1,
    }));
    // (UserIngredientView 자체에는 unit 필드가 없음 → 단위 비교 자체를 하지 않는다는
    //  Phase 3 정책의 타입-수준 보장. 여기서는 id 매칭만으로 보유 판정됨을 검증.)
    const result = computeRecipeMatch(STANDARD_RECIPE, userIngredients, TODAY);
    expect(result.required_have).toBe(5);
    expect(result.missing_required).toEqual([]);
    // 0.7 * 5/5 + 0.2 * 0/2 + 0.1 * 0/5 = 0.7
    expect(result.score).toBeCloseTo(0.7, 4);
  });

  it('empty_user_inventory: userIngredients = [] → score 0, missing_required 전체', () => {
    const result = computeRecipeMatch(STANDARD_RECIPE, [], TODAY);
    expect(result.score).toBeCloseTo(0, 4);
    expect(result.missing_required).toHaveLength(5);
    expect(result.missing_required.map((m) => m.ingredient_master_id)).toEqual(
      REQUIRED_IDS.map(String),
    );
    // missing_required 항목들은 원본 RecipeIngredient shape을 보존해야 한다.
    for (const m of result.missing_required) {
      expect(m.is_optional).toBe(false);
      expect(m.quantity).toBe(100);
      expect(m.unit).toBe('g');
    }
  });

  it('consumed/quantity≤0인 보유 항목은 무시된다 (gate sanity)', () => {
    const userIngredients: UserIngredientView[] = [
      // r-1: consumed=true → 무시
      { ingredient_master_id: 'r-1', expires_at: SAFE_EXPIRES, consumed: true, quantity: 5 },
      // r-2: quantity=0 → 무시
      { ingredient_master_id: 'r-2', expires_at: SAFE_EXPIRES, consumed: false, quantity: 0 },
      // r-3: 정상 보유
      makeHeld('r-3'),
    ];
    const result = computeRecipeMatch(STANDARD_RECIPE, userIngredients, TODAY);
    expect(result.required_have).toBe(1);
    expect(result.missing_required.map((m) => m.ingredient_master_id)).toEqual([
      'r-1',
      'r-2',
      'r-4',
      'r-5',
    ]);
    // 0.7 * 1/5 + 0.2 * 0/2 + 0.1 * 0/5 = 0.14
    expect(result.score).toBeCloseTo(0.14, 4);
  });
});
