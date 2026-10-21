import { describe, expect, it } from 'vitest';
import { NO_FILTER, filterRecipes, normalizeForSearch } from './filterRecipes';
import { createCatalog } from './ingredient';
import type { Ingredient } from './ingredient';
import type { Recipe } from './recipe';

function ingredient(id: string, name: string, category: Ingredient['category']): Ingredient {
  return { id, name, category, per100g: { kcal: 100, proteinG: 1, fatG: 1, carbsG: 1 } };
}

const catalog = createCatalog([
  ingredient('salmon', 'Łosoś', 'fish'),
  ingredient('oats', 'Płatki owsiane', 'grains'),
  ingredient('milk', 'Mleko', 'dairy'),
  ingredient('chickpeas', 'Ciecierzyca', 'legumes'),
]);

function recipe(
  id: string,
  name: string,
  mealType: Recipe['mealType'],
  ingredientIds: string[],
): Recipe {
  return {
    id,
    name,
    mealType,
    servings: 2,
    prepMinutes: 20,
    ingredients: ingredientIds.map((ingredientId) => ({ ingredientId, grams: 100 })),
    steps: [],
  };
}

const porridge = {
  recipe: recipe('porridge', 'Owsianka', 'breakfast', ['oats', 'milk']),
  favorite: true,
};
const baked = { recipe: recipe('baked', 'Pieczony łosoś', 'lunch', ['salmon']), favorite: false };
const curry = { recipe: recipe('curry', 'Curry', 'dinner', ['chickpeas']), favorite: false };
const entries = [porridge, baked, curry];

describe('normalizeForSearch', () => {
  it('ignores case and Polish diacritics', () => {
    expect(normalizeForSearch('Żółć')).toBe('zolc');
    expect(normalizeForSearch('ŁOSOŚ')).toBe('losos');
  });
});

describe('filterRecipes', () => {
  it('returns everything without a filter', () => {
    expect(filterRecipes(entries, NO_FILTER, catalog)).toEqual(entries);
  });

  it('searches names without caring about diacritics', () => {
    expect(filterRecipes(entries, { ...NO_FILTER, query: 'losos' }, catalog)).toEqual([baked]);
  });

  it('also searches ingredient names', () => {
    expect(filterRecipes(entries, { ...NO_FILTER, query: 'ciecierz' }, catalog)).toEqual([curry]);
  });

  it('ignores blank space around the query', () => {
    expect(filterRecipes(entries, { ...NO_FILTER, query: '  owsian ' }, catalog)).toEqual([
      porridge,
    ]);
  });

  it('filters by meal type', () => {
    expect(filterRecipes(entries, { ...NO_FILTER, mealType: 'dinner' }, catalog)).toEqual([curry]);
  });

  it('filters by diet, including stricter ones that also fit', () => {
    const vegetarian = filterRecipes(entries, { ...NO_FILTER, diet: 'vegetarian' }, catalog);
    const vegan = filterRecipes(entries, { ...NO_FILTER, diet: 'vegan' }, catalog);

    expect(vegetarian).toEqual([porridge, curry]);
    expect(vegan).toEqual([curry]);
  });

  it('can show favorites only', () => {
    expect(filterRecipes(entries, { ...NO_FILTER, favoritesOnly: true }, catalog)).toEqual([
      porridge,
    ]);
  });

  it('finds recipes that contain an ingredient the user has', () => {
    expect(filterRecipes(entries, { ...NO_FILTER, ingredientIds: ['salmon'] }, catalog)).toEqual([
      baked,
    ]);
  });

  it('needs every ingredient the user has, not just one of them', () => {
    const both = filterRecipes(entries, { ...NO_FILTER, ingredientIds: ['oats', 'milk'] }, catalog);
    const oneMissing = filterRecipes(
      entries,
      { ...NO_FILTER, ingredientIds: ['oats', 'salmon'] },
      catalog,
    );

    expect(both).toEqual([porridge]);
    expect(oneMissing).toEqual([]);
  });

  it('combines the ingredients with the other filters', () => {
    const filter = { ...NO_FILTER, ingredientIds: ['chickpeas'], mealType: 'dinner' as const };

    expect(filterRecipes(entries, filter, catalog)).toEqual([curry]);
    expect(filterRecipes(entries, { ...filter, mealType: 'lunch' }, catalog)).toEqual([]);
  });

  it('combines all conditions', () => {
    const filter = {
      query: 'mleko',
      mealType: 'breakfast' as const,
      diet: 'vegetarian' as const,
      favoritesOnly: true,
      ingredientIds: ['milk'],
    };

    expect(filterRecipes(entries, filter, catalog)).toEqual([porridge]);
    expect(filterRecipes(entries, { ...filter, mealType: 'lunch' }, catalog)).toEqual([]);
  });
});
