import { describe, expect, it } from 'vitest';
import type { BuyingAmount } from '../domain/plan/shoppingList';
import { formatBuyingAmount } from './purchase';

describe('formatBuyingAmount', () => {
  it('writes a weight in grams, and in kilograms from a kilogram', () => {
    expect(formatBuyingAmount({ kind: 'weight', grams: 650 })).toEqual({ text: '650 g' });
    expect(formatBuyingAmount({ kind: 'weight', grams: 1250 })).toEqual({ text: '1,25 kg' });
  });

  it('writes a volume in millilitres, and in litres from a litre', () => {
    expect(formatBuyingAmount({ kind: 'volume', milliliters: 250 })).toEqual({ text: '250 ml' });
    expect(formatBuyingAmount({ kind: 'volume', milliliters: 1000 })).toEqual({ text: '1 l' });
    expect(formatBuyingAmount({ kind: 'volume', milliliters: 1500 })).toEqual({ text: '1,5 l' });
    expect(formatBuyingAmount({ kind: 'volume', milliliters: 2350 })).toEqual({ text: '2,35 l' });
  });

  it('counts items with an abbreviation that does not change', () => {
    const eggs = (count: number): BuyingAmount => ({
      kind: 'units',
      count,
      unit: 'piece',
      neededGrams: count * 55,
    });

    expect(formatBuyingAmount(eggs(1))).toEqual({ text: '1 szt.' });
    expect(formatBuyingAmount(eggs(6))).toEqual({ text: '6 szt.' });
  });

  it('counts heads of garlic in Polish', () => {
    const heads = (count: number): BuyingAmount => ({
      kind: 'units',
      count,
      unit: 'head',
      neededGrams: 30,
    });

    expect(formatBuyingAmount(heads(1)).text).toBe('1 główka');
    expect(formatBuyingAmount(heads(2)).text).toBe('2 główki');
    expect(formatBuyingAmount(heads(5)).text).toBe('5 główek');
  });

  it.each([
    ['can', 1, '1 puszka'],
    ['can', 3, '3 puszki'],
    ['can', 5, '5 puszek'],
    ['pack', 1, '1 opakowanie'],
    ['pack', 2, '2 opakowania'],
    ['pack', 6, '6 opakowań'],
    ['loaf', 1, '1 bochenek'],
    ['loaf', 2, '2 bochenki'],
    ['loaf', 5, '5 bochenków'],
  ] as const)('says how many %s units: %i is "%s"', (unit, count, text) => {
    expect(formatBuyingAmount({ kind: 'units', count, unit, neededGrams: 100 }).text).toBe(text);
  });

  it('adds the weight that is needed to cans, packs and loaves, whose size varies', () => {
    expect(formatBuyingAmount({ kind: 'units', count: 2, unit: 'can', neededGrams: 400 })).toEqual({
      text: '2 puszki',
      detail: 'potrzeba ok. 400 g',
    });
    expect(
      formatBuyingAmount({ kind: 'units', count: 1, unit: 'pack', neededGrams: 1100 }),
    ).toEqual({ text: '1 opakowanie', detail: 'potrzeba ok. 1,1 kg' });
  });

  it('does not add a weight to items that are simply counted', () => {
    expect(
      formatBuyingAmount({ kind: 'units', count: 3, unit: 'piece', neededGrams: 330 }).detail,
    ).toBeUndefined();
    expect(
      formatBuyingAmount({ kind: 'units', count: 2, unit: 'head', neededGrams: 70 }).detail,
    ).toBeUndefined();
  });
});
