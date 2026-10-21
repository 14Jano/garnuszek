import { beforeEach, describe, expect, it } from 'vitest';
import type { NewMember } from '../domain/household/member';
import type { NewRecipe } from '../domain/recipes/recipe';
import { db } from './db';
import { addMember, removeMember } from './memberRepository';
import { assignRecipe, listPlanEntries, removePlanEntry, setEaters } from './planRepository';
import { addCustomRecipe, removeCustomRecipe } from './recipeRepository';

const member: NewMember = {
  name: 'Anna',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activity: 'light',
  goal: 'maintain',
};

const recipe: NewRecipe = {
  name: 'Własny',
  mealType: 'lunch',
  servings: 2,
  prepMinutes: 20,
  ingredients: [{ ingredientId: 'potato', grams: 500 }],
  steps: [],
};

beforeEach(async () => {
  await db.planEntries.clear();
  await db.members.clear();
  await db.customRecipes.clear();
  await db.favorites.clear();
});

describe('planRepository', () => {
  it('starts out empty', async () => {
    expect(await listPlanEntries('2026-10-19', '2026-10-25')).toEqual([]);
  });

  it('plans a recipe for a meal with the default eaters', async () => {
    await assignRecipe('2026-10-21', 'lunch', 'szakszuka', ['a', 'b']);

    expect(await listPlanEntries('2026-10-19', '2026-10-25')).toEqual([
      { date: '2026-10-21', mealType: 'lunch', recipeId: 'szakszuka', memberIds: ['a', 'b'] },
    ]);
  });

  it('keeps the eaters when a dish is swapped', async () => {
    await assignRecipe('2026-10-21', 'lunch', 'szakszuka', ['a', 'b']);
    await setEaters('2026-10-21', 'lunch', ['b']);

    await assignRecipe('2026-10-21', 'lunch', 'chili-sin-carne', ['a', 'b']);

    expect(await listPlanEntries('2026-10-21', '2026-10-21')).toEqual([
      { date: '2026-10-21', mealType: 'lunch', recipeId: 'chili-sin-carne', memberIds: ['b'] },
    ]);
  });

  it('allows one meal per slot but all three meals in a day', async () => {
    await assignRecipe('2026-10-21', 'dinner', 'salatka-grecka', ['a']);
    await assignRecipe('2026-10-21', 'breakfast', 'szakszuka', ['a']);
    await assignRecipe('2026-10-21', 'lunch', 'spaghetti-bolognese', ['a']);
    await assignRecipe('2026-10-21', 'lunch', 'chili-sin-carne', ['a']);

    const meals = (await listPlanEntries('2026-10-21', '2026-10-21')).map(
      (entry) => `${entry.mealType}:${entry.recipeId}`,
    );

    expect(meals).toEqual([
      'breakfast:szakszuka',
      'lunch:chili-sin-carne',
      'dinner:salatka-grecka',
    ]);
  });

  it('lists only the requested days, in calendar order', async () => {
    await assignRecipe('2026-10-26', 'lunch', 'szakszuka', ['a']);
    await assignRecipe('2026-10-25', 'lunch', 'szakszuka', ['a']);
    await assignRecipe('2026-10-19', 'lunch', 'szakszuka', ['a']);
    await assignRecipe('2026-10-18', 'lunch', 'szakszuka', ['a']);

    const days = (await listPlanEntries('2026-10-19', '2026-10-25')).map((entry) => entry.date);

    expect(days).toEqual(['2026-10-19', '2026-10-25']);
  });

  it('changes who eats a planned meal', async () => {
    await assignRecipe('2026-10-21', 'lunch', 'szakszuka', ['a', 'b']);

    await setEaters('2026-10-21', 'lunch', ['a']);

    expect((await listPlanEntries('2026-10-21', '2026-10-21'))[0]?.memberIds).toEqual(['a']);
  });

  it('refuses to change the eaters of a meal that is not planned', async () => {
    await expect(setEaters('2026-10-21', 'lunch', ['a'])).rejects.toThrow('nothing planned');
  });

  it('removes a meal', async () => {
    await assignRecipe('2026-10-21', 'lunch', 'szakszuka', ['a']);
    await assignRecipe('2026-10-21', 'dinner', 'salatka-grecka', ['a']);

    await removePlanEntry('2026-10-21', 'lunch');

    expect((await listPlanEntries('2026-10-21', '2026-10-21')).map((e) => e.mealType)).toEqual([
      'dinner',
    ]);
  });
});

describe('cleaning up the plan', () => {
  it('takes a removed member off the meals they ate and keeps the others', async () => {
    const anna = await addMember(member);
    const bartek = await addMember({ ...member, name: 'Bartek' });
    await assignRecipe('2026-10-21', 'lunch', 'szakszuka', [anna.id, bartek.id]);
    await assignRecipe('2026-10-22', 'dinner', 'salatka-grecka', [anna.id]);

    await removeMember(anna.id);

    expect(await listPlanEntries('2026-10-21', '2026-10-22')).toEqual([
      { date: '2026-10-21', mealType: 'lunch', recipeId: 'szakszuka', memberIds: [bartek.id] },
      { date: '2026-10-22', mealType: 'dinner', recipeId: 'salatka-grecka', memberIds: [] },
    ]);
  });

  it('removes a deleted custom recipe from the plan but not other meals', async () => {
    const custom = await addCustomRecipe(recipe);
    await assignRecipe('2026-10-21', 'lunch', custom.id, ['a']);
    await assignRecipe('2026-10-21', 'dinner', 'salatka-grecka', ['a']);

    await removeCustomRecipe(custom.id);

    expect((await listPlanEntries('2026-10-21', '2026-10-21')).map((e) => e.recipeId)).toEqual([
      'salatka-grecka',
    ]);
  });
});
