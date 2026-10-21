import { roundGrams } from '../domain/recipes/amounts';

/** "250 g", or "1,2 kg" from a kilogram upwards. The weight is rounded for the kitchen first. */
export function formatGrams(grams: number): string {
  const rounded = roundGrams(grams);
  if (rounded < 1000) return `${rounded} g`;

  const kilograms = String(Number((rounded / 1000).toFixed(2))).replace('.', ',');
  return `${kilograms} kg`;
}
