import { describe, expect, it } from 'vitest';
import { describeConflicts, describeRestrictions } from './conflictText';

describe('describeConflicts', () => {
  it('names a diet', () => {
    expect(describeConflicts([{ kind: 'diet', diet: 'vegetarian' }])).toBe('dieta wegetariańska');
  });

  it('names an allergen together with the ingredients that bring it', () => {
    expect(
      describeConflicts([
        { kind: 'allergen', allergen: 'milk', ingredientIds: ['butter', 'cheese'] },
      ]),
    ).toBe('mleko i nabiał (masło, ser żółty)');
  });

  it('names an avoided ingredient in lower case', () => {
    expect(describeConflicts([{ kind: 'ingredient', ingredientId: 'onion' }])).toBe('cebula');
  });

  it('joins several reasons', () => {
    expect(
      describeConflicts([
        { kind: 'diet', diet: 'vegan' },
        { kind: 'allergen', allergen: 'gluten', ingredientIds: ['pasta'] },
        { kind: 'ingredient', ingredientId: 'garlic' },
      ]),
    ).toBe('dieta wegańska, gluten (makaron pszenny), czosnek');
  });

  it('leaves out the note in brackets of an ingredient name', () => {
    expect(describeConflicts([{ kind: 'ingredient', ingredientId: 'chicken-breast' }])).toBe(
      'pierś z kurczaka',
    );
  });
});

describe('describeRestrictions', () => {
  it('lists the diet, the allergens and the ingredients', () => {
    expect(
      describeRestrictions({
        diet: 'pescatarian',
        allergens: ['gluten', 'tree-nuts'],
        avoidedIngredientIds: ['onion'],
      }),
    ).toBe('dieta peskatariańska, gluten, orzechy, cebula');
  });

  it('is empty when there is nothing to avoid', () => {
    expect(describeRestrictions({ allergens: [], avoidedIngredientIds: [] })).toBe('');
  });
});
