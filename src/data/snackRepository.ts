import type { DateKey } from '../domain/plan/dates';
import type { SnackOverride } from '../domain/plan/snacks';
import { db } from './db';

/** Snack amounts set for particular days from `from` to `to`, both days included. */
export async function listSnackOverrides(from: DateKey, to: DateKey): Promise<SnackOverride[]> {
  const records = await db.snackOverrides.where('date').between(from, to, true, true).toArray();
  return records.map(({ date, memberId, kcal }) => ({ date, memberId, kcal }));
}

/**
 * Sets how many calories a person keeps for snacks on one day. Passing `null`
 * goes back to the amount from their profile.
 */
export async function setSnackOverride(
  date: DateKey,
  memberId: string,
  kcal: number | null,
): Promise<void> {
  const key = `${date}_${memberId}`;

  if (kcal === null) {
    await db.snackOverrides.delete(key);
  } else {
    await db.snackOverrides.put({ key, date, memberId, kcal });
  }
}
