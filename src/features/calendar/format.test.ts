import { describe, expect, it } from 'vitest';
import { formatServings, roundGrams } from './format';

describe('formatServings', () => {
  it.each([
    [1, '1 porcja'],
    [2, '2 porcje'],
    [4, '4 porcje'],
    [5, '5 porcji'],
    [12, '12 porcji'],
    [22, '22 porcje'],
    [0.25, '0,25 porcji'],
    [1.5, '1,5 porcji'],
    [2.95, '2,95 porcji'],
  ])('writes %f as "%s"', (servings, expected) => {
    expect(formatServings(servings)).toBe(expected);
  });

  it('ignores floating-point noise', () => {
    expect(formatServings(0.1 + 0.2)).toBe('0,3 porcji');
  });
});

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
