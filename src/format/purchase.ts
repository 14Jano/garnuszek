import type { PurchaseUnit } from '../domain/recipes/ingredient';
import type { BuyingAmount } from '../domain/plan/shoppingList';
import { formatGrams } from './amounts';
import { pluralPl } from './plural';
import type { PolishForms } from './plural';

const UNIT_NAMES: Record<PurchaseUnit, PolishForms> = {
  // An abbreviation, so it does not change with the number.
  piece: ['szt.', 'szt.', 'szt.'],
  head: ['główka', 'główki', 'główek'],
  can: ['puszka', 'puszki', 'puszek'],
  pack: ['opakowanie', 'opakowania', 'opakowań'],
  loaf: ['bochenek', 'bochenki', 'bochenków'],
};

/**
 * Units whose size varies from shop to shop. They are shown with the weight that is
 * really needed, so the shopper can judge the pack in their hand.
 */
const SHOWN_WITH_WEIGHT: ReadonlySet<PurchaseUnit> = new Set(['can', 'pack', 'loaf']);

export interface AmountText {
  /** What to buy: "6 szt.", "2 puszki", "1,5 l", "650 g". */
  text: string;
  /** What is needed in grams, for a pack whose size varies. */
  detail?: string;
}

export function formatBuyingAmount(amount: BuyingAmount): AmountText {
  switch (amount.kind) {
    case 'weight':
      return { text: formatGrams(amount.grams) };
    case 'volume':
      return { text: formatMilliliters(amount.milliliters) };
    case 'units': {
      const text = `${amount.count} ${pluralPl(amount.count, UNIT_NAMES[amount.unit])}`;
      return SHOWN_WITH_WEIGHT.has(amount.unit)
        ? { text, detail: `potrzeba ok. ${formatGrams(amount.neededGrams)}` }
        : { text };
    }
  }
}

/** "250 ml", or "1,5 l" from a litre upwards. */
function formatMilliliters(milliliters: number): string {
  if (milliliters < 1000) return `${milliliters} ml`;

  const liters = String(Number((milliliters / 1000).toFixed(2))).replace('.', ',');
  return `${liters} l`;
}
