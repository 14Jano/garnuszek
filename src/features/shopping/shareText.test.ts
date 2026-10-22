import { describe, expect, it } from 'vitest';
import type { ShoppingSection } from '../../domain/plan/shoppingList';
import { formatShoppingText } from './shareText';

const sections: ShoppingSection[] = [
  {
    category: 'vegetables',
    items: [
      { ingredientId: 'onion', name: 'Cebula', grams: 200, amount: { kind: 'weight', grams: 200 } },
      {
        ingredientId: 'carrot',
        name: 'Marchew',
        grams: 1250,
        amount: { kind: 'weight', grams: 1250 },
      },
    ],
  },
  {
    category: 'dairy',
    items: [
      {
        ingredientId: 'milk',
        name: 'Mleko 2%',
        grams: 1550,
        amount: { kind: 'volume', milliliters: 1500 },
      },
    ],
  },
];

describe('formatShoppingText', () => {
  it('lists the items by group with their amounts', () => {
    expect(formatShoppingText('19–25 października', sections, new Set())).toBe(
      [
        'Lista zakupów, 19–25 października',
        '',
        'Warzywa',
        '- Cebula: 200 g',
        '- Marchew: 1,25 kg',
        '',
        'Nabiał',
        '- Mleko 2%: 1,5 l',
      ].join('\n'),
    );
  });

  it('counts items in units, and says how much a pack has to hold', () => {
    const text = formatShoppingText(
      '19–25 października',
      [
        {
          category: 'eggs',
          items: [
            {
              ingredientId: 'egg',
              name: 'Jajko',
              grams: 330,
              amount: { kind: 'units', count: 6, unit: 'piece', neededGrams: 330 },
            },
          ],
        },
        {
          category: 'legumes',
          items: [
            {
              ingredientId: 'chickpeas',
              name: 'Ciecierzyca',
              grams: 400,
              amount: { kind: 'units', count: 2, unit: 'can', neededGrams: 400 },
            },
          ],
        },
      ],
      new Set(),
    );

    expect(text).toContain('- Jajko: 6 szt.');
    expect(text).toContain('- Ciecierzyca: 2 puszki (potrzeba ok. 400 g)');
  });

  it('leaves out what is already ticked off, and groups that become empty', () => {
    const text = formatShoppingText('19–25 października', sections, new Set(['onion', 'milk']));

    expect(text).toBe(
      ['Lista zakupów, 19–25 października', '', 'Warzywa', '- Marchew: 1,25 kg'].join('\n'),
    );
  });

  it('says so when everything is bought', () => {
    const text = formatShoppingText(
      '19–25 października',
      sections,
      new Set(['onion', 'carrot', 'milk']),
    );

    expect(text).toBe(['Lista zakupów, 19–25 października', '', 'Wszystko kupione.'].join('\n'));
  });
});
