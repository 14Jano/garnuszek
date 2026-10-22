import { formatChange, formatDecimal } from '../../format/numbers';
import type { MeasurementKind } from '../../domain/progress/measurement';

interface KindLabel {
  /** The name of what is measured, as in a choice list. */
  name: string;
  unit: string;
}

export const KIND_LABELS: Record<MeasurementKind, KindLabel> = {
  weight: { name: 'Waga', unit: 'kg' },
  waist: { name: 'Talia', unit: 'cm' },
  hips: { name: 'Biodra', unit: 'cm' },
  chest: { name: 'Klatka piersiowa', unit: 'cm' },
};

/** A value with its unit and a decimal comma: 68,5 kg. */
export function formatValue(value: number, kind: MeasurementKind): string {
  return `${formatDecimal(value)} ${KIND_LABELS[kind].unit}`;
}

/** A signed difference with its unit: −1,5 kg. */
export function formatDifference(value: number, kind: MeasurementKind): string {
  return `${formatChange(value)} ${KIND_LABELS[kind].unit}`;
}
