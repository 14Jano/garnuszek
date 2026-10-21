import { describe, expect, it } from 'vitest';
import { formatGrams } from './amounts';

describe('formatGrams', () => {
  it.each([
    [3, '5 g'],
    [435, '435 g'],
    [997, '995 g'],
    [1000, '1 kg'],
    [1200, '1,2 kg'],
    [1250, '1,25 kg'],
    [3000, '3 kg'],
  ])('writes %f g as "%s"', (grams, expected) => {
    expect(formatGrams(grams)).toBe(expected);
  });
});
