import type { Member } from '../household/member';
import type { DateKey } from './dates';

/** How many kilocalories a person sets aside for snacks on a given day. */
export type SnackAllowance = (date: DateKey, member: Member) => number;

/** The snack amount of one particular day, replacing the person's usual one. */
export interface SnackOverride {
  date: DateKey;
  memberId: string;
  kcal: number;
}

/** Every day uses the amount from the person's profile. */
export const USUAL_SNACKS: SnackAllowance = (_date, member) => member.snackKcal;

/** The usual amounts, except on days that have their own. */
export function snackAllowance(overrides: readonly SnackOverride[]): SnackAllowance {
  const byDayAndMember = new Map(
    overrides.map(({ date, memberId, kcal }) => [`${date}_${memberId}`, kcal]),
  );

  return (date, member) => byDayAndMember.get(`${date}_${member.id}`) ?? member.snackKcal;
}

/**
 * Snacks never take more than this share of the day. Past that point the meals
 * would stop being meals, so the excess is ignored.
 */
export const MAX_SNACK_SHARE = 0.5;

/** The snack allowance that is actually applied, after the upper limit. */
export function effectiveSnackKcal(dailyKcal: number, snackKcal: number): number {
  return Math.min(Math.max(snackKcal, 0), dailyKcal * MAX_SNACK_SHARE);
}

/** What is left of the daily target for meals once snacks are set aside. */
export function mealBudgetKcal(dailyKcal: number, snackKcal: number): number {
  return dailyKcal - effectiveSnackKcal(dailyKcal, snackKcal);
}
