import type { NewRecipe, Recipe } from '../domain/recipes/recipe';
import { db, nextCreatedAt } from './db';
import type { RecipeRecord } from './db';

/** The user's own recipes, oldest first. */
export async function listCustomRecipes(): Promise<Recipe[]> {
  const records = await db.customRecipes.orderBy('createdAt').toArray();
  return records.map(toRecipe);
}

export async function addCustomRecipe(input: NewRecipe): Promise<Recipe> {
  const recipe: Recipe = { ...input, id: crypto.randomUUID() };

  await db.transaction('rw', db.customRecipes, async () => {
    const createdAt = nextCreatedAt(await db.customRecipes.orderBy('createdAt').last());
    await db.customRecipes.add({ ...recipe, createdAt });
  });

  return recipe;
}

export async function updateCustomRecipe(recipe: Recipe): Promise<void> {
  const updatedCount = await db.customRecipes.update(recipe.id, recipe);
  if (updatedCount === 0) {
    throw new Error(`Cannot update recipe ${recipe.id}: it does not exist`);
  }
}

/** Deletes the recipe and forgets that it was a favorite. */
export async function removeCustomRecipe(id: string): Promise<void> {
  await db.transaction('rw', db.customRecipes, db.favorites, async () => {
    await db.customRecipes.delete(id);
    await db.favorites.delete(id);
  });
}

// Copy the fields explicitly so storage-only data never leaks into the app.
function toRecipe(record: RecipeRecord): Recipe {
  return {
    id: record.id,
    name: record.name,
    mealType: record.mealType,
    servings: record.servings,
    prepMinutes: record.prepMinutes,
    ingredients: record.ingredients.map(({ ingredientId, grams }) => ({ ingredientId, grams })),
    steps: [...record.steps],
  };
}
