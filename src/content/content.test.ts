import { describe, expect, it } from 'vitest';
import { MEAL_TYPES, compatibleDiets, nutritionPerServing } from '../domain/recipes/recipe';
import { INGREDIENT_CATALOG } from './catalog';
import { ALLERGEN_TABLE_IDS, INGREDIENTS } from './ingredients';
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

describe('ingredient units for the shopping list', () => {
  const counted = INGREDIENTS.filter(({ purchase }) => purchase);
  const liquids = INGREDIENTS.filter(({ gramsPerMl }) => gramsPerMl);

  it('are given to some ingredients, and only some', () => {
    expect(counted.length).toBeGreaterThan(10);
    expect(liquids.length).toBeGreaterThan(2);
    expect(counted.length + liquids.length).toBeLessThan(INGREDIENTS.length);
  });

  it.each(counted)('gives a believable weight of one unit of $name', ({ purchase }) => {
    expect(purchase?.grams).toBeGreaterThanOrEqual(30);
    expect(purchase?.grams).toBeLessThanOrEqual(600);
  });

  it.each(liquids)('gives a believable density of $name', ({ gramsPerMl }) => {
    // Everything from alcohol-free drinks to oil sits between 0.9 and 1.3 g per millilitre.
    expect(gramsPerMl).toBeGreaterThanOrEqual(0.9);
    expect(gramsPerMl).toBeLessThanOrEqual(1.3);
  });

  it('never counts an ingredient in units and by volume at once', () => {
    for (const ingredient of INGREDIENTS) {
      expect(Boolean(ingredient.purchase && ingredient.gramsPerMl), ingredient.id).toBe(false);
    }
  });

  it('weigh an egg the way the recipes do', () => {
    // The scrambled eggs use 220 g, which has to come out as the 4 eggs it is.
    const egg = INGREDIENT_CATALOG.get('egg');
    const scrambled = recipeById('jajecznica-ze-szpinakiem-i-pomidorem');

    expect(scrambled.ingredients.find(({ ingredientId }) => ingredientId === 'egg')?.grams).toBe(
      4 * (egg?.purchase?.grams ?? 0),
    );
  });
});

describe('allergens of the ingredients', () => {
  const allergensOf = (id: string) => INGREDIENT_CATALOG.get(id)?.allergens ?? [];

  it('are only listed for ingredients that exist', () => {
    for (const id of ALLERGEN_TABLE_IDS) {
      expect(INGREDIENT_CATALOG.has(id), id).toBe(true);
    }
  });

  it('list each allergen once per ingredient', () => {
    for (const { id, allergens = [] } of INGREDIENTS) {
      expect(new Set(allergens).size, id).toBe(allergens.length);
    }
  });

  it('mark everything made from milk, eggs or fish by its food group', () => {
    for (const { id, category } of INGREDIENTS) {
      if (category === 'dairy') expect(allergensOf(id), id).toContain('milk');
      if (category === 'eggs') expect(allergensOf(id), id).toContain('eggs');
      if (category === 'fish') expect(allergensOf(id), id).toContain('fish');
    }
  });

  it('mark every grain product that has gluten, and none of the gluten-free ones', () => {
    const glutenFree = ['rice', 'buckwheat', 'millet'];

    for (const { id, category } of INGREDIENTS) {
      if (category !== 'grains') continue;
      expect(allergensOf(id).includes('gluten'), id).toBe(!glutenFree.includes(id));
    }
  });

  it.each([
    ['peanut-butter', 'peanuts'],
    ['walnuts', 'tree-nuts'],
    ['almonds', 'tree-nuts'],
    ['tofu', 'soy'],
    ['soy-milk', 'soy'],
    ['soy-sauce', 'soy'],
    ['soy-sauce', 'gluten'],
    ['tahini', 'sesame'],
    ['hummus', 'sesame'],
  ] as const)('knows that %s contains %s', (id, allergen) => {
    expect(allergensOf(id)).toContain(allergen);
  });

  it('leave plain vegetables, fruit and meat free of allergens', () => {
    for (const { id, category } of INGREDIENTS) {
      if (['vegetables', 'fruit', 'meat'].includes(category)) {
        expect(allergensOf(id), id).toEqual([]);
      }
    }
  });
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
