/** A number with a decimal comma and no trailing zeros: 72,5 and 72. */
export function formatDecimal(value: number, maxFractionDigits = 1): string {
  return String(Number(value.toFixed(maxFractionDigits))).replace('.', ',');
}

/** A change with its sign: +1,5, −0,5 (a real minus sign) or 0. */
export function formatChange(value: number, maxFractionDigits = 1): string {
  const rounded = Number(value.toFixed(maxFractionDigits));
  if (rounded === 0) return '0';

  const digits = formatDecimal(Math.abs(rounded), maxFractionDigits);
  return rounded > 0 ? `+${digits}` : `−${digits}`;
}
