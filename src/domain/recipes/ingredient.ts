import type { Nutrients } from '../nutrition/nutrients';

/**
 * Broad food groups. They decide which diets an ingredient fits and, later,
 * which aisle it belongs to on the shopping list.
 */
export type IngredientCategory =
  | 'vegetables'
  | 'fruit'
  | 'meat'
  | 'fish'
  | 'dairy'
  | 'eggs'
  | 'grains'
  | 'legumes'
  | 'nuts'
  | 'fats'
  | 'other';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  /** Nutrition of 100 g of the ingredient as it is weighed in the recipe. */
  per100g: Nutrients;
}

export type IngredientCatalog = ReadonlyMap<string, Ingredient>;

export function createCatalog(ingredients: readonly Ingredient[]): IngredientCatalog {
  const catalog = new Map<string, Ingredient>();

  for (const ingredient of ingredients) {
    if (catalog.has(ingredient.id)) {
      throw new Error(`Duplicate ingredient id: ${ingredient.id}`);
    }
    catalog.set(ingredient.id, ingredient);
  }

  return catalog;
}

export function requireIngredient(id: string, catalog: IngredientCatalog): Ingredient {
  const ingredient = catalog.get(id);
  if (!ingredient) {
    throw new Error(`Unknown ingredient: ${id}`);
  }
  return ingredient;
}
