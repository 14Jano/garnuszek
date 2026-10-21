import { describe, expect, it } from 'vitest';
import { formatAge } from './format';

describe('formatAge', () => {
  it.each([
    [1, '1 rok'],
    [2, '2 lata'],
    [4, '4 lata'],
    [5, '5 lat'],
    [12, '12 lat'],
    [14, '14 lat'],
    [18, '18 lat'],
    [21, '21 lat'],
    [22, '22 lata'],
    [100, '100 lat'],
    [102, '102 lata'],
    [112, '112 lat'],
  ])('writes %i as "%s"', (age, expected) => {
    expect(formatAge(age)).toBe(expected);
  });
});
