import type { Member } from '../household/member';
import type { IngredientCatalog } from '../recipes/ingredient';
import type { MealType, Recipe, RecipeIngredient } from '../recipes/recipe';
import { addDays } from './dates';
import type { DateKey } from './dates';
import { isLeftover } from './planEntry';
import type { PlanEntry } from './planEntry';
import { mergeIngredients, planMeal } from './portions';
import { USUAL_SNACKS } from './snacks';
import type { SnackAllowance } from './snacks';

/** A dish cooked once can be eaten for at most this many days in a row. */
export const MAX_BATCH_DAYS = 4;

/** One meal slot of one day. */
export interface SlotRef {
  date: DateKey;
  mealType: MealType;
}

/** What has to be written to the plan to carry out a change. */
export interface BatchChange {
  /** Delete these first, so a moved entry never meets its own old place. */
  remove: SlotRef[];
  /** Then write these: new entries, and entries that were moved or changed. */
  put: PlanEntry[];
}

/**
 * Works out how to make the dish cooked on `date` last for `days` days.
 *
 * The extra days are filled with leftovers of the same dish. Dishes that were
 * already planned for those days in the same meal move later, one after the
 * other, so none of them is lost. Going back to fewer days removes the leftovers
 * and pulls those dishes forward again, but only if they follow the batch
 * without a gap, which means they were pushed by it in the first place.
 *
 * `entries` must contain the planned meals of this meal type from `date` on.
 * Entries of other meal types are ignored.
 */
export function resizeBatch(
  entries: readonly PlanEntry[],
  date: DateKey,
  mealType: MealType,
  days: number,
  createBatchId: () => string,
): BatchChange {
  if (!Number.isInteger(days) || days < 1 || days > MAX_BATCH_DAYS) {
    throw new RangeError(`A dish can be cooked for 1 to ${MAX_BATCH_DAYS} days, not ${days}`);
  }

  const slot = entries
    .filter((entry) => entry.mealType === mealType)
    .sort((a, b) => a.date.localeCompare(b.date));

  const cook = slot.find((entry) => entry.date === date);
  if (!cook) {
    throw new Error(`Nothing is planned for ${date} ${mealType}`);
  }
  if (isLeftover(cook)) {
    throw new Error(`${date} ${mealType} is a leftover; change it on the day it is cooked`);
  }

  const leftovers =
    cook.batchId === undefined
      ? []
      : slot.filter((entry) => entry.batchId === cook.batchId && isLeftover(entry));
  const currentDays = 1 + leftovers.length;

  if (days === currentDays) return { remove: [], put: [] };
  return days > currentDays
    ? extendBatch(slot, cook, leftovers, days - currentDays, createBatchId)
    : shrinkBatch(slot, cook, leftovers, currentDays - days);
}

function extendBatch(
  slot: readonly PlanEntry[],
  cook: PlanEntry,
  leftovers: readonly PlanEntry[],
  extraDays: number,
  createBatchId: () => string,
): BatchChange {
  const batchId = cook.batchId ?? createBatchId();
  const lastDay = leftovers.at(-1)?.date ?? cook.date;

  const pushed = shiftColliding(
    slot.filter((entry) => entry.date > lastDay),
    addDays(lastDay, extraDays + 1),
  );

  const newLeftovers = Array.from({ length: extraDays }, (_, index) => ({
    date: addDays(lastDay, index + 1),
    mealType: cook.mealType,
    recipeId: cook.recipeId,
    memberIds: [...cook.memberIds],
    batchId,
    cookedOn: cook.date,
  }));

  return {
    remove: pushed.removed,
    put: [
      ...pushed.moved,
      ...newLeftovers,
      // The first day only needs rewriting when it becomes part of a batch.
      ...(cook.batchId === undefined ? [{ ...cook, batchId }] : []),
    ],
  };
}

function shrinkBatch(
  slot: readonly PlanEntry[],
  cook: PlanEntry,
  leftovers: readonly PlanEntry[],
  daysToDrop: number,
): BatchChange {
  const dropped = leftovers.slice(leftovers.length - daysToDrop);
  const oldLastDay = leftovers.at(-1)?.date ?? cook.date;

  // Dishes that directly follow the old end were pushed by this batch.
  const following: PlanEntry[] = [];
  let expected = addDays(oldLastDay, 1);
  for (const entry of slot.filter((candidate) => candidate.date > oldLastDay)) {
    if (entry.date !== expected) break;
    following.push(entry);
    expected = addDays(expected, 1);
  }

  const pulled = moveEntries(following, (entry) => addDays(entry.date, -daysToDrop));
  const becomesSingle = daysToDrop === leftovers.length;

  return {
    remove: [...dropped.map(toSlotRef), ...pulled.removed],
    put: [
      ...pulled.moved,
      // A dish eaten on one day only is no longer a batch.
      ...(becomesSingle
        ? [
            {
              date: cook.date,
              mealType: cook.mealType,
              recipeId: cook.recipeId,
              memberIds: cook.memberIds,
            },
          ]
        : []),
    ],
  };
}

/**
 * Moves the entries that sit before `firstFreeDay` to the free days from there
 * on, one after the other. It stops at the first entry that does not get in the
 * way, because everything after it is further along anyway.
 */
function shiftColliding(
  entries: readonly PlanEntry[],
  firstFreeDay: DateKey,
): { moved: PlanEntry[]; removed: SlotRef[] } {
  let next = firstFreeDay;
  const colliding: PlanEntry[] = [];

  for (const entry of entries) {
    if (entry.date >= next) break;
    colliding.push(entry);
    next = addDays(next, 1);
  }

  let target = firstFreeDay;
  return moveEntries(colliding, () => {
    const day = target;
    target = addDays(target, 1);
    return day;
  });
}

function moveEntries(
  entries: readonly PlanEntry[],
  newDate: (entry: PlanEntry) => DateKey,
): { moved: PlanEntry[]; removed: SlotRef[] } {
  const moves = entries.map((entry) => ({ entry, date: newDate(entry) }));
  const newDateOf = new Map(moves.map(({ entry, date }) => [entry.date, date]));

  return {
    removed: entries.map(toSlotRef),
    moved: moves.map(({ entry, date }) => ({
      ...entry,
      date,
      // A moved dish keeps its leftovers pointing at the day it is now cooked.
      ...(entry.cookedOn === undefined
        ? {}
        : { cookedOn: newDateOf.get(entry.cookedOn) ?? entry.cookedOn }),
    })),
  };
}

function toSlotRef({ date, mealType }: PlanEntry): SlotRef {
  return { date, mealType };
}

export interface BatchSummary {
  /** How many days the dish is eaten over. */
  days: number;
  /** The last day it is eaten. */
  lastDay: DateKey;
  /** How many servings to cook, for all days together. */
  totalServings: number;
  /** What to use for all days together; the same ingredient is listed once. */
  ingredients: RecipeIngredient[];
}

/**
 * What cooking the dish once involves: the servings and ingredients of every
 * day it is eaten, not just the day it is cooked.
 */
export function summarizeBatch(
  cook: PlanEntry,
  entries: readonly PlanEntry[],
  recipe: Recipe,
  household: readonly Member[],
  catalog: IngredientCatalog,
  snacks: SnackAllowance = USUAL_SNACKS,
): BatchSummary {
  const days =
    cook.batchId === undefined
      ? [cook]
      : entries
          .filter((entry) => entry.batchId === cook.batchId && entry.mealType === cook.mealType)
          .sort((a, b) => a.date.localeCompare(b.date));

  const meals = days.map((entry) => planMeal(entry, recipe, household, catalog, snacks));

  return {
    days: days.length,
    lastDay: days.at(-1)?.date ?? cook.date,
    totalServings: Number(meals.reduce((sum, meal) => sum + meal.totalServings, 0).toFixed(2)),
    ingredients: mergeIngredients(meals.flatMap((meal) => meal.ingredients)),
  };
}
