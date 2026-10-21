import { describe, expect, it } from 'vitest';
import type { ShoppingSection } from '../../domain/plan/shoppingList';
import { formatShoppingText } from './shareText';

const sections: ShoppingSection[] = [
  {
    category: 'vegetables',
    items: [
      { ingredientId: 'onion', name: 'Cebula', grams: 200 },
      { ingredientId: 'carrot', name: 'Marchew', grams: 1250 },
    ],
  },
  { category: 'dairy', items: [{ ingredientId: 'milk', name: 'Mleko 2%', grams: 600 }] },
];

describe('formatShoppingText', () => {
  it('lists the items by group with their weights', () => {
    expect(formatShoppingText('19–25 października', sections, new Set())).toBe(
      [
        'Lista zakupów, 19–25 października',
        '',
        'Warzywa',
        '- Cebula: 200 g',
        '- Marchew: 1,25 kg',
        '',
        'Nabiał',
        '- Mleko 2%: 600 g',
      ].join('\n'),
    );
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
