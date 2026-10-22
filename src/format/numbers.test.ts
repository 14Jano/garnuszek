import { describe, expect, it } from 'vitest';
import { formatChange, formatDecimal } from './numbers';

describe('formatDecimal', () => {
  it.each([
    [72, '72'],
    [72.5, '72,5'],
    [72.04, '72'],
    [72.06, '72,1'],
    [0.1 + 0.2, '0,3'],
    [-3.5, '-3,5'],
  ])('writes %f as "%s"', (value, expected) => {
    expect(formatDecimal(value)).toBe(expected);
  });

  it('can show more decimals', () => {
    expect(formatDecimal(1.25, 2)).toBe('1,25');
    expect(formatDecimal(1.2, 2)).toBe('1,2');
  });
});

describe('formatChange', () => {
  it('puts a sign in front of a change', () => {
    expect(formatChange(1.5)).toBe('+1,5');
    expect(formatChange(-0.5)).toBe('−0,5');
  });

  it('shows no sign for no change, including a change that rounds away', () => {
    expect(formatChange(0)).toBe('0');
    expect(formatChange(0.04)).toBe('0');
    expect(formatChange(-0.04)).toBe('0');
  });
});
