import { describe, expect, it } from 'vitest';
import { createCatalog } from '../recipes/ingredient';
import type { Ingredient } from '../recipes/ingredient';
import type { Recipe } from '../recipes/recipe';
import type { Member } from './member';
import {
  NO_RESTRICTIONS,
  conflictsForMembers,
  hasRestrictions,
  recipeConflicts,
} from './restrictions';
import type { Restrictions } from './restrictions';

function food(
  id: string,
  category: Ingredient['category'],
  allergens?: Ingredient['allergens'],
): Ingredient {
  return {
    id,
    name: id,
    category,
    per100g: { kcal: 100, proteinG: 1, fatG: 1, carbsG: 1 },
    ...(allergens ? { allergens } : {}),
  };
}

const catalog = createCatalog([
  food('rice', 'grains'),
  food('chicken', 'meat'),
  food('salmon', 'fish', ['fish']),
  food('milk', 'dairy', ['milk']),
  food('butter', 'dairy', ['milk']),
  food('egg', 'eggs', ['eggs']),
  food('bread', 'grains', ['gluten']),
  food('soy-sauce', 'other', ['gluten', 'soy']),
  food('onion', 'vegetables'),
  food('carrot', 'vegetables'),
]);

function recipeWith(...ingredientIds: string[]): Pick<Recipe, 'ingredients'> {
  return { ingredients: ingredientIds.map((ingredientId) => ({ ingredientId, grams: 100 })) };
}

function restrictions(extra: Partial<Restrictions>): Restrictions {
  return { ...NO_RESTRICTIONS, ...extra };
}

describe('hasRestrictions', () => {
  it('is false for a person without any', () => {
    expect(hasRestrictions(undefined)).toBe(false);
    expect(hasRestrictions(NO_RESTRICTIONS)).toBe(false);
  });

  it.each([
    [{ diet: 'vegan' as const }],
    [{ allergens: ['milk' as const] }],
    [{ avoidedIngredientIds: ['onion'] }],
  ])('is true when there is something to avoid: %j', (extra) => {
    expect(hasRestrictions(restrictions(extra))).toBe(true);
  });
});

describe('recipeConflicts', () => {
  it('finds nothing for a person who eats anything', () => {
    expect(recipeConflicts(recipeWith('chicken', 'milk', 'egg'), undefined, catalog)).toEqual([]);
    expect(recipeConflicts(recipeWith('chicken', 'milk'), NO_RESTRICTIONS, catalog)).toEqual([]);
  });

  it('finds nothing in a recipe that avoids what the person avoids', () => {
    const vegan = restrictions({ diet: 'vegan', allergens: ['milk', 'eggs'] });

    expect(recipeConflicts(recipeWith('rice', 'onion', 'carrot'), vegan, catalog)).toEqual([]);
  });

  it('finds a recipe that does not fit the diet', () => {
    expect(
      recipeConflicts(recipeWith('rice', 'chicken'), restrictions({ diet: 'vegetarian' }), catalog),
    ).toEqual([{ kind: 'diet', diet: 'vegetarian' }]);
  });

  it('lets a pescatarian eat fish, but not a vegetarian', () => {
    const fish = recipeWith('rice', 'salmon');

    expect(recipeConflicts(fish, restrictions({ diet: 'pescatarian' }), catalog)).toEqual([]);
    expect(recipeConflicts(fish, restrictions({ diet: 'vegetarian' }), catalog)).toEqual([
      { kind: 'diet', diet: 'vegetarian' },
    ]);
  });

  it('names the ingredients that contain an allergen the person avoids', () => {
    const conflicts = recipeConflicts(
      recipeWith('rice', 'milk', 'butter'),
      restrictions({ allergens: ['milk'] }),
      catalog,
    );

    expect(conflicts).toEqual([
      { kind: 'allergen', allergen: 'milk', ingredientIds: ['milk', 'butter'] },
    ]);
  });

  it('reports each allergen separately, also when one ingredient has several', () => {
    const conflicts = recipeConflicts(
      recipeWith('rice', 'soy-sauce'),
      restrictions({ allergens: ['gluten', 'soy', 'fish'] }),
      catalog,
    );

    expect(conflicts).toEqual([
      { kind: 'allergen', allergen: 'gluten', ingredientIds: ['soy-sauce'] },
      { kind: 'allergen', allergen: 'soy', ingredientIds: ['soy-sauce'] },
    ]);
  });

  it('ignores an allergen that is not avoided', () => {
    expect(
      recipeConflicts(recipeWith('bread'), restrictions({ allergens: ['milk'] }), catalog),
    ).toEqual([]);
  });

  it('finds an avoided ingredient', () => {
    expect(
      recipeConflicts(
        recipeWith('rice', 'onion'),
        restrictions({ avoidedIngredientIds: ['onion', 'carrot'] }),
        catalog,
      ),
    ).toEqual([{ kind: 'ingredient', ingredientId: 'onion' }]);
  });

  it('reports an avoided ingredient once, as its allergen when that is avoided too', () => {
    const conflicts = recipeConflicts(
      recipeWith('milk', 'onion'),
      restrictions({ allergens: ['milk'], avoidedIngredientIds: ['milk', 'onion'] }),
      catalog,
    );

    expect(conflicts).toEqual([
      { kind: 'allergen', allergen: 'milk', ingredientIds: ['milk'] },
      { kind: 'ingredient', ingredientId: 'onion' },
    ]);
  });

  it('reports an ingredient that is used twice only once', () => {
    const conflicts = recipeConflicts(
      recipeWith('onion', 'rice', 'onion'),
      restrictions({ avoidedIngredientIds: ['onion'] }),
      catalog,
    );

    expect(conflicts).toHaveLength(1);
  });

  it('reports everything at once', () => {
    const conflicts = recipeConflicts(
      recipeWith('chicken', 'butter', 'onion'),
      restrictions({ diet: 'vegetarian', allergens: ['milk'], avoidedIngredientIds: ['onion'] }),
      catalog,
    );

    expect(conflicts.map(({ kind }) => kind)).toEqual(['diet', 'allergen', 'ingredient']);
  });

  it('fails loudly for an ingredient that is not in the catalog', () => {
    expect(() =>
      recipeConflicts(recipeWith('unicorn'), restrictions({ diet: 'vegan' }), catalog),
    ).toThrow('Unknown');
  });
});

describe('conflictsForMembers', () => {
  function member(id: string, extra: Partial<Member> = {}): Member {
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
      ...extra,
    };
  }

  it('lists only the people the recipe does not suit', () => {
    const anna = member('anna', { restrictions: restrictions({ allergens: ['milk'] }) });
    const bartek = member('bartek');
    const celina = member('celina', { restrictions: restrictions({ diet: 'vegan' }) });

    const result = conflictsForMembers(
      recipeWith('rice', 'butter'),
      [anna, bartek, celina],
      catalog,
    );

    expect(result.map(({ member: person }) => person.id)).toEqual(['anna', 'celina']);
  });

  it('is empty when the recipe suits everyone', () => {
    expect(
      conflictsForMembers(recipeWith('rice'), [member('anna'), member('bartek')], catalog),
    ).toEqual([]);
  });

  it('is empty for nobody', () => {
    expect(conflictsForMembers(recipeWith('chicken'), [], catalog)).toEqual([]);
  });
});
