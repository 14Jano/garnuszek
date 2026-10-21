import { describe, expect, it } from 'vitest';
import { createCatalog } from '../recipes/ingredient';
import type { Ingredient } from '../recipes/ingredient';
import type { Recipe } from '../recipes/recipe';
import type { PlannedMeal } from './portions';
import type { PlanEntry } from './planEntry';
import { buildShoppingList, entriesToBuyFor } from './shoppingList';

function food(id: string, name: string, category: Ingredient['category']): Ingredient {
  return { id, name, category, per100g: { kcal: 100, proteinG: 1, fatG: 1, carbsG: 1 } };
}

const catalog = createCatalog([
  food('carrot', 'Marchew', 'vegetables'),
  food('garlic', 'Czosnek', 'vegetables'),
  food('beetroot', 'Ćwikła', 'vegetables'),
  food('onion', 'Cebula', 'vegetables'),
  food('apple', 'Jabłko', 'fruit'),
  food('salmon', 'Łosoś', 'fish'),
  food('milk', 'Mleko', 'dairy'),
]);

const recipe: Recipe = {
  id: 'r',
  name: 'Przepis',
  mealType: 'lunch',
  servings: 2,
  prepMinutes: 10,
  ingredients: [],
  steps: [],
};

/** Only the ingredients matter for the shopping list, so the portions are left out. */
function meal(...ingredients: [string, number][]): PlannedMeal {
  return {
    entry: { date: '2026-10-21', mealType: 'lunch', recipeId: 'r', memberIds: [] },
    recipe,
    portions: [],
    totalServings: 0,
    ingredients: ingredients.map(([ingredientId, grams]) => ({ ingredientId, grams })),
  };
}

describe('entriesToBuyFor', () => {
  // The week is Monday 2026-10-19 to Sunday 2026-10-25.
  const FIRST = '2026-10-19';
  const LAST = '2026-10-25';

  function entry(date: string, extra: Partial<PlanEntry> = {}): PlanEntry {
    return { date, mealType: 'lunch', recipeId: 'r', memberIds: ['a'], ...extra };
  }

  it('keeps the meals of the week and drops the others', () => {
    const entries = [
      entry('2026-10-18'),
      entry('2026-10-19'),
      entry('2026-10-25'),
      entry('2026-10-26'),
    ];

    expect(entriesToBuyFor(entries, FIRST, LAST).map((e) => e.date)).toEqual([
      '2026-10-19',
      '2026-10-25',
    ]);
  });

  it('buys a whole batch in the week it is cooked, even when it ends in the next one', () => {
    const entries = [
      entry('2026-10-25', { batchId: 'b' }),
      entry('2026-10-26', { batchId: 'b', cookedOn: '2026-10-25' }),
      entry('2026-10-27', { batchId: 'b', cookedOn: '2026-10-25' }),
    ];

    expect(entriesToBuyFor(entries, FIRST, LAST)).toHaveLength(3);
  });

  it('does not buy leftovers again in the week after the one it was cooked in', () => {
    const entries = [
      entry('2026-10-25', { batchId: 'b' }),
      entry('2026-10-26', { batchId: 'b', cookedOn: '2026-10-25' }),
      entry('2026-10-27', { mealType: 'dinner' }),
    ];

    const nextWeek = entriesToBuyFor(entries, '2026-10-26', '2026-11-01');

    expect(nextWeek.map((e) => `${e.date} ${e.mealType}`)).toEqual(['2026-10-27 dinner']);
  });

  it('counts the days of a batch inside the week once', () => {
    const entries = [
      entry('2026-10-20', { batchId: 'b' }),
      entry('2026-10-21', { batchId: 'b', cookedOn: '2026-10-20' }),
    ];

    expect(entriesToBuyFor(entries, FIRST, LAST)).toHaveLength(2);
  });
});

describe('buildShoppingList', () => {
  it('is empty when nothing is planned', () => {
    expect(buildShoppingList([], catalog)).toEqual([]);
  });

  it('adds up an ingredient used in several meals', () => {
    const list = buildShoppingList(
      [meal(['carrot', 300]), meal(['carrot', 250], ['milk', 400]), meal(['carrot', 100])],
      catalog,
    );

    const carrot = list.flatMap((section) => section.items).find((item) => item.name === 'Marchew');
    expect(carrot?.grams).toBe(650);
  });

  it('rounds only after adding, so rounding does not pile up', () => {
    // Each 102 g would round to 100 g on its own, giving 200 g instead of 205 g.
    const list = buildShoppingList([meal(['carrot', 102]), meal(['carrot', 102])], catalog);

    expect(list[0]?.items[0]?.grams).toBe(205);
  });

  it('groups by food group in shop order and leaves out empty groups', () => {
    const list = buildShoppingList(
      [meal(['milk', 200], ['salmon', 300], ['apple', 150], ['carrot', 100])],
      catalog,
    );

    expect(list.map((section) => section.category)).toEqual([
      'vegetables',
      'fruit',
      'fish',
      'dairy',
    ]);
  });

  it('sorts items by name using Polish alphabetical order', () => {
    const list = buildShoppingList(
      [meal(['carrot', 100], ['beetroot', 100], ['garlic', 100], ['onion', 100])],
      catalog,
    );

    expect(list[0]?.items.map((item) => item.name)).toEqual([
      'Cebula',
      'Czosnek',
      'Ćwikła',
      'Marchew',
    ]);
  });

  it('fails loudly for an ingredient that is not in the catalog', () => {
    expect(() => buildShoppingList([meal(['unicorn', 100])], catalog)).toThrow('Unknown');
  });
});
