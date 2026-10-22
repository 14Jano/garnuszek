import type { Conflict, Restrictions } from '../domain/household/restrictions';
import { requireIngredient } from '../domain/recipes/ingredient';
import { INGREDIENT_CATALOG } from './catalog';
import { ALLERGEN_LABELS, DIET_ADJECTIVES } from './labels';

/** "makaron pszenny", from "Makaron pszenny (suchy)": the note in brackets only gets in the way here. */
function ingredientName(id: string): string {
  return requireIngredient(id, INGREDIENT_CATALOG)
    .name.replace(/\s*\([^)]*\)\s*$/, '')
    .toLocaleLowerCase('pl');
}

/**
 * Why a recipe does not suit a person, in a phrase that fits after "Anna:" or
 * "unika:", e.g. "dieta wegetariańska, mleko i nabiał (masło, ser żółty), cebula".
 */
export function describeConflicts(conflicts: readonly Conflict[]): string {
  return conflicts
    .map((conflict) => {
      switch (conflict.kind) {
        case 'diet':
          return `dieta ${DIET_ADJECTIVES[conflict.diet]}`;
        case 'allergen':
          return `${ALLERGEN_LABELS[conflict.allergen].toLocaleLowerCase('pl')} (${conflict.ingredientIds
            .map(ingredientName)
            .join(', ')})`;
        case 'ingredient':
          return ingredientName(conflict.ingredientId);
      }
    })
    .join(', ');
}

/** What a person avoids, in the same style: "dieta wegetariańska, gluten, cebula". */
export function describeRestrictions({
  diet,
  allergens,
  avoidedIngredientIds,
}: Restrictions): string {
  return [
    ...(diet ? [`dieta ${DIET_ADJECTIVES[diet]}`] : []),
    ...allergens.map((allergen) => ALLERGEN_LABELS[allergen].toLocaleLowerCase('pl')),
    ...avoidedIngredientIds.map(ingredientName),
  ].join(', ');
}
