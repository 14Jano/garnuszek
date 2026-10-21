import type { DateKey } from '../domain/plan/dates';
import { planEntryKey } from '../domain/plan/planEntry';
import type { PlanEntry } from '../domain/plan/planEntry';
import { MEAL_TYPES } from '../domain/recipes/recipe';
import type { MealType } from '../domain/recipes/recipe';
import { db } from './db';
import type { PlanEntryRecord } from './db';

/** Planned meals from `from` to `to`, both days included, in calendar order. */
export async function listPlanEntries(from: DateKey, to: DateKey): Promise<PlanEntry[]> {
  const records = await db.planEntries.where('date').between(from, to, true, true).toArray();

  return records.map(toEntry).sort(
    (a, b) =>
      // Date keys sort chronologically as plain text.
      a.date.localeCompare(b.date) ||
      MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType),
  );
}

/**
 * Puts a recipe into a meal slot. A slot that already holds a meal keeps the
 * people who eat it, so swapping a dish does not change who is at the table.
 * An empty slot starts with `defaultMemberIds`.
 */
export async function assignRecipe(
  date: DateKey,
  mealType: MealType,
  recipeId: string,
  defaultMemberIds: readonly string[],
): Promise<void> {
  const key = planEntryKey(date, mealType);

  await db.transaction('rw', db.planEntries, async () => {
    const existing = await db.planEntries.get(key);
    await db.planEntries.put({
      key,
      date,
      mealType,
      recipeId,
      memberIds: [...(existing?.memberIds ?? defaultMemberIds)],
    });
  });
}

/** Changes who eats an already planned meal. */
export async function setEaters(
  date: DateKey,
  mealType: MealType,
  memberIds: readonly string[],
): Promise<void> {
  const updatedCount = await db.planEntries.update(planEntryKey(date, mealType), {
    memberIds: [...memberIds],
  });
  if (updatedCount === 0) {
    throw new Error(`Cannot change eaters: nothing planned for ${date} ${mealType}`);
  }
}

export async function removePlanEntry(date: DateKey, mealType: MealType): Promise<void> {
  await db.planEntries.delete(planEntryKey(date, mealType));
}

// Copy the fields explicitly so storage-only data never leaks into the app.
function toEntry(record: PlanEntryRecord): PlanEntry {
  return {
    date: record.date,
    mealType: record.mealType,
    recipeId: record.recipeId,
    memberIds: [...record.memberIds],
  };
}
