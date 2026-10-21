/** Age with the right Polish plural: 1 rok, 2 lata, 5 lat, 22 lata. */
export function formatAge(age: number): string {
  if (age === 1) return '1 rok';

  const lastDigit = age % 10;
  const lastTwoDigits = age % 100;
  const isFew = lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14);

  return `${age} ${isFew ? 'lata' : 'lat'}`;
}
