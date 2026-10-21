import { describe, expect, it } from 'vitest';
import type { Member } from '../household/member';
import { createCatalog } from '../recipes/ingredient';
import type { Recipe } from '../recipes/recipe';
import {
  MEAL_SHARES,
  PORTION_LIMITS,
  dayTotals,
  mealCalorieTarget,
  planMeal,
  planMeals,
  portionForTarget,
} from './portions';
import type { PlanEntry } from './planEntry';
import { snackAllowance } from './snacks';

const catalog = createCatalog([
  {
    id: 'x',
    name: 'X',
    category: 'grains',
    per100g: { kcal: 100, proteinG: 10, fatG: 5, carbsG: 20 },
  },
  {
    id: 'water',
    name: 'Woda',
    category: 'other',
    per100g: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  },
]);

/** 1000 g of X shared by 2 servings: 500 kcal per serving. */
const recipe: Recipe = {
  id: 'r',
  name: 'Przepis',
  mealType: 'lunch',
  servings: 2,
  prepMinutes: 20,
  ingredients: [{ ingredientId: 'x', grams: 1000 }],
  steps: [],
};

// Needs 2136 kcal a day, so 854.4 kcal for lunch.
const adam: Member = {
  id: 'adam',
  name: 'Adam',
  sex: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 'sedentary',
  goal: 'maintain',
  snackKcal: 0,
};

// Needs 1584 kcal a day, so 633.6 kcal for lunch.
const basia: Member = {
  id: 'basia',
  name: 'Basia',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activity: 'sedentary',
  goal: 'maintain',
  snackKcal: 0,
};

const lunch: PlanEntry = {
  date: '2026-10-21',
  mealType: 'lunch',
  recipeId: 'r',
  memberIds: ['adam', 'basia'],
};

describe('meal shares', () => {
  it('add up to the whole day', () => {
    const total = Object.values(MEAL_SHARES).reduce((sum, share) => sum + share, 0);

    expect(total).toBeCloseTo(1);
  });

  it('turn a daily target into a meal target', () => {
    expect(mealCalorieTarget(2000, 'breakfast')).toBeCloseTo(600);
    expect(mealCalorieTarget(2000, 'lunch')).toBeCloseTo(800);
  });
});

describe('portionForTarget', () => {
  it('sizes the portion to the calorie target in steps of 0.05', () => {
    // 854.4 / 500 = 1.7088, which rounds to 1.7
    const portion = portionForTarget(recipe, 854.4, catalog);

    expect(portion.servings).toBe(1.7);
    expect(portion.nutrition.kcal).toBeCloseTo(850);
    expect(portion.nutrition.proteinG).toBeCloseTo(85);
  });

  it('scales every ingredient to the person share', () => {
    const portion = portionForTarget(recipe, 854.4, catalog);

    // 1000 g shared by 2 servings, times 1.7 servings
    expect(portion.ingredients).toHaveLength(1);
    expect(portion.ingredients[0]?.ingredientId).toBe('x');
    expect(portion.ingredients[0]?.grams).toBeCloseTo(850);
  });

  it('never gives more than the maximum portion', () => {
    const light = { ...recipe, servings: 1, ingredients: [{ ingredientId: 'x', grams: 100 }] };

    expect(portionForTarget(light, 854.4, catalog).servings).toBe(PORTION_LIMITS.max);
  });

  it('never gives less than the minimum portion', () => {
    const rich = { ...recipe, servings: 1, ingredients: [{ ingredientId: 'x', grams: 10000 }] };

    expect(portionForTarget(rich, 854.4, catalog).servings).toBe(PORTION_LIMITS.min);
  });

  it('falls back to one serving for a recipe without calories', () => {
    const waterOnly = { ...recipe, ingredients: [{ ingredientId: 'water', grams: 500 }] };

    expect(portionForTarget(waterOnly, 854.4, catalog).servings).toBe(1);
  });
});

describe('planMeal', () => {
  it('sizes the meal separately for each person who eats it', () => {
    const meal = planMeal(lunch, recipe, [adam, basia], catalog);

    expect(meal.portions.map(({ member }) => member.name)).toEqual(['Adam', 'Basia']);
    expect(meal.portions[0]?.servings).toBe(1.7);
    // 633.6 / 500 = 1.2672, which rounds to 1.25
    expect(meal.portions[1]?.servings).toBe(1.25);
    expect(meal.portions[0]?.targetKcal).toBeCloseTo(854.4);
  });

  it('adds up how much to cook and which ingredients to use', () => {
    const meal = planMeal(lunch, recipe, [adam, basia], catalog);

    expect(meal.totalServings).toBe(2.95);
    expect(meal.ingredients).toHaveLength(1);
    expect(meal.ingredients[0]?.grams).toBeCloseTo(1475);
  });

  it('leaves out people who do not eat the meal', () => {
    const meal = planMeal({ ...lunch, memberIds: ['basia'] }, recipe, [adam, basia], catalog);

    expect(meal.portions.map(({ member }) => member.name)).toEqual(['Basia']);
    expect(meal.totalServings).toBe(1.25);
  });

  it('ignores people who no longer live in the household', () => {
    const meal = planMeal({ ...lunch, memberIds: ['adam', 'gone'] }, recipe, [adam], catalog);

    expect(meal.portions).toHaveLength(1);
  });

  it('plans nothing when nobody eats', () => {
    const meal = planMeal({ ...lunch, memberIds: [] }, recipe, [adam, basia], catalog);

    expect(meal.portions).toEqual([]);
    expect(meal.totalServings).toBe(0);
    expect(meal.ingredients).toEqual([]);
  });
});

describe('planMeal with snacks', () => {
  // Without snacks Adam gets 854.4 kcal for lunch, which is 1.7 servings.

  it('sizes the meal for what is left after the snack allowance', () => {
    // (2136 - 300) * 0.4 = 734.4 kcal, which is 1.4688 servings, rounded to 1.45
    const meal = planMeal(lunch, recipe, [adam], catalog, () => 300);

    expect(meal.portions[0]?.servings).toBe(1.45);
    expect(meal.portions[0]?.targetKcal).toBeCloseTo(734.4);
  });

  it('uses the amount from the profile unless told otherwise', () => {
    const snacker = { ...adam, snackKcal: 300 };

    expect(planMeal(lunch, recipe, [snacker], catalog).portions[0]?.servings).toBe(1.45);
  });

  it('lets one day have its own amount', () => {
    const allowance = snackAllowance([{ date: lunch.date, memberId: 'adam', kcal: 300 }]);
    const otherDay: PlanEntry = { ...lunch, date: '2026-10-22' };

    expect(planMeal(lunch, recipe, [adam], catalog, allowance).portions[0]?.servings).toBe(1.45);
    expect(planMeal(otherDay, recipe, [adam], catalog, allowance).portions[0]?.servings).toBe(1.7);
  });

  it('never gives more than half of the day to snacks', () => {
    // Only 1068 kcal are left for meals: 0.4 * 1068 = 427.2 kcal, which is 0.8544 servings
    const meal = planMeal(lunch, recipe, [adam], catalog, () => 5000);

    expect(meal.portions[0]?.servings).toBe(0.85);
  });

  it('passes the allowance on when sizing a whole plan', () => {
    const meals = planMeals([lunch], [recipe], [adam], catalog, () => 300);

    expect(meals[0]?.portions[0]?.servings).toBe(1.45);
  });
});

describe('planMeals', () => {
  it('sizes every entry whose recipe is known', () => {
    const dinner: PlanEntry = { ...lunch, mealType: 'dinner' };

    const meals = planMeals([lunch, dinner], [recipe], [adam, basia], catalog);

    expect(meals.map((meal) => meal.entry.mealType)).toEqual(['lunch', 'dinner']);
    expect(meals[0]?.portions).toHaveLength(2);
  });

  it('skips an entry whose recipe has disappeared', () => {
    const stale: PlanEntry = { ...lunch, mealType: 'dinner', recipeId: 'gone' };

    const meals = planMeals([lunch, stale], [recipe], [adam, basia], catalog);

    expect(meals.map((meal) => meal.entry.mealType)).toEqual(['lunch']);
  });

  it('plans nothing for an empty plan', () => {
    expect(planMeals([], [recipe], [adam], catalog)).toEqual([]);
  });
});

describe('dayTotals', () => {
  it('adds up what each person eats over the day', () => {
    const breakfast = planMeal(
      { ...lunch, mealType: 'breakfast', memberIds: ['adam'] },
      recipe,
      [adam, basia],
      catalog,
    );
    const dinner = planMeal({ ...lunch, mealType: 'dinner' }, recipe, [adam, basia], catalog);

    const totals = dayTotals([breakfast, dinner]);

    // Adam: breakfast 640.8 kcal -> 1.3 servings (650), dinner 640.8 -> 1.3 (650)
    expect(totals.get('adam')?.kcal).toBeCloseTo(1300);
    // Basia only eats dinner: 475.2 kcal -> 0.95 servings (475)
    expect(totals.get('basia')?.kcal).toBeCloseTo(475);
  });

  it('is empty for a day without meals', () => {
    expect(dayTotals([]).size).toBe(0);
  });
});
