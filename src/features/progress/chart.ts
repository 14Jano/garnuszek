import { daysBetween } from '../../domain/plan/dates';
import type { DateKey } from '../../domain/plan/dates';

export interface ValueAxis {
  min: number;
  max: number;
  /** Round values from `min` to `max`, evenly spaced. */
  ticks: number[];
}

/** The nearest step of 1, 2 or 5 times a power of ten that is not smaller than `rough`. */
export function niceStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

/**
 * An axis that shows every value with some room around it and starts and ends on
 * round numbers. Values that lie close together still get at least `minSpan` of
 * room, so a tiny wobble does not look like a dramatic swing.
 */
export function valueAxis(values: readonly number[], minSpan: number, tickCount = 4): ValueAxis {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const middle = (low + high) / 2;
  const padded = Math.max(high - low, minSpan) * 1.2;

  const step = niceStep(padded / tickCount);
  const min = Math.floor((middle - padded / 2) / step + 1e-9) * step;
  const max = Math.ceil((middle + padded / 2) / step - 1e-9) * step;

  const ticks: number[] = [];
  for (let index = 0; min + index * step <= max + step / 2; index += 1) {
    ticks.push(roundAway(min + index * step));
  }

  return { min: roundAway(min), max: roundAway(max), ticks };
}

/** Where a day falls between the first and last day, from 0 (first) to 1 (last). */
export function timeFraction(date: DateKey, first: DateKey, last: DateKey): number {
  if (first === last) return 0.5;
  return daysBetween(first, date) / daysBetween(first, last);
}

/** Drops the noise of floating point arithmetic, e.g. 0.1 + 0.2. */
function roundAway(value: number): number {
  return Number(value.toFixed(6));
}
