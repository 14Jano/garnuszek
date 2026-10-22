import { describe, expect, it } from 'vitest';
import type { Member } from '../household/member';
import type { Restrictions } from '../household/restrictions';
import { createCatalog } from '../recipes/ingredient';
import type { Ingredient } from '../recipes/ingredient';
import type { MealType, Recipe } from '../recipes/recipe';
import { autoPlan, portionFit } from './autoPlan';
import type { AutoPlanRequest, PlannableRecipe } from './autoPlan';
import { addDays, weekDays } from './dates';

function food(
  id: string,
  category: Ingredient['category'],
  kcal: number,
  allergens?: Ingredient['allergens'],
): Ingredient {
  return {
    id,
    name: id,
    category,
    per100g: { kcal, proteinG: 1, fatG: 1, carbsG: 1 },
    ...(allergens ? { allergens } : {}),
  };
}

const catalog = createCatalog([
  // 100 g of this is one natural portion for an adult at any meal
  food('rice', 'grains', 500),
  food('milk', 'dairy', 500, ['milk']),
  food('chicken', 'meat', 500),
  food('crumb', 'grains', 10),
  food('feast', 'fats', 3000),
]);

function recipe(id: string, mealType: MealType, ...ingredients: [string, number][]): Recipe {
  return {
    id,
    name: id,
    mealType,
    servings: 1,
    prepMinutes: 10,
    ingredients: ingredients.map(([ingredientId, grams]) => ({ ingredientId, grams })),
    steps: [],
  };
}

/** `count` dishes of one meal type, each about 500 kcal a serving, with ids like `lunch-3`. */
function dishes(
  mealType: MealType,
  count: number,
  ingredient = 'rice',
  prefix: string = mealType,
): PlannableRecipe[] {
  return Array.from({ length: count }, (_, index) => ({
    recipe: recipe(`${prefix}-${index + 1}`, mealType, [ingredient, 100]),
    favorite: false,
  }));
}

function adult(id: string, restrictions?: Restrictions): Member {
  return {
    id,
    name: id,
    sex: 'female',
    age: 30,
    heightCm: 165,
    weightKg: 60,
    activity: 'light',
    goal: 'maintain',
    snackKcal: 0,
    ...(restrictions ? { restrictions } : {}),
  };
}

const WEEK = weekDays('2026-10-21');
const ALL_MEALS: readonly MealType[] = ['breakfast', 'lunch', 'dinner'];

function request(overrides: Partial<AutoPlanRequest> = {}): AutoPlanRequest {
  return {
    days: WEEK,
    mealTypes: ALL_MEALS,
    household: [adult('anna')],
    recipes: [...dishes('breakfast', 5), ...dishes('lunch', 5), ...dishes('dinner', 5)],
    existing: [],
    catalog,
    seed: 1,
    ...overrides,
  };
}

function uses(plan: ReturnType<typeof autoPlan>, mealType: MealType): Map<string, number> {
  const counts = new Map<string, number>();
  for (const suggestion of plan.suggestions.filter((s) => s.mealType === mealType)) {
    counts.set(suggestion.recipeId, (counts.get(suggestion.recipeId) ?? 0) + 1);
  }
  return counts;
}

describe('autoPlan', () => {
  it('fills every meal of the week when there are enough dishes', () => {
    const plan = autoPlan(request());

    expect(plan.suggestions).toHaveLength(21);
    expect(plan.gaps).toEqual([]);
    expect(plan.kept).toBe(0);
  });

  it('lists the suggestions in calendar order', () => {
    const plan = autoPlan(request());

    const slots = plan.suggestions.map(
      ({ date, mealType }) => `${date} ${ALL_MEALS.indexOf(mealType)}`,
    );
    expect(slots).toEqual([...slots].sort());
  });

  it('gives each meal a dish of its own kind', () => {
    const plan = autoPlan(request());

    for (const { mealType, recipeId } of plan.suggestions) {
      expect(recipeId.startsWith(mealType)).toBe(true);
    }
  });

  it('plans only the meals that are asked for', () => {
    const plan = autoPlan(request({ mealTypes: ['lunch'] }));

    expect(plan.suggestions).toHaveLength(7);
    expect(new Set(plan.suggestions.map(({ mealType }) => mealType))).toEqual(new Set(['lunch']));
  });

  it('plans only the days it is given', () => {
    const plan = autoPlan(request({ days: WEEK.slice(0, 3) }));

    expect(plan.suggestions).toHaveLength(9);
  });

  it('leaves what is planned already alone and counts it', () => {
    const existing = [
      { date: WEEK[0] ?? '', mealType: 'lunch' as const, recipeId: 'lunch-1', memberIds: ['anna'] },
      {
        date: WEEK[2] ?? '',
        mealType: 'dinner' as const,
        recipeId: 'dinner-2',
        memberIds: ['anna'],
      },
    ];

    const plan = autoPlan(request({ existing }));

    expect(plan.kept).toBe(2);
    expect(plan.suggestions).toHaveLength(19);
    expect(
      plan.suggestions.some(({ date, mealType }) => date === WEEK[0] && mealType === 'lunch'),
    ).toBe(false);
    expect(
      plan.suggestions.some(({ date, mealType }) => date === WEEK[2] && mealType === 'dinner'),
    ).toBe(false);
  });

  it('does not count a planned meal of a kind that is not asked for', () => {
    const existing = [
      {
        date: WEEK[0] ?? '',
        mealType: 'dinner' as const,
        recipeId: 'dinner-1',
        memberIds: ['anna'],
      },
    ];

    expect(autoPlan(request({ existing, mealTypes: ['lunch'] })).kept).toBe(0);
  });

  it('plans nothing when there is nothing to plan with', () => {
    const plan = autoPlan(request({ recipes: [] }));

    expect(plan.suggestions).toEqual([]);
    expect(plan.gaps).toHaveLength(21);
  });

  it('reports a gap for a meal without a dish of its kind', () => {
    const plan = autoPlan(request({ recipes: [...dishes('lunch', 5), ...dishes('dinner', 5)] }));

    expect(plan.gaps.filter(({ mealType }) => mealType === 'breakfast')).toHaveLength(7);
    expect(plan.suggestions).toHaveLength(14);
  });

  describe('what people avoid', () => {
    it('never proposes a dish with an allergen that someone avoids', () => {
      const milky = dishes('lunch', 3, 'milk', 'milky');
      const anna = adult('anna', { allergens: ['milk'], avoidedIngredientIds: [] });

      for (let seed = 1; seed <= 25; seed += 1) {
        const plan = autoPlan(
          request({ household: [anna], recipes: [...dishes('lunch', 3), ...milky], seed }),
        );

        for (const { recipeId } of plan.suggestions) {
          expect(milky.some(({ recipe }) => recipe.id === recipeId)).toBe(false);
        }
      }
    });

    it('takes everyone in the household into account', () => {
      const meat = dishes('lunch', 4, 'chicken', 'meat');
      const plain = dishes('lunch', 4).map(({ recipe, favorite }) => ({
        recipe: { ...recipe, id: `plain-${recipe.id}` },
        favorite,
      }));
      const household = [
        adult('anna'),
        adult('bartek', { diet: 'vegetarian', allergens: [], avoidedIngredientIds: [] }),
      ];

      const plan = autoPlan(
        request({ household, recipes: [...meat, ...plain], mealTypes: ['lunch'] }),
      );

      expect(plan.suggestions.every(({ recipeId }) => recipeId.startsWith('plain-'))).toBe(true);
    });

    it('avoids a single ingredient', () => {
      const withChicken = dishes('lunch', 2, 'chicken', 'chicken-dish');
      const anna = adult('anna', { allergens: [], avoidedIngredientIds: ['chicken'] });

      const plan = autoPlan(
        request({ household: [anna], recipes: [...dishes('lunch', 3), ...withChicken] }),
      );

      expect(plan.suggestions.length).toBeGreaterThan(0);
      expect(plan.suggestions.some(({ recipeId }) => recipeId.startsWith('chicken-dish'))).toBe(
        false,
      );
    });

    it('reports gaps when every dish is avoided', () => {
      const anna = adult('anna', { allergens: [], avoidedIngredientIds: ['rice'] });

      const plan = autoPlan(request({ household: [anna] }));

      expect(plan.suggestions).toEqual([]);
      expect(plan.gaps).toHaveLength(21);
    });
  });

  describe('variety', () => {
    it('does not serve the same dish all week', () => {
      for (let seed = 1; seed <= 25; seed += 1) {
        const counts = uses(autoPlan(request({ seed })), 'lunch');

        // Seven lunches from five dishes: nothing more than twice
        expect(Math.max(...counts.values()), `seed ${seed}`).toBeLessThanOrEqual(2);
      }
    });

    it('uses every dish before repeating one, when there are as many dishes as days', () => {
      for (let seed = 1; seed <= 25; seed += 1) {
        const plan = autoPlan(request({ recipes: dishes('lunch', 7), mealTypes: ['lunch'], seed }));

        expect(new Set(plan.suggestions.map(({ recipeId }) => recipeId)).size, `seed ${seed}`).toBe(
          7,
        );
      }
    });

    it('does not repeat a dish on the same day or the next', () => {
      for (let seed = 1; seed <= 25; seed += 1) {
        const plan = autoPlan(request({ mealTypes: ['lunch'], seed }));
        const lunches = plan.suggestions.map(({ recipeId }) => recipeId);

        lunches.slice(1).forEach((recipeId, index) => {
          expect(recipeId, `seed ${seed}, day ${index + 1}`).not.toBe(lunches[index]);
        });
      }
    });

    it('counts what is planned already when it avoids repeating', () => {
      // Every dish is already used once, except one that is left to choose.
      const existing = Array.from({ length: 4 }, (_, index) => ({
        date: addDays(WEEK[0] ?? '', index),
        mealType: 'lunch' as const,
        recipeId: `lunch-${index + 1}`,
        memberIds: ['anna'],
      }));
      let fresh = 0;

      for (let seed = 1; seed <= 100; seed += 1) {
        const plan = autoPlan(
          request({ existing, mealTypes: ['lunch'], days: WEEK.slice(4, 5), seed }),
        );
        if (plan.suggestions[0]?.recipeId === 'lunch-5') fresh += 1;
      }

      // A dish is not used again while another one has not been used at all.
      expect(fresh).toBe(100);
    });

    it('likes favorites a little more', () => {
      const recipes = dishes('lunch', 2).map((dish, index) => ({ ...dish, favorite: index === 0 }));
      let favorite = 0;

      for (let seed = 1; seed <= 400; seed += 1) {
        const plan = autoPlan(
          request({ recipes, mealTypes: ['lunch'], days: WEEK.slice(0, 1), seed }),
        );
        if (plan.suggestions[0]?.recipeId === 'lunch-1') favorite += 1;
      }

      // 1.6 against 1 is about 62%
      expect(favorite / 400).toBeGreaterThan(0.5);
      expect(favorite / 400).toBeLessThan(0.75);
    });
  });

  describe('portions', () => {
    it('never proposes a dish that is far too small a meal', () => {
      const tiny = [{ recipe: recipe('tiny', 'lunch', ['crumb', 100]), favorite: false }];

      const plan = autoPlan(
        request({ recipes: [...dishes('lunch', 2), ...tiny], mealTypes: ['lunch'] }),
      );

      expect(plan.suggestions.some(({ recipeId }) => recipeId === 'tiny')).toBe(false);
    });

    it('never proposes a dish that is far too big a meal', () => {
      const huge = [{ recipe: recipe('huge', 'lunch', ['feast', 400]), favorite: false }];

      const plan = autoPlan(
        request({ recipes: [...dishes('lunch', 2), ...huge], mealTypes: ['lunch'] }),
      );

      expect(plan.suggestions.some(({ recipeId }) => recipeId === 'huge')).toBe(false);
    });

    it('has to work for the person who needs the most and the one who needs the least', () => {
      const child: Member = { ...adult('zosia'), age: 8, heightCm: 128, weightKg: 26 };
      // For a child a 500 kcal serving is a natural portion, but 5000 kcal for the adult is not.
      const plan = autoPlan(
        request({
          household: [adult('anna'), child],
          recipes: [{ recipe: recipe('feast-lunch', 'lunch', ['feast', 170]), favorite: false }],
          mealTypes: ['lunch'],
        }),
      );

      expect(plan.suggestions).toEqual([]);
    });
  });

  describe('repeatability', () => {
    it('gives the same plan for the same seed', () => {
      expect(autoPlan(request({ seed: 42 }))).toEqual(autoPlan(request({ seed: 42 })));
    });

    it('gives another plan for another seed', () => {
      const plans = [1, 2, 3, 4, 5].map((seed) =>
        JSON.stringify(autoPlan(request({ seed })).suggestions),
      );

      expect(new Set(plans).size).toBeGreaterThan(1);
    });
  });
});

describe('portionFit', () => {
  it.each([0.6, 1, 1.5, 2.4])('is 1 for a natural portion of %s servings', (servings) => {
    expect(portionFit(servings)).toBe(1);
  });

  it('falls the further the portion is from natural', () => {
    expect(portionFit(3)).toBeLessThan(1);
    expect(portionFit(3)).toBeGreaterThan(portionFit(5));
    expect(portionFit(0.4)).toBeLessThan(1);
    expect(portionFit(0.4)).toBeGreaterThan(portionFit(0.2));
  });

  it('is 0 for a portion that cannot exist', () => {
    expect(portionFit(0)).toBe(0);
    expect(portionFit(-1)).toBe(0);
  });
});
