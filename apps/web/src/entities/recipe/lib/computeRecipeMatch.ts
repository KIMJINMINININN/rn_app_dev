// apps/web/src/entities/recipe/lib/computeRecipeMatch.ts
// Phase 3 §4.2 — 단일 레시피 매칭 점수 계산 (TS mirror of SQL recommend_recipes)
//
// 본 함수는 SQL `recommend_recipes()` (0011_recipes.sql) 와 동치이다.
// 레시피 상세 페이지(/recipes/[id]) 등 단일 레시피 컨텍스트에서 RPC 왕복 없이
// 클라이언트/서버 양쪽에서 score / missing_* 를 계산하기 위해 존재한다.
// 동치성은 entities/recipe/lib/__tests__/computeRecipeMatch.spec.ts 가 보장한다.
import {
  WEIGHT_OPTIONAL,
  WEIGHT_REQUIRED,
  WEIGHT_URGENT,
} from './scoring-constants';

export type RecipeIngredient = {
  ingredient_master_id: string;
  is_optional: boolean;
  quantity?: number | null;
  unit?: string | null;
};

export type UserIngredientView = {
  ingredient_master_id: string;
  expires_at: string | null; // ISO date
  consumed: boolean;
  quantity: number;
};

export type RecipeMatchResult = {
  score: number;
  required_total: number;
  required_have: number;
  optional_total: number;
  optional_have: number;
  urgent_have: number;
  missing_required: RecipeIngredient[];
  missing_optional: RecipeIngredient[];
};

const URGENT_DAYS = 2;

function isUrgent(expiresAt: string | null, today: Date): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt);
  const diffDays = Math.floor(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays >= 0 && diffDays <= URGENT_DAYS;
}

export function computeRecipeMatch(
  recipeIngredients: RecipeIngredient[],
  userIngredients: UserIngredientView[],
  today: Date = new Date(),
): RecipeMatchResult {
  const haveSet = new Set<string>();
  const urgentSet = new Set<string>();
  for (const ui of userIngredients) {
    if (ui.consumed || ui.quantity <= 0) continue;
    haveSet.add(ui.ingredient_master_id);
    if (isUrgent(ui.expires_at, today)) {
      urgentSet.add(ui.ingredient_master_id);
    }
  }

  let requiredTotal = 0;
  let requiredHave = 0;
  let optionalTotal = 0;
  let optionalHave = 0;
  let urgentHave = 0;
  const missingRequired: RecipeIngredient[] = [];
  const missingOptional: RecipeIngredient[] = [];

  for (const ri of recipeIngredients) {
    if (ri.is_optional) {
      optionalTotal++;
      if (haveSet.has(ri.ingredient_master_id)) optionalHave++;
      else missingOptional.push(ri);
    } else {
      requiredTotal++;
      if (haveSet.has(ri.ingredient_master_id)) {
        requiredHave++;
        if (urgentSet.has(ri.ingredient_master_id)) urgentHave++;
      } else {
        missingRequired.push(ri);
      }
    }
  }

  if (requiredTotal === 0) {
    return {
      score: 0,
      required_total: 0,
      required_have: 0,
      optional_total: optionalTotal,
      optional_have: optionalHave,
      urgent_have: 0,
      missing_required: [],
      missing_optional: missingOptional,
    };
  }

  const score =
    WEIGHT_REQUIRED * (requiredHave / requiredTotal) +
    WEIGHT_OPTIONAL * (optionalHave / Math.max(optionalTotal, 1)) +
    WEIGHT_URGENT * (urgentHave / requiredTotal);

  return {
    score,
    required_total: requiredTotal,
    required_have: requiredHave,
    optional_total: optionalTotal,
    optional_have: optionalHave,
    urgent_have: urgentHave,
    missing_required: missingRequired,
    missing_optional: missingOptional,
  };
}
