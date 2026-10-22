/** The three forms of a Polish noun: for 1 (puszka), for 2–4 (puszki) and for 5 and more (puszek). */
export type PolishForms = readonly [one: string, few: string, many: string];

/** Picks the form of a noun that goes with a whole number: 1 puszka, 3 puszki, 5 puszek, 22 puszki. */
export function pluralPl(count: number, [one, few, many]: PolishForms): string {
  if (count === 1) return one;

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  const isFew = lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14);
  return isFew ? few : many;
}
