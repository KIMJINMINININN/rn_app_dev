// apps/web/src/entities/recipe/model/types.ts
// Phase 3 §3.1 — entities/recipe 슬라이스 도메인 모델
//
// 본 파일은 0011_recipes.sql (recipe_master / recipe_ingredients / recommend_recipes)의
// row/return 타입을 거울처럼 반영한다. supabase 자동 생성 타입(`db:types`)이 갱신될 때까지의
// 작업용 단일 출처. RPC `recommend_recipes` 응답 행 = `Recommendation`.

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export type RecipeMaster = {
  id: string;
  name: string;
  description: string | null;
  cook_minutes: number | null;
  difficulty: RecipeDifficulty;
  servings: number | null;
  instructions_md: string | null;
  created_at: string;
};

export type RecipeIngredientRow = {
  recipe_id: string;
  ingredient_master_id: string;
  quantity: number | null;
  unit: string | null;
  is_optional: boolean;
};

export type Recommendation = {
  recipe_id: string;
  name: string;
  description: string | null;
  cook_minutes: number | null;
  difficulty: RecipeDifficulty;
  servings: number | null;
  required_total: number;
  required_have: number;
  optional_total: number;
  optional_have: number;
  urgent_have: number;
  score: number;
  missing_required: Array<{
    ingredient_master_id: string;
    quantity: number | null;
    unit: string | null;
  }>;
  missing_optional: Array<{
    ingredient_master_id: string;
    quantity: number | null;
    unit: string | null;
  }>;
};

export type RecipeWithMatch = RecipeMaster & {
  match: Recommendation;
};
