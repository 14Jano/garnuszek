import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { BUILTIN_RECIPES } from '../content/recipes';
import { listFavoriteIds } from '../data/favoriteRepository';
import { listCustomRecipes } from '../data/recipeRepository';
import type { Recipe } from '../domain/recipes/recipe';

export interface RecipeEntry {
  recipe: Recipe;
  favorite: boolean;
  /** True for recipes the user wrote, false for the ones that ship with the app. */
  custom: boolean;
}

/**
 * Built-in and custom recipes together, with favorite marks, kept up to date as
 * the user changes them. The user's own recipes come first. Returns undefined
 * until the first read from IndexedDB completes.
 */
export function useRecipeEntries(): RecipeEntry[] | undefined {
  const customRecipes = useLiveQuery(listCustomRecipes, []);
  const favoriteIds = useLiveQuery(listFavoriteIds, []);

  return useMemo(() => {
    if (!customRecipes || !favoriteIds) return undefined;

    return [
      ...customRecipes.map((recipe) => ({
        recipe,
        favorite: favoriteIds.has(recipe.id),
        custom: true,
      })),
      ...BUILTIN_RECIPES.map((recipe) => ({
        recipe,
        favorite: favoriteIds.has(recipe.id),
        custom: false,
      })),
    ];
  }, [customRecipes, favoriteIds]);
}
