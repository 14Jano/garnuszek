import { addDays, daysBetween } from '../plan/dates';
import type { DateKey } from '../plan/dates';
import type { SeriesPoint } from './measurement';

export interface ProgressSummary {
  start: SeriesPoint;
  latest: SeriesPoint;
  /** Latest minus start; negative when the value went down. */
  change: number;
}

/** Where a series started and where it is now, or nothing when it has no readings. */
export function summarizeSeries(points: readonly SeriesPoint[]): ProgressSummary | undefined {
  const start = points[0];
  const latest = points.at(-1);
  if (!start || !latest) return undefined;

  return { start, latest, change: latest.value - start.value };
}

export interface TargetProgress {
  /** How far the value has moved towards the target since the start. */
  achieved: number;
  /** How far is left to the target. */
  remaining: number;
  reached: boolean;
}

/**
 * How far along the way to a target the person is. The direction (losing or
 * gaining) follows from where they started, so going the wrong way counts as no
 * progress rather than negative progress.
 */
export function targetProgress(start: number, latest: number, target: number): TargetProgress {
  const direction = Math.sign(target - start);

  return {
    achieved: Math.max(0, (latest - start) * direction),
    remaining: Math.max(0, (target - latest) * direction),
    reached: direction === 0 || (latest - target) * direction >= 0,
  };
}

/** Only the last weeks count, because a plan from months ago says little about the pace now. */
export const FORECAST_WINDOW_DAYS = 56;

/** A trend needs readings that are at least this many days apart. */
export const MIN_FORECAST_SPAN_DAYS = 7;

/** Slower than this per week is treated as standing still. */
export const MIN_WEEKLY_CHANGE = 0.05;

/** A date further away than this is not a forecast anyone can use. */
export const MAX_FORECAST_DAYS = 730;

export type Forecast =
  | { status: 'reached' }
  | { status: 'projected'; date: DateKey; changePerWeek: number }
  /** The pace is so slow that the target is more than two years away. */
  | { status: 'too-far'; changePerWeek: number }
  /** The recent trend stands still or moves away from the target. */
  | { status: 'not-approaching'; changePerWeek: number }
  | { status: 'not-enough-data' };

/**
 * When the target will be reached if the recent pace continues. The pace is the
 * straight line that fits the readings of the last weeks best, so one unusual
 * day does not swing the answer.
 */
export function forecastTarget(points: readonly SeriesPoint[], target: number): Forecast {
  const first = points[0];
  const latest = points.at(-1);
  if (!first || !latest) return { status: 'not-enough-data' };

  if (targetProgress(first.value, latest.value, target).reached) return { status: 'reached' };
  const direction = Math.sign(target - first.value);

  const recent = points.filter(
    (point) => daysBetween(point.date, latest.date) <= FORECAST_WINDOW_DAYS,
  );
  const oldest = recent[0];
  if (!oldest || daysBetween(oldest.date, latest.date) < MIN_FORECAST_SPAN_DAYS) {
    return { status: 'not-enough-data' };
  }

  const { slopePerDay, fittedLatest } = linearTrend(recent);
  const changePerWeek = slopePerDay * 7;

  if (slopePerDay * direction <= 0 || Math.abs(changePerWeek) < MIN_WEEKLY_CHANGE) {
    return { status: 'not-approaching', changePerWeek };
  }

  const daysNeeded = Math.max(0, (target - fittedLatest) / slopePerDay);
  if (daysNeeded > MAX_FORECAST_DAYS) return { status: 'too-far', changePerWeek };

  return { status: 'projected', date: addDays(latest.date, Math.ceil(daysNeeded)), changePerWeek };
}

/** Least-squares line through the readings, as change per day and the value it gives for the last day. */
function linearTrend(points: readonly SeriesPoint[]): {
  slopePerDay: number;
  fittedLatest: number;
} {
  const origin = points[0]?.date ?? '';
  const xs = points.map((point) => daysBetween(origin, point.date));
  const ys = points.map((point) => point.value);

  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;

  let covariance = 0;
  let variance = 0;
  xs.forEach((x, index) => {
    covariance += (x - meanX) * ((ys[index] ?? 0) - meanY);
    variance += (x - meanX) ** 2;
  });

  // Every reading has its own day, so with two or more of them the variance is never zero.
  const slopePerDay = covariance / variance;
  const lastX = xs.at(-1) ?? 0;

  return { slopePerDay, fittedLatest: meanY + slopePerDay * (lastX - meanX) };
}
