import { requireIngredient } from './ingredient';
import type { IngredientCatalog } from './ingredient';
import { compatibleDiets } from './recipe';
import type { Diet, MealType, Recipe } from './recipe';

export interface RecipeFilter {
  /** Matches the recipe name or any of its ingredients; blank matches everything. */
  query: string;
  mealType: MealType | null;
  diet: Diet | null;
  favoritesOnly: boolean;
}

export const NO_FILTER: RecipeFilter = {
  query: '',
  mealType: null,
  diet: null,
  favoritesOnly: false,
};

/** Lower case without diacritics, so "losos" finds "Łosoś". */
export function normalizeForSearch(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l');
}

export function filterRecipes<T extends { recipe: Recipe; favorite: boolean }>(
  entries: readonly T[],
  filter: RecipeFilter,
  catalog: IngredientCatalog,
): T[] {
  const query = normalizeForSearch(filter.query.trim());

  return entries.filter(({ recipe, favorite }) => {
    if (filter.favoritesOnly && !favorite) return false;
    if (filter.mealType && recipe.mealType !== filter.mealType) return false;
    if (filter.diet && !compatibleDiets(recipe, catalog).includes(filter.diet)) return false;
    if (query === '') return true;

    const searchable = [
      recipe.name,
      ...recipe.ingredients.map(
        ({ ingredientId }) => requireIngredient(ingredientId, catalog).name,
      ),
    ];
    return searchable.some((text) => normalizeForSearch(text).includes(query));
  });
}
