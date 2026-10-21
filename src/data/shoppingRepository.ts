import { startOfWeek } from '../domain/plan/dates';
import type { DateKey } from '../domain/plan/dates';
import { db } from './db';

// Every function takes any day of the week; the list belongs to that week's Monday.

/** Ids of the ingredients already ticked off on the week's shopping list. */
export async function listCheckedIngredients(week: DateKey): Promise<Set<string>> {
  const records = await db.shoppingChecks.where('weekStart').equals(startOfWeek(week)).toArray();
  return new Set(records.map((record) => record.ingredientId));
}

export async function setIngredientChecked(
  week: DateKey,
  ingredientId: string,
  checked: boolean,
): Promise<void> {
  const weekStart = startOfWeek(week);
  const key = `${weekStart}_${ingredientId}`;

  if (checked) {
    await db.shoppingChecks.put({ key, weekStart, ingredientId });
  } else {
    await db.shoppingChecks.delete(key);
  }
}

/** Unticks everything on the week's list. */
export async function clearCheckedIngredients(week: DateKey): Promise<void> {
  await db.shoppingChecks.where('weekStart').equals(startOfWeek(week)).delete();
}
