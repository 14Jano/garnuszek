import type { Suggestion } from '../domain/plan/autoPlan';
import { resizeBatch } from '../domain/plan/batches';
import type { DateKey } from '../domain/plan/dates';
import { isLeftover, planEntryKey } from '../domain/plan/planEntry';
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
 *
 * A dish cooked for several days is swapped on all of those days at once. Its
 * leftover days cannot be swapped on their own.
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

    if (existing && isLeftover(existing)) {
      throw new Error(`${date} ${mealType} is a leftover; change the dish on the day it is cooked`);
    }
    if (existing?.batchId !== undefined) {
      await db.planEntries.where('batchId').equals(existing.batchId).modify({ recipeId });
      return;
    }

    await db.planEntries.put({
      key,
      date,
      mealType,
      recipeId,
      memberIds: [...(existing?.memberIds ?? defaultMemberIds)],
    });
  });
}

/**
 * Saves suggested dishes into meal slots for the given people, all in one go. A slot
 * that has been filled in the meantime keeps what is in it, so nothing the user planned
 * is ever overwritten. Returns how many dishes were saved.
 */
export async function applySuggestions(
  suggestions: readonly Suggestion[],
  memberIds: readonly string[],
): Promise<number> {
  return db.transaction('rw', db.planEntries, async () => {
    let saved = 0;

    for (const { date, mealType, recipeId } of suggestions) {
      const key = planEntryKey(date, mealType);
      if (await db.planEntries.get(key)) continue;

      await db.planEntries.add({ key, date, mealType, recipeId, memberIds: [...memberIds] });
      saved += 1;
    }
    return saved;
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

/**
 * Removes a meal. A dish cooked for several days is removed from all of them;
 * its leftover days cannot be removed on their own.
 */
export async function removePlanEntry(date: DateKey, mealType: MealType): Promise<void> {
  await db.transaction('rw', db.planEntries, async () => {
    const existing = await db.planEntries.get(planEntryKey(date, mealType));
    if (!existing) return;

    if (isLeftover(existing)) {
      throw new Error(`${date} ${mealType} is a leftover; remove the dish on the day it is cooked`);
    }
    if (existing.batchId !== undefined) {
      await db.planEntries.where('batchId').equals(existing.batchId).delete();
    } else {
      await db.planEntries.delete(existing.key);
    }
  });
}

/**
 * Makes the dish cooked on `date` last for `days` days. Dishes planned for the
 * extra days move later, and going back to fewer days brings them forward again.
 */
export async function setBatchDays(date: DateKey, mealType: MealType, days: number): Promise<void> {
  await db.transaction('rw', db.planEntries, async () => {
    const slot = await db.planEntries
      .where('date')
      .aboveOrEqual(date)
      .filter((record) => record.mealType === mealType)
      .toArray();

    const change = resizeBatch(slot.map(toEntry), date, mealType, days, () => crypto.randomUUID());

    for (const removed of change.remove) {
      await db.planEntries.delete(planEntryKey(removed.date, removed.mealType));
    }
    await db.planEntries.bulkPut(change.put.map(toRecord));
  });
}

function toRecord(entry: PlanEntry): PlanEntryRecord {
  return {
    ...entry,
    memberIds: [...entry.memberIds],
    key: planEntryKey(entry.date, entry.mealType),
  };
}

// Copy the fields explicitly so storage-only data never leaks into the app.
function toEntry(record: PlanEntryRecord): PlanEntry {
  return {
    date: record.date,
    mealType: record.mealType,
    recipeId: record.recipeId,
    memberIds: [...record.memberIds],
    ...(record.batchId === undefined ? {} : { batchId: record.batchId }),
    ...(record.cookedOn === undefined ? {} : { cookedOn: record.cookedOn }),
  };
}
