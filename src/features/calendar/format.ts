/** Servings with the right Polish form: 1 porcja, 2 porcje, 5 porcji, 1,5 porcji. */
export function formatServings(servings: number): string {
  const text = String(Number(servings.toFixed(2))).replace('.', ',');
  if (!Number.isInteger(servings)) return `${text} porcji`;

  const lastDigit = servings % 10;
  const lastTwoDigits = servings % 100;
  if (servings === 1) return `${text} porcja`;
  const isFew = lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14);
  return `${text} ${isFew ? 'porcje' : 'porcji'}`;
}

/** Kitchen-friendly weight: the nearest 5 g, and never less than 5 g. */
export function roundGrams(grams: number): number {
  return Math.max(5, Math.round(grams / 5) * 5);
}
