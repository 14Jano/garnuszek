import { describe, expect, it } from 'vitest';
import { pluralPl } from './plural';

const CAN = ['puszka', 'puszki', 'puszek'] as const;

describe('pluralPl', () => {
  it.each([
    [1, 'puszka'],
    [2, 'puszki'],
    [3, 'puszki'],
    [4, 'puszki'],
    [5, 'puszek'],
    [9, 'puszek'],
    [10, 'puszek'],
    [11, 'puszek'],
    [12, 'puszek'],
    [13, 'puszek'],
    [14, 'puszek'],
    [15, 'puszek'],
    [20, 'puszek'],
    [21, 'puszek'],
    [22, 'puszki'],
    [24, 'puszki'],
    [25, 'puszek'],
    [112, 'puszek'],
    [122, 'puszki'],
  ])('says %i %s', (count, expected) => {
    expect(pluralPl(count, CAN)).toBe(expected);
  });
});
