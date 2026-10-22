import { beforeEach, describe, expect, it } from 'vitest';
import type { NewMember } from '../domain/household/member';
import type { NewRecipe } from '../domain/recipes/recipe';
import { db } from './db';
import { addMember, removeMember } from './memberRepository';
import {
  applySuggestions,
  assignRecipe,
  listPlanEntries,
  removePlanEntry,
  setBatchDays,
  setEaters,
} from './planRepository';
import { addCustomRecipe, removeCustomRecipe } from './recipeRepository';

const member: NewMember = {
  name: 'Anna',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activity: 'light',
  goal: 'maintain',
  snackKcal: 0,
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

describe('saving suggestions', () => {
  const suggestions = [
    { date: '2026-10-20', mealType: 'breakfast' as const, recipeId: 'szakszuka' },
    { date: '2026-10-20', mealType: 'lunch' as const, recipeId: 'chili-sin-carne' },
    { date: '2026-10-21', mealType: 'dinner' as const, recipeId: 'salatka-grecka' },
  ];

  it('plans every suggestion for the given people', async () => {
    const saved = await applySuggestions(suggestions, ['a', 'b']);

    expect(saved).toBe(3);
    expect(await listPlanEntries('2026-10-19', '2026-10-25')).toEqual([
      { date: '2026-10-20', mealType: 'breakfast', recipeId: 'szakszuka', memberIds: ['a', 'b'] },
      { date: '2026-10-20', mealType: 'lunch', recipeId: 'chili-sin-carne', memberIds: ['a', 'b'] },
      { date: '2026-10-21', mealType: 'dinner', recipeId: 'salatka-grecka', memberIds: ['a', 'b'] },
    ]);
  });

  it('never replaces a meal that is planned already', async () => {
    await assignRecipe('2026-10-20', 'lunch', 'spaghetti-bolognese', ['a']);

    const saved = await applySuggestions(suggestions, ['a', 'b']);

    expect(saved).toBe(2);
    const lunch = (await listPlanEntries('2026-10-20', '2026-10-20')).find(
      ({ mealType }) => mealType === 'lunch',
    );
    expect(lunch).toMatchObject({ recipeId: 'spaghetti-bolognese', memberIds: ['a'] });
  });

  it('does nothing for no suggestions', async () => {
    expect(await applySuggestions([], ['a'])).toBe(0);
    expect(await listPlanEntries('2026-10-19', '2026-10-25')).toEqual([]);
  });

  it('gives each meal its own list of eaters', async () => {
    const eaters = ['a'];
    await applySuggestions(suggestions, eaters);
    eaters.push('b');

    const entries = await listPlanEntries('2026-10-19', '2026-10-25');
    expect(entries.every(({ memberIds }) => memberIds.length === 1)).toBe(true);
  });
});

describe('cooking for several days', () => {
  const DAY = '2026-10-21';

  /** "21 stew", "22 stew (z 21)": day of the month, dish and the day it was cooked. */
  async function lunches(): Promise<string[]> {
    return (await listPlanEntries('2026-10-19', '2026-10-31'))
      .filter((entry) => entry.mealType === 'lunch')
      .map(
        (entry) =>
          `${entry.date.slice(8)} ${entry.recipeId}${entry.cookedOn ? ` (z ${entry.cookedOn.slice(8)})` : ''}`,
      );
  }

  it('spreads a dish over more days for the same people', async () => {
    await assignRecipe(DAY, 'lunch', 'stew', ['a', 'b']);

    await setBatchDays(DAY, 'lunch', 3);

    expect(await lunches()).toEqual(['21 stew', '22 stew (z 21)', '23 stew (z 21)']);
    const [cook, ...leftovers] = await listPlanEntries(DAY, '2026-10-23');
    expect(cook?.batchId).toBeTruthy();
    expect(leftovers.map((entry) => entry.batchId)).toEqual([cook?.batchId, cook?.batchId]);
    expect(leftovers.map((entry) => entry.memberIds)).toEqual([
      ['a', 'b'],
      ['a', 'b'],
    ]);
  });

  it('pushes later dishes back and brings them forward again', async () => {
    await assignRecipe(DAY, 'lunch', 'stew', ['a']);
    await assignRecipe('2026-10-22', 'lunch', 'soup', ['a']);
    await assignRecipe('2026-10-23', 'lunch', 'pizza', ['a']);

    await setBatchDays(DAY, 'lunch', 3);
    expect(await lunches()).toEqual([
      '21 stew',
      '22 stew (z 21)',
      '23 stew (z 21)',
      '24 soup',
      '25 pizza',
    ]);

    await setBatchDays(DAY, 'lunch', 1);
    expect(await lunches()).toEqual(['21 stew', '22 soup', '23 pizza']);
    expect((await listPlanEntries(DAY, DAY))[0]?.batchId).toBeUndefined();
  });

  it('does not touch other meals of those days', async () => {
    await assignRecipe(DAY, 'lunch', 'stew', ['a']);
    await assignRecipe('2026-10-22', 'dinner', 'salad', ['a']);

    await setBatchDays(DAY, 'lunch', 3);

    const dinners = (await listPlanEntries('2026-10-22', '2026-10-22')).filter(
      (entry) => entry.mealType === 'dinner',
    );
    expect(dinners.map((entry) => entry.recipeId)).toEqual(['salad']);
  });

  it('swaps the dish on every day of the batch and keeps who eats each day', async () => {
    await assignRecipe(DAY, 'lunch', 'stew', ['a', 'b']);
    await setBatchDays(DAY, 'lunch', 2);
    await setEaters('2026-10-22', 'lunch', ['b']);

    await assignRecipe(DAY, 'lunch', 'curry', ['a', 'b']);

    expect(await lunches()).toEqual(['21 curry', '22 curry (z 21)']);
    const [first, second] = await listPlanEntries(DAY, '2026-10-22');
    expect(first?.memberIds).toEqual(['a', 'b']);
    expect(second?.memberIds).toEqual(['b']);
  });

  it('removes every day of the batch together', async () => {
    await assignRecipe(DAY, 'lunch', 'stew', ['a']);
    await setBatchDays(DAY, 'lunch', 3);

    await removePlanEntry(DAY, 'lunch');

    expect(await lunches()).toEqual([]);
  });

  it('refuses to swap or remove a single leftover day', async () => {
    await assignRecipe(DAY, 'lunch', 'stew', ['a']);
    await setBatchDays(DAY, 'lunch', 2);

    await expect(assignRecipe('2026-10-22', 'lunch', 'curry', ['a'])).rejects.toThrow('leftover');
    await expect(removePlanEntry('2026-10-22', 'lunch')).rejects.toThrow('leftover');
    expect(await lunches()).toEqual(['21 stew', '22 stew (z 21)']);
  });

  it('does not resize from a day without a dish or from a leftover day', async () => {
    await expect(setBatchDays(DAY, 'lunch', 2)).rejects.toThrow('Nothing is planned');

    await assignRecipe(DAY, 'lunch', 'stew', ['a']);
    await setBatchDays(DAY, 'lunch', 2);
    await expect(setBatchDays('2026-10-22', 'lunch', 1)).rejects.toThrow('leftover');
  });

  it('is cleared completely when a custom recipe that is cooked ahead is deleted', async () => {
    const custom = await addCustomRecipe(recipe);
    await assignRecipe(DAY, 'lunch', custom.id, ['a']);
    await setBatchDays(DAY, 'lunch', 3);

    await removeCustomRecipe(custom.id);

    expect(await lunches()).toEqual([]);
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
