import { isDateKey } from '../plan/dates';
import type { DateKey } from '../plan/dates';
import { checkNumber } from '../validation';
import type { FieldProblem, NumberRange } from '../validation';

/** What can be measured: body weight in kilograms, circumferences in centimetres. */
export type MeasurementKind = 'weight' | 'waist' | 'hips' | 'chest';

export const MEASUREMENT_KINDS: readonly MeasurementKind[] = ['weight', 'waist', 'hips', 'chest'];

export const MEASUREMENT_LIMITS: Record<MeasurementKind, NumberRange> = {
  weight: { min: 10, max: 300 },
  waist: { min: 20, max: 250 },
  hips: { min: 20, max: 250 },
  chest: { min: 20, max: 250 },
};

/** One reading. A person has at most one per kind and day; measuring again replaces it. */
export interface Measurement {
  memberId: string;
  kind: MeasurementKind;
  date: DateKey;
  value: number;
}

export function measurementKey({
  memberId,
  kind,
  date,
}: Pick<Measurement, 'memberId' | 'kind' | 'date'>): string {
  return `${memberId}_${kind}_${date}`;
}

export interface MeasurementDraft {
  kind: MeasurementKind;
  /** Empty text stands for a missing date. */
  date: string;
  /** NaN stands for an empty or unreadable input. */
  value: number;
}

export type MeasurementErrors = Partial<Record<'date' | 'value', FieldProblem>>;

/** `today` is the latest day a measurement can be dated, because it cannot be taken in the future. */
export function validateMeasurement(draft: MeasurementDraft, today: DateKey): MeasurementErrors {
  const errors: MeasurementErrors = {};

  if (draft.date === '') {
    errors.date = 'required';
  } else if (!isDateKey(draft.date) || draft.date > today) {
    errors.date = 'invalid';
  }

  const value = checkNumber(draft.value, MEASUREMENT_LIMITS[draft.kind]);
  if (value) errors.value = value;

  return errors;
}

/** One value on one day. */
export interface SeriesPoint {
  date: DateKey;
  value: number;
}

/** The readings of one kind in the order they were taken, oldest first. */
export function seriesOf(
  measurements: readonly Measurement[],
  kind: MeasurementKind,
): SeriesPoint[] {
  return measurements
    .filter((measurement) => measurement.kind === kind)
    .map(({ date, value }) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
