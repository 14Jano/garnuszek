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

/** The food groups in the order they are walked through in a shop. */
export const INGREDIENT_CATEGORIES: readonly IngredientCategory[] = [
  'vegetables',
  'fruit',
  'meat',
  'fish',
  'dairy',
  'eggs',
  'grains',
  'legumes',
  'nuts',
  'fats',
  'other',
];

/**
 * What an ingredient is counted in at the shop when grams are not the natural
 * way: single items (an egg, an avocado), a head of garlic, a can, a pack, a loaf.
 */
export type PurchaseUnit = 'piece' | 'head' | 'can' | 'pack' | 'loaf';

export interface Purchase {
  unit: PurchaseUnit;
  /** What one unit weighs, counted the way the recipes weigh the ingredient. */
  grams: number;
}

/**
 * The allergens a person is most often asked to avoid, following the EU list of
 * allergens that food labels have to name, as far as the catalog contains them.
 * "milk" covers everything made from milk, so it also serves lactose intolerance.
 */
export type Allergen =
  'gluten' | 'milk' | 'eggs' | 'fish' | 'peanuts' | 'tree-nuts' | 'soy' | 'sesame';

export const ALLERGENS: readonly Allergen[] = [
  'gluten',
  'milk',
  'eggs',
  'fish',
  'peanuts',
  'tree-nuts',
  'soy',
  'sesame',
];

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  /** Nutrition of 100 g of the ingredient as it is weighed in the recipe. */
  per100g: Nutrients;
  /** The allergens the ingredient contains. Left out when it contains none of them. */
  allergens?: readonly Allergen[];
  /** Set when the shopping list should count the ingredient in whole units instead of grams. */
  purchase?: Purchase;
  /** Set for liquids, which are bought by volume: grams in one millilitre. */
  gramsPerMl?: number;
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
