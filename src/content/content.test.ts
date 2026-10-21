import { describe, expect, it } from 'vitest';
import { MEAL_TYPES, compatibleDiets, nutritionPerServing } from '../domain/recipes/recipe';
import { INGREDIENT_CATALOG } from './catalog';
import { INGREDIENTS } from './ingredients';
import { BUILTIN_RECIPES } from './recipes';

function recipeById(id: string) {
  const found = BUILTIN_RECIPES.find((recipe) => recipe.id === id);
  if (!found) throw new Error(`No built-in recipe with id ${id}`);
  return found;
}

describe('ingredient catalog', () => {
  it('has unique ids', () => {
    expect(INGREDIENT_CATALOG.size).toBe(INGREDIENTS.length);
  });

  it.each(INGREDIENTS)('lists plausible nutrition for $name', ({ per100g }) => {
    const { kcal, proteinG, fatG, carbsG } = per100g;

    expect(kcal).toBeGreaterThanOrEqual(0);
    expect(kcal).toBeLessThanOrEqual(900);
    // 100 g cannot contain more than 100 g of macronutrients.
    expect(proteinG + fatG + carbsG).toBeLessThanOrEqual(100);
  });

  it.each(INGREDIENTS)(
    'has calories in line with its macronutrients for $name',
    ({ per100g: { kcal, proteinG, fatG, carbsG } }) => {
      // Protein and carbs give about 4 kcal per gram, fat 9. Fibre and water make
      // real foods deviate, so allow 20% or 10 kcal, whichever is larger. This
      // catches typos, not rounding.
      const fromMacros = 4 * proteinG + 4 * carbsG + 9 * fatG;
      const allowed = Math.max(0.2 * kcal, 10);

      expect(Math.abs(kcal - fromMacros)).toBeLessThanOrEqual(allowed);
    },
  );
});

describe('built-in recipes', () => {
  it('have unique ids', () => {
    const ids = BUILTIN_RECIPES.map((recipe) => recipe.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cover every meal type with a healthy selection', () => {
    for (const mealType of MEAL_TYPES) {
      const count = BUILTIN_RECIPES.filter((recipe) => recipe.mealType === mealType).length;
      expect(count, mealType).toBeGreaterThanOrEqual(8);
    }
  });

  it.each(BUILTIN_RECIPES)('$name only uses known ingredients with positive weights', (recipe) => {
    expect(recipe.ingredients.length).toBeGreaterThan(0);

    for (const { ingredientId, grams } of recipe.ingredients) {
      expect(INGREDIENT_CATALOG.has(ingredientId), ingredientId).toBe(true);
      expect(grams).toBeGreaterThan(0);
    }
  });

  it.each(BUILTIN_RECIPES)('$name has steps and a sensible time and yield', (recipe) => {
    expect(recipe.steps.length).toBeGreaterThanOrEqual(2);
    expect(recipe.servings).toBeGreaterThanOrEqual(1);
    expect(recipe.prepMinutes).toBeGreaterThan(0);
    expect(recipe.prepMinutes).toBeLessThanOrEqual(90);
  });

  it.each(BUILTIN_RECIPES)('$name has a realistic portion size', (recipe) => {
    const { kcal } = nutritionPerServing(recipe, INGREDIENT_CATALOG);

    expect(kcal).toBeGreaterThanOrEqual(150);
    expect(kcal).toBeLessThanOrEqual(900);
  });

  it('recognise the diets they fit', () => {
    const diets = (id: string) => compatibleDiets(recipeById(id), INGREDIENT_CATALOG);

    expect(diets('curry-z-ciecierzycy-i-szpinaku')).toEqual(['pescatarian', 'vegetarian', 'vegan']);
    expect(diets('jajecznica-ze-szpinakiem-i-pomidorem')).toEqual(['pescatarian', 'vegetarian']);
    expect(diets('losos-z-batatami-i-brokulem')).toEqual(['pescatarian']);
    expect(diets('spaghetti-bolognese')).toEqual([]);
  });

  it('calculate the nutrition of a recipe from its ingredients', () => {
    // 80 g oats + 300 g milk + 120 g banana + 20 g walnuts, for two servings
    const { kcal, proteinG } = nutritionPerServing(
      recipeById('owsianka-z-bananem-i-orzechami'),
      INGREDIENT_CATALOG,
    );

    expect(Math.round(kcal)).toBe(345);
    expect(Math.round(proteinG)).toBe(12);
  });
});
