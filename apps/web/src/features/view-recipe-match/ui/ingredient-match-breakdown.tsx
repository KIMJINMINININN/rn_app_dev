// apps/web/src/features/view-recipe-match/ui/ingredient-match-breakdown.tsx
// Phase 3 §3.4 — features/view-recipe-match
//
// 레시피 상세 페이지(Day 7 widgets/recipe-detail) 컨텍스트용 컴포넌트.
// 보유 / 필수 부족 / 선택 부족 3 섹션으로 분리 표시.
//
// entities/recipe/ui/missing-ingredients-list 와의 차이:
//   - 본 컴포넌트: 상세 컨텍스트 (보유까지 모두 표시)
//   - missing-ingredients-list: 카드/요약 컨텍스트 (부족만)
//
// Server Component (presentational) — 외부 데이터 fetch X.

import type {
  Recommendation,
  RecipeIngredientRow,
} from '@/entities/recipe/model/types';

interface Props {
  recommendation: Recommendation;
  recipeIngredients: RecipeIngredientRow[];
  ingredientNames?: Map<string, string>;
}

type DisplayRow = {
  ingredient_master_id: string;
  quantity: number | null;
  unit: string | null;
  is_optional: boolean;
};

function resolveName(id: string, map?: Map<string, string>): string {
  return map?.get(id) ?? id;
}

function formatAmount(
  quantity: number | null,
  unit: string | null,
): string | null {
  if (quantity == null && unit == null) return null;
  const parts: string[] = [];
  if (quantity != null) parts.push(String(quantity));
  if (unit != null) parts.push(unit);
  return parts.join(' ');
}

export function IngredientMatchBreakdown({
  recommendation,
  recipeIngredients,
  ingredientNames,
}: Props) {
  // missing 집합 계산 (Set lookup O(1))
  const missingRequiredIds = new Set(
    recommendation.missing_required.map((m) => m.ingredient_master_id),
  );
  const missingOptionalIds = new Set(
    recommendation.missing_optional.map((m) => m.ingredient_master_id),
  );

  // 보유 = recipe_ingredients 중 missing 둘 다 아닌 것
  const have: DisplayRow[] = recipeIngredients
    .filter(
      (ri) =>
        !missingRequiredIds.has(ri.ingredient_master_id) &&
        !missingOptionalIds.has(ri.ingredient_master_id),
    )
    .map((ri) => ({
      ingredient_master_id: ri.ingredient_master_id,
      quantity: ri.quantity,
      unit: ri.unit,
      is_optional: ri.is_optional,
    }));

  const requiredMissing = recommendation.missing_required;
  const optionalMissing = recommendation.missing_optional;

  return (
    <div className="flex flex-col gap-20">
      <Section
        label="보유 재료"
        emptyMessage="보유 중인 재료가 없어요"
        toneClass="text-emerald-700"
      >
        {have.length > 0 ? (
          <ul className="flex flex-col gap-6">
            {have.map((item) => {
              const amount = formatAmount(item.quantity, item.unit);
              return (
                <li
                  key={item.ingredient_master_id}
                  className="flex items-center justify-between gap-8 border-b border-emerald-50 py-6"
                >
                  <span className="text-body-s-400 text-gray-900">
                    {resolveName(item.ingredient_master_id, ingredientNames)}
                    {item.is_optional && (
                      <span className="ml-6 text-body-xs-400 text-gray-400">
                        (선택)
                      </span>
                    )}
                  </span>
                  {amount && (
                    <span className="text-body-xs-400 text-gray-500">
                      {amount}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Section>

      <Section
        label="필수 부족"
        emptyMessage="필수 재료를 모두 보유하고 있어요"
        toneClass="text-rose-700"
      >
        {requiredMissing.length > 0 ? (
          <ul className="flex flex-col gap-6">
            {requiredMissing.map((item) => {
              const amount = formatAmount(item.quantity, item.unit);
              return (
                <li
                  key={item.ingredient_master_id}
                  className="flex items-center justify-between gap-8 border-b border-rose-50 py-6"
                >
                  <span className="text-body-s-400 text-gray-900">
                    {resolveName(item.ingredient_master_id, ingredientNames)}
                  </span>
                  {amount && (
                    <span className="text-body-xs-400 text-gray-500">
                      {amount}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Section>

      <Section
        label="선택 부족"
        emptyMessage="선택 재료를 모두 보유하고 있어요"
        toneClass="text-gray-500"
      >
        {optionalMissing.length > 0 ? (
          <ul className="flex flex-col gap-6">
            {optionalMissing.map((item) => {
              const amount = formatAmount(item.quantity, item.unit);
              return (
                <li
                  key={item.ingredient_master_id}
                  className="flex items-center justify-between gap-8 border-b border-gray-100 py-6"
                >
                  <span className="text-body-s-400 text-gray-500">
                    {resolveName(item.ingredient_master_id, ingredientNames)}
                  </span>
                  {amount && (
                    <span className="text-body-xs-400 text-gray-400">
                      {amount}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Section>
    </div>
  );
}

interface SectionProps {
  label: string;
  emptyMessage: string;
  toneClass: string;
  children: React.ReactNode;
}

function Section({ label, emptyMessage, toneClass, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-8">
      <h3
        className={`text-body-xs-400 ${toneClass} uppercase tracking-wide`}
      >
        {label}
      </h3>
      {children ?? (
        <p className="text-body-s-400 text-gray-400 py-4">{emptyMessage}</p>
      )}
    </section>
  );
}
