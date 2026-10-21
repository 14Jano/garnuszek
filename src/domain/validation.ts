/**
 * `required` means the value is missing, `invalid` that it is out of range or
 * malformed. The UI turns these codes into messages.
 */
export type FieldProblem = 'required' | 'invalid';

export interface NumberRange {
  min: number;
  max: number;
}

/** NaN stands for an empty or unreadable input. */
export function checkNumber(
  value: number,
  { min, max }: NumberRange,
  { integer = false } = {},
): FieldProblem | undefined {
  if (Number.isNaN(value)) return 'required';
  if (!Number.isFinite(value) || value < min || value > max) return 'invalid';
  if (integer && !Number.isInteger(value)) return 'invalid';
  return undefined;
}
