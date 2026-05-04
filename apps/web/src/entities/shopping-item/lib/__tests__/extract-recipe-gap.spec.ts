import { describe, expect, it } from 'vitest';

import { extractRecipeGap } from '../extract-recipe-gap';

describe('extractRecipeGap', () => {
  it('레시피 7재료 중 사용자 4보유 → 부족 3개 반환', () => {
    const recipeIngredients = [
      { ingredient_master_id: 'a', ingredient_name: '양파', quantity: 1, unit: '개', is_optional: false },
      { ingredient_master_id: 'b', ingredient_name: '감자', quantity: 2, unit: '개', is_optional: false },
      { ingredient_master_id: 'c', ingredient_name: '당근', quantity: 1, unit: '개', is_optional: false },
      { ingredient_master_id: 'd', ingredient_name: '소금', quantity: 5, unit: 'g', is_optional: false },
      { ingredient_master_id: 'e', ingredient_name: '후추', quantity: 2, unit: 'g', is_optional: false },
      { ingredient_master_id: 'f', ingredient_name: '마늘', quantity: 3, unit: '쪽', is_optional: false },
      { ingredient_master_id: 'g', ingredient_name: '생강', quantity: 1, unit: '개', is_optional: false },
    ];
    const userIngredients = [
      { ingredient_master_id: 'a', quantity: 2, unit: '개', consumed: false },
      { ingredient_master_id: 'b', quantity: 3, unit: '개', consumed: false },
      { ingredient_master_id: 'd', quantity: 10, unit: 'g', consumed: false },
      { ingredient_master_id: 'f', quantity: 5, unit: '쪽', consumed: false },
    ];

    const gaps = extractRecipeGap({ recipeIngredients, userIngredients });

    expect(gaps).toHaveLength(3);
    expect(gaps.map((g) => g.ingredient_master_id)).toEqual(['c', 'e', 'g']);
  });

  it('단위 동일 + 양 충족 → 보유로 판정 (리스트 제외)', () => {
    const recipeIngredients = [
      { ingredient_master_id: 'x', ingredient_name: '두부', quantity: 100, unit: 'g', is_optional: false },
    ];
    const userIngredients = [
      { ingredient_master_id: 'x', quantity: 200, unit: 'g', consumed: false },
    ];

    const gaps = extractRecipeGap({ recipeIngredients, userIngredients });

    expect(gaps).toHaveLength(0);
  });

  it('단위 충돌 → note="단위 확인 필요" 포함', () => {
    const recipeIngredients = [
      { ingredient_master_id: 'y', ingredient_name: '밀가루', quantity: 500, unit: 'g', is_optional: false },
    ];
    const userIngredients = [
      { ingredient_master_id: 'y', quantity: 1, unit: 'kg', consumed: false },
    ];

    const gaps = extractRecipeGap({ recipeIngredients, userIngredients });

    expect(gaps).toHaveLength(1);
    expect(gaps[0].note).toBe('단위 확인 필요');
    expect(gaps[0].ingredient_master_id).toBe('y');
  });

  it('단위 동일 + 양 부족 → 부족 차이 반환', () => {
    const recipeIngredients = [
      { ingredient_master_id: 'z', ingredient_name: '계란', quantity: 5, unit: '개', is_optional: false },
    ];
    const userIngredients = [
      { ingredient_master_id: 'z', quantity: 2, unit: '개', consumed: false },
    ];

    const gaps = extractRecipeGap({ recipeIngredients, userIngredients });

    expect(gaps).toHaveLength(1);
    expect(gaps[0].quantity).toBe(3); // 5 - 2
    expect(gaps[0].unit).toBe('개');
    expect(gaps[0].note).toBeUndefined();
  });

  it('is_optional 재료 → Gap에 포함되되 is_optional=true 마킹', () => {
    const recipeIngredients = [
      { ingredient_master_id: 'opt1', ingredient_name: '깨', quantity: 1, unit: 'ts', is_optional: true },
    ];
    const userIngredients: { ingredient_master_id: string; quantity: number; unit: string | null; consumed: boolean }[] = [];

    const gaps = extractRecipeGap({ recipeIngredients, userIngredients });

    expect(gaps).toHaveLength(1);
    expect(gaps[0].is_optional).toBe(true);
    expect(gaps[0].ingredient_master_id).toBe('opt1');
  });

  it('recipeQty=null + 사용자 보유 → 보유 판정 (presence-only)', () => {
    const recipeIngredients = [
      { ingredient_master_id: 'q1', ingredient_name: '소스', quantity: null, unit: null, is_optional: false },
    ];
    const userIngredients = [
      { ingredient_master_id: 'q1', quantity: 1, unit: null, consumed: false },
    ];

    const gaps = extractRecipeGap({ recipeIngredients, userIngredients });

    expect(gaps).toHaveLength(0);
  });

  it('consumed=true 항목은 보유에서 제외', () => {
    const recipeIngredients = [
      { ingredient_master_id: 'c1', ingredient_name: '버터', quantity: 50, unit: 'g', is_optional: false },
    ];
    const userIngredients = [
      { ingredient_master_id: 'c1', quantity: 100, unit: 'g', consumed: true },
    ];

    const gaps = extractRecipeGap({ recipeIngredients, userIngredients });

    expect(gaps).toHaveLength(1);
    expect(gaps[0].ingredient_master_id).toBe('c1');
  });
});
