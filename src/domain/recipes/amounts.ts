/** Kitchen-friendly weight: the nearest 5 g, and never less than 5 g. */
export function roundGrams(grams: number): number {
  return Math.max(5, Math.round(grams / 5) * 5);
}
