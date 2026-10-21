import { roundGrams } from '../recipes/amounts';
import { INGREDIENT_CATEGORIES, requireIngredient } from '../recipes/ingredient';
import type { IngredientCatalog, IngredientCategory } from '../recipes/ingredient';
import type { DateKey } from './dates';
import { isLeftover } from './planEntry';
import type { PlanEntry } from './planEntry';
import type { PlannedMeal } from './portions';

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  /** Total weight to buy, rounded to what a kitchen scale can show. */
  grams: number;
}

/** Items of one food group, which stands in for a part of the shop. */
export interface ShoppingSection {
  category: IngredientCategory;
  items: ShoppingItem[];
}

/**
 * The planned meals whose ingredients are bought for the week from `firstDay`
 * to `lastDay`. That is every meal eaten in the week, except leftover days of a
 * dish that was cooked (and bought) earlier, plus the leftover days after the
 * week of a dish that is cooked within it, because it is bought all at once.
 */
export function entriesToBuyFor(
  entries: readonly PlanEntry[],
  firstDay: DateKey,
  lastDay: DateKey,
): PlanEntry[] {
  const inWeek = (entry: PlanEntry) => entry.date >= firstDay && entry.date <= lastDay;

  const cookedInWeek = new Set(
    entries
      .filter((entry) => !isLeftover(entry) && inWeek(entry))
      .map((entry) => entry.batchId)
      .filter((batchId): batchId is string => batchId !== undefined),
  );

  return entries.filter((entry) =>
    isLeftover(entry)
      ? entry.batchId !== undefined && cookedInWeek.has(entry.batchId)
      : inWeek(entry),
  );
}

/**
 * Adds up the ingredients of all planned meals into one list, grouped by food
 * group in the order of a shop walk and sorted by name. Weights are rounded only
 * after adding, so rounding does not pile up across meals.
 */
export function buildShoppingList(
  meals: readonly PlannedMeal[],
  catalog: IngredientCatalog,
): ShoppingSection[] {
  const totals = new Map<string, number>();
  for (const meal of meals) {
    for (const { ingredientId, grams } of meal.ingredients) {
      totals.set(ingredientId, (totals.get(ingredientId) ?? 0) + grams);
    }
  }

  return INGREDIENT_CATEGORIES.flatMap((category) => {
    const items = [...totals]
      .flatMap(([ingredientId, grams]) => {
        const ingredient = requireIngredient(ingredientId, catalog);
        return ingredient.category === category
          ? [{ ingredientId, name: ingredient.name, grams: roundGrams(grams) }]
          : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    return items.length > 0 ? [{ category, items }] : [];
  });
}
