import { requireIngredient } from '../recipes/ingredient';
import type { Allergen, IngredientCatalog } from '../recipes/ingredient';
import { compatibleDiets } from '../recipes/recipe';
import type { Diet, Recipe } from '../recipes/recipe';
import type { Member } from './member';

/** What a person does not eat, for a reason of health, belief or taste. */
export interface Restrictions {
  /** The diet the person follows. Left out when they eat anything. */
  diet?: Diet;
  allergens: readonly Allergen[];
  /** Single ingredients to avoid, on top of the allergens. */
  avoidedIngredientIds: readonly string[];
}

export const NO_RESTRICTIONS: Restrictions = { allergens: [], avoidedIngredientIds: [] };

export function hasRestrictions(restrictions: Restrictions | undefined): boolean {
  return (
    restrictions !== undefined &&
    (restrictions.diet !== undefined ||
      restrictions.allergens.length > 0 ||
      restrictions.avoidedIngredientIds.length > 0)
  );
}

/** A copy that shares nothing with the original, with only the fields that are set. */
export function copyRestrictions({
  diet,
  allergens,
  avoidedIngredientIds,
}: Restrictions): Restrictions {
  return {
    ...(diet === undefined ? {} : { diet }),
    allergens: [...allergens],
    avoidedIngredientIds: [...avoidedIngredientIds],
  };
}

/** Why a recipe does not suit a person. */
export type Conflict =
  /** The recipe is not compatible with the diet. */
  | { kind: 'diet'; diet: Diet }
  /** An ingredient of the recipe contains an allergen the person avoids. */
  | { kind: 'allergen'; allergen: Allergen; ingredientIds: string[] }
  /** The recipe uses an ingredient the person avoids that is not covered by their allergens. */
  | { kind: 'ingredient'; ingredientId: string };

/**
 * Everything in the recipe that a person avoids. Empty when the recipe suits them.
 * An ingredient is reported once: as part of its allergen when the person avoids that
 * allergen, otherwise as an avoided ingredient.
 */
export function recipeConflicts(
  recipe: Pick<Recipe, 'ingredients'>,
  restrictions: Restrictions | undefined,
  catalog: IngredientCatalog,
): Conflict[] {
  if (!restrictions) return [];

  const conflicts: Conflict[] = [];

  if (restrictions.diet && !compatibleDiets(recipe, catalog).includes(restrictions.diet)) {
    conflicts.push({ kind: 'diet', diet: restrictions.diet });
  }

  const ingredients = recipe.ingredients.map(({ ingredientId }) =>
    requireIngredient(ingredientId, catalog),
  );

  const covered = new Set<string>();
  for (const allergen of restrictions.allergens) {
    const ingredientIds = ingredients
      .filter(({ allergens }) => allergens?.includes(allergen))
      .map(({ id }) => id);

    if (ingredientIds.length > 0) {
      conflicts.push({ kind: 'allergen', allergen, ingredientIds });
      ingredientIds.forEach((id) => covered.add(id));
    }
  }

  const reported = new Set<string>();
  for (const { id } of ingredients) {
    if (restrictions.avoidedIngredientIds.includes(id) && !covered.has(id) && !reported.has(id)) {
      conflicts.push({ kind: 'ingredient', ingredientId: id });
      reported.add(id);
    }
  }

  return conflicts;
}

export interface MemberConflicts {
  member: Member;
  conflicts: Conflict[];
}

/** The people for whom the recipe does not fit, with the reasons. Empty when it fits all. */
export function conflictsForMembers(
  recipe: Pick<Recipe, 'ingredients'>,
  members: readonly Member[],
  catalog: IngredientCatalog,
): MemberConflicts[] {
  return members
    .map((member) => ({ member, conflicts: recipeConflicts(recipe, member.restrictions, catalog) }))
    .filter(({ conflicts }) => conflicts.length > 0);
}
