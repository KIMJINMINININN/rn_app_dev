import type { Recommendation } from '../model/types';

interface Props {
  requiredMissing: Recommendation['missing_required'];
  optionalMissing: Recommendation['missing_optional'];
  ingredientNames?: Map<string, string>;
}

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

export function MissingIngredientsList({
  requiredMissing,
  optionalMissing,
  ingredientNames,
}: Props) {
  const hasRequired = requiredMissing.length > 0;
  const hasOptional = optionalMissing.length > 0;

  if (!hasRequired && !hasOptional) {
    return (
      <p className="text-body-s-400 text-emerald-700 py-8">
        모든 재료를 보유하고 있어요
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-16">
      {hasRequired && (
        <section className="flex flex-col gap-8">
          <h3 className="text-body-xs-400 text-gray-500 uppercase tracking-wide">
            필수 부족
          </h3>
          <ul className="flex flex-col gap-6">
            {requiredMissing.map((item) => {
              const amount = formatAmount(item.quantity, item.unit);
              return (
                <li
                  key={item.ingredient_master_id}
                  className="flex items-center justify-between gap-8 border-b border-gray-100 py-6"
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
        </section>
      )}

      {hasOptional && (
        <section className="flex flex-col gap-8">
          <h3 className="text-body-xs-400 text-gray-500 uppercase tracking-wide">
            선택 부족
          </h3>
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
        </section>
      )}
    </div>
  );
}
