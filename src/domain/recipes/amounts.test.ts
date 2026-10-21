import { describe, expect, it } from 'vitest';
import { roundGrams } from './amounts';

describe('roundGrams', () => {
  it.each([
    [850, 850],
    [852, 850],
    [853, 855],
    [12, 10],
    [3, 5],
    [0.4, 5],
  ])('rounds %f g to %i g', (grams, expected) => {
    expect(roundGrams(grams)).toBe(expected);
  });
});
