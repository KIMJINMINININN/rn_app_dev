export type ShoppingSource = 'manual' | 'recipe_gap';

export interface ShoppingItem {
  id: string;
  user_id: string;
  ingredient_master_id: string | null;
  custom_name: string | null;
  quantity: number | null;
  unit: string | null;
  source: ShoppingSource;
  recipe_id: string | null;
  bought: boolean;
  note: string | null;
  created_at: string;
}

export interface RecipeIngredientRow {
  ingredient_master_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  is_optional: boolean;
}

export interface UserIngredientRow {
  ingredient_master_id: string;
  quantity: number;
  unit: string | null;
  consumed: boolean;
}

export interface GapItem {
  ingredient_master_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  is_optional: boolean;
  note?: string;
}
