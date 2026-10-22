import { describe, expect, it } from 'vitest';
import { createCatalog, requireIngredient } from '../recipes/ingredient';
import type { Ingredient } from '../recipes/ingredient';
import type { Recipe } from '../recipes/recipe';
import type { PlannedMeal } from './portions';
import type { PlanEntry } from './planEntry';
import { buildShoppingList, buyingAmount, entriesToBuyFor } from './shoppingList';

function food(
  id: string,
  name: string,
  category: Ingredient['category'],
  how: Pick<Ingredient, 'purchase' | 'gramsPerMl'> = {},
): Ingredient {
  return { id, name, category, per100g: { kcal: 100, proteinG: 1, fatG: 1, carbsG: 1 }, ...how };
}

const catalog = createCatalog([
  food('carrot', 'Marchew', 'vegetables'),
  food('garlic', 'Czosnek', 'vegetables'),
  food('beetroot', 'Ćwikła', 'vegetables'),
  food('onion', 'Cebula', 'vegetables'),
  food('apple', 'Jabłko', 'fruit'),
  food('salmon', 'Łosoś', 'fish'),
  food('milk', 'Mleko', 'dairy'),
  food('egg', 'Jajko', 'eggs', { purchase: { unit: 'piece', grams: 55 } }),
  food('butter', 'Masło', 'dairy', { purchase: { unit: 'pack', grams: 200 } }),
  food('uht-milk', 'Mleko UHT', 'dairy', { gramsPerMl: 1.03 }),
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

describe('buyingAmount', () => {
  const ingredient = (id: string) => requireIngredient(id, catalog);

  it('weighs what has no unit of its own', () => {
    expect(buyingAmount(ingredient('carrot'), 652)).toEqual({ kind: 'weight', grams: 650 });
  });

  it('counts items in whole units, rounding up', () => {
    // 340 g is 6.2 eggs of 55 g, and a shop does not sell 0.2 of an egg
    expect(buyingAmount(ingredient('egg'), 340)).toEqual({
      kind: 'units',
      count: 7,
      unit: 'piece',
      neededGrams: 340,
    });
  });

  it('keeps an exact number of units as it is', () => {
    expect(buyingAmount(ingredient('egg'), 330)).toMatchObject({ kind: 'units', count: 6 });
  });

  it('buys at least one unit, however little is needed', () => {
    expect(buyingAmount(ingredient('butter'), 10)).toEqual({
      kind: 'units',
      count: 1,
      unit: 'pack',
      neededGrams: 10,
    });
  });

  it('remembers the weight that is needed, rounded for the kitchen', () => {
    expect(buyingAmount(ingredient('butter'), 242)).toEqual({
      kind: 'units',
      count: 2,
      unit: 'pack',
      neededGrams: 240,
    });
  });

  it('converts a liquid to millilitres, rounded to ten', () => {
    // 515 g at 1.03 g/ml is exactly 500 ml
    expect(buyingAmount(ingredient('uht-milk'), 515)).toEqual({ kind: 'volume', milliliters: 500 });
    expect(buyingAmount(ingredient('uht-milk'), 1550)).toEqual({
      kind: 'volume',
      milliliters: 1500,
    });
  });

  it('asks for at least ten millilitres of a liquid', () => {
    expect(buyingAmount(ingredient('uht-milk'), 1)).toEqual({ kind: 'volume', milliliters: 10 });
  });
});

describe('buildShoppingList with units', () => {
  it('counts the units of the total, not of each meal', () => {
    // 60 g of egg in each of three meals is 180 g, or 4 eggs. Counting each meal on its own
    // would give 2 eggs three times, which is 6.
    const list = buildShoppingList(
      [meal(['egg', 60]), meal(['egg', 60]), meal(['egg', 60])],
      catalog,
    );

    expect(list[0]?.items[0]?.amount).toMatchObject({ kind: 'units', count: 4 });
  });

  it('keeps the weight next to the amount', () => {
    const list = buildShoppingList([meal(['butter', 250])], catalog);

    expect(list[0]?.items[0]).toMatchObject({ grams: 250, amount: { count: 2 } });
  });
});
