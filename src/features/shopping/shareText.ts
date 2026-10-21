import { CATEGORY_LABELS } from '../../content/labels';
import type { ShoppingSection } from '../../domain/plan/shoppingList';
import { formatGrams } from '../../format/amounts';

/**
 * Plain text of the shopping list for sending to someone, e.g. over WhatsApp.
 * It lists only what is still to be bought, so ticked-off items are left out.
 */
export function formatShoppingText(
  weekLabel: string,
  sections: readonly ShoppingSection[],
  checked: ReadonlySet<string>,
): string {
  const lines = [`Lista zakupów, ${weekLabel}`];
  let remaining = 0;

  for (const { category, items } of sections) {
    const toBuy = items.filter((item) => !checked.has(item.ingredientId));
    if (toBuy.length === 0) continue;

    remaining += toBuy.length;
    lines.push(
      '',
      CATEGORY_LABELS[category],
      ...toBuy.map((item) => `- ${item.name}: ${formatGrams(item.grams)}`),
    );
  }

  if (remaining === 0) {
    lines.push('', 'Wszystko kupione.');
  }
  return lines.join('\n');
}
