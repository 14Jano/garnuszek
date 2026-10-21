import { beforeEach, describe, expect, it } from 'vitest';
import type { NewRecipe } from '../domain/recipes/recipe';
import { db } from './db';
import { listFavoriteIds, setFavorite } from './favoriteRepository';
import {
  addCustomRecipe,
  listCustomRecipes,
  removeCustomRecipe,
  updateCustomRecipe,
} from './recipeRepository';

function newRecipe(overrides: Partial<NewRecipe> = {}): NewRecipe {
  return {
    name: 'Pierogi ruskie',
    mealType: 'lunch',
    servings: 4,
    prepMinutes: 90,
    ingredients: [
      { ingredientId: 'potato', grams: 600 },
      { ingredientId: 'quark', grams: 250 },
    ],
    steps: ['Ugotuj ziemniaki.', 'Wymieszaj z twarogiem.'],
    ...overrides,
  };
}

beforeEach(async () => {
  await db.customRecipes.clear();
  await db.favorites.clear();
});

describe('recipeRepository', () => {
  it('starts out empty', async () => {
    expect(await listCustomRecipes()).toEqual([]);
  });

  it('stores a recipe with all its details and gives it an id', async () => {
    const input = newRecipe();

    const saved = await addCustomRecipe(input);

    expect(saved.id).toBeTruthy();
    expect(await listCustomRecipes()).toEqual([{ ...input, id: saved.id }]);
  });

  it('lists recipes in the order they were added', async () => {
    await addCustomRecipe(newRecipe({ name: 'Pierwszy' }));
    await addCustomRecipe(newRecipe({ name: 'Drugi' }));
    await addCustomRecipe(newRecipe({ name: 'Trzeci' }));

    const names = (await listCustomRecipes()).map((recipe) => recipe.name);

    expect(names).toEqual(['Pierwszy', 'Drugi', 'Trzeci']);
  });

  it('updates an existing recipe in place', async () => {
    const saved = await addCustomRecipe(newRecipe());
    const edited = { ...saved, servings: 6, steps: ['Nowy krok.'] };

    await updateCustomRecipe(edited);

    expect(await listCustomRecipes()).toEqual([edited]);
  });

  it('refuses to update a recipe that does not exist', async () => {
    await expect(updateCustomRecipe({ ...newRecipe(), id: 'missing' })).rejects.toThrow(
      'does not exist',
    );
  });

  it('removes a recipe together with its favorite mark', async () => {
    const pierogi = await addCustomRecipe(newRecipe({ name: 'Pierogi' }));
    const placki = await addCustomRecipe(newRecipe({ name: 'Placki' }));
    await setFavorite(pierogi.id, true);
    await setFavorite(placki.id, true);

    await removeCustomRecipe(pierogi.id);

    expect((await listCustomRecipes()).map((recipe) => recipe.name)).toEqual(['Placki']);
    expect(await listFavoriteIds()).toEqual(new Set([placki.id]));
  });
});
