import { describe, expect, it } from 'vitest';
import { NO_NUTRIENTS, addNutrients, scaleNutrients } from './nutrients';

const oats = { kcal: 380, proteinG: 13, fatG: 6.5, carbsG: 68 };

describe('addNutrients', () => {
  it('adds every field', () => {
    const milk = { kcal: 50, proteinG: 3.3, fatG: 2, carbsG: 4.8 };

    expect(addNutrients(oats, milk)).toEqual({
      kcal: 430,
      proteinG: 16.3,
      fatG: 8.5,
      carbsG: 72.8,
    });
  });

  it('treats NO_NUTRIENTS as the identity', () => {
    expect(addNutrients(oats, NO_NUTRIENTS)).toEqual(oats);
  });
});

describe('scaleNutrients', () => {
  it('multiplies every field by the factor', () => {
    expect(scaleNutrients(oats, 0.5)).toEqual({
      kcal: 190,
      proteinG: 6.5,
      fatG: 3.25,
      carbsG: 34,
    });
  });

  it('gives nothing for a factor of zero', () => {
    expect(scaleNutrients(oats, 0)).toEqual(NO_NUTRIENTS);
  });
});
