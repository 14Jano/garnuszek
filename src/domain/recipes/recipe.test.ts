import { describe, expect, it } from 'vitest';
import { createCatalog, requireIngredient } from './ingredient';
import type { Ingredient } from './ingredient';
import {
  compatibleDiets,
  hasRecipeErrors,
  nutritionPerServing,
  recipeNutrition,
  validateRecipe,
} from './recipe';
import type { Recipe, RecipeDraft } from './recipe';

function ingredient(id: string, category: Ingredient['category'], kcal: number): Ingredient {
  return { id, name: id, category, per100g: { kcal, proteinG: 10, fatG: 5, carbsG: 20 } };
}

const catalog = createCatalog([
  ingredient('oats', 'grains', 400),
  ingredient('milk', 'dairy', 50),
  ingredient('egg', 'eggs', 140),
  ingredient('salmon', 'fish', 200),
  ingredient('chicken', 'meat', 120),
  ingredient('apple', 'fruit', 50),
]);

function recipeOf(...ingredients: [string, number][]): Recipe {
  return {
    id: 'test',
    name: 'Test',
    mealType: 'lunch',
    servings: 2,
    prepMinutes: 10,
    ingredients: ingredients.map(([ingredientId, grams]) => ({ ingredientId, grams })),
    steps: [],
  };
}

describe('createCatalog', () => {
  it('refuses duplicate ids', () => {
    expect(() =>
      createCatalog([ingredient('oats', 'grains', 1), ingredient('oats', 'grains', 2)]),
    ).toThrow('Duplicate ingredient id: oats');
  });

  it('fails loudly for an unknown ingredient', () => {
    expect(() => requireIngredient('unicorn', catalog)).toThrow('Unknown ingredient: unicorn');
  });
});

describe('recipeNutrition', () => {
  it('scales each ingredient by its weight and adds them up', () => {
    // 80 g oats = 320 kcal, 300 g milk = 150 kcal
    const total = recipeNutrition(recipeOf(['oats', 80], ['milk', 300]), catalog);

    expect(total.kcal).toBeCloseTo(470);
    expect(total.proteinG).toBeCloseTo(38);
    expect(total.fatG).toBeCloseTo(19);
    expect(total.carbsG).toBeCloseTo(76);
  });

  it('is zero for a recipe without ingredients', () => {
    expect(recipeNutrition(recipeOf(), catalog).kcal).toBe(0);
  });

  it('divides by the number of servings', () => {
    const perServing = nutritionPerServing(recipeOf(['oats', 80], ['milk', 300]), catalog);

    expect(perServing.kcal).toBeCloseTo(235);
  });

  it('fails when an ingredient is not in the catalog', () => {
    expect(() => recipeNutrition(recipeOf(['unicorn', 10]), catalog)).toThrow('Unknown');
  });
});

describe('compatibleDiets', () => {
  it('fits all diets when there is nothing of animal origin', () => {
    expect(compatibleDiets(recipeOf(['oats', 50], ['apple', 100]), catalog)).toEqual([
      'pescatarian',
      'vegetarian',
      'vegan',
    ]);
  });

  it('allows dairy and eggs for vegetarians but not vegans', () => {
    expect(compatibleDiets(recipeOf(['oats', 50], ['milk', 200], ['egg', 55]), catalog)).toEqual([
      'pescatarian',
      'vegetarian',
    ]);
  });

  it('allows fish only for pescatarians', () => {
    expect(compatibleDiets(recipeOf(['salmon', 150], ['apple', 50]), catalog)).toEqual([
      'pescatarian',
    ]);
  });

  it('fits no diet when there is meat', () => {
    expect(compatibleDiets(recipeOf(['chicken', 200]), catalog)).toEqual([]);
  });
});

describe('validateRecipe', () => {
  const valid: RecipeDraft = {
    name: 'Owsianka',
    servings: 2,
    prepMinutes: 10,
    ingredients: [
      { ingredientId: 'oats', grams: 80 },
      { ingredientId: 'milk', grams: 300 },
    ],
  };

  it('accepts a complete recipe', () => {
    const errors = validateRecipe(valid, catalog);

    expect(hasRecipeErrors(errors)).toBe(false);
    expect(errors.rows).toEqual([{}, {}]);
  });

  it('asks for a name, servings, time and at least one ingredient', () => {
    const errors = validateRecipe(
      { name: ' ', servings: Number.NaN, prepMinutes: Number.NaN, ingredients: [] },
      catalog,
    );

    expect(errors).toEqual({
      name: 'required',
      servings: 'required',
      prepMinutes: 'required',
      noIngredients: true,
      rows: [],
    });
    expect(hasRecipeErrors(errors)).toBe(true);
  });

  it('rejects out-of-range values', () => {
    const errors = validateRecipe(
      { ...valid, name: 'a'.repeat(61), servings: 0, prepMinutes: 601 },
      catalog,
    );

    expect(errors.name).toBe('invalid');
    expect(errors.servings).toBe('invalid');
    expect(errors.prepMinutes).toBe('invalid');
  });

  it('reports problems per ingredient row', () => {
    const errors = validateRecipe(
      {
        ...valid,
        ingredients: [
          { ingredientId: '', grams: 100 },
          { ingredientId: 'oats', grams: Number.NaN },
          { ingredientId: 'unicorn', grams: 5001 },
          { ingredientId: 'milk', grams: 200 },
        ],
      },
      catalog,
    );

    expect(errors.rows).toEqual([
      { ingredientId: 'required' },
      { grams: 'required' },
      { ingredientId: 'invalid', grams: 'invalid' },
      {},
    ]);
    expect(hasRecipeErrors(errors)).toBe(true);
  });
});
