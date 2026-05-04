import type { GapItem, RecipeIngredientRow, UserIngredientRow } from '../model/types';

export function extractRecipeGap(args: {
  recipeIngredients: RecipeIngredientRow[];
  userIngredients: UserIngredientRow[];
}): GapItem[] {
  const { recipeIngredients, userIngredients } = args;

  const available = userIngredients.filter(
    (ui) => !ui.consumed && ui.quantity > 0,
  );

  const gaps: GapItem[] = [];

  for (const ri of recipeIngredients) {
    const matching = available.filter(
      (ui) => ui.ingredient_master_id === ri.ingredient_master_id,
    );

    if (matching.length === 0) {
      gaps.push({
        ingredient_master_id: ri.ingredient_master_id,
        ingredient_name: ri.ingredient_name,
        quantity: ri.quantity,
        unit: ri.unit,
        is_optional: ri.is_optional,
      });
      continue;
    }

    const sameUnit = matching.find((ui) => ui.unit === ri.unit);

    if (sameUnit) {
      // recipeQty=null → presence-only check, already held
      if (ri.quantity === null) continue;

      const totalHeld = matching
        .filter((ui) => ui.unit === ri.unit)
        .reduce((sum, ui) => sum + ui.quantity, 0);

      if (totalHeld >= ri.quantity) continue;

      gaps.push({
        ingredient_master_id: ri.ingredient_master_id,
        ingredient_name: ri.ingredient_name,
        quantity: ri.quantity - totalHeld,
        unit: ri.unit,
        is_optional: ri.is_optional,
      });
    } else {
      // unit conflict — user has the ingredient but unit differs
      gaps.push({
        ingredient_master_id: ri.ingredient_master_id,
        ingredient_name: ri.ingredient_name,
        quantity: ri.quantity,
        unit: ri.unit,
        is_optional: ri.is_optional,
        note: '단위 확인 필요',
      });
    }
  }

  return gaps;
}
