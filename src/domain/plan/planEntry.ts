import type { MealType } from '../recipes/recipe';
import type { DateKey } from './dates';

/** One planned meal: which recipe is cooked on a day for a meal, and who eats it. */
export interface PlanEntry {
  date: DateKey;
  mealType: MealType;
  recipeId: string;
  /** Household members who eat this meal, so someone can be left out of a dinner. */
  memberIds: readonly string[];
  /**
   * Shared by every day of a dish that is cooked once and eaten over several
   * days. Absent for a dish that is cooked for a single day.
   */
  batchId?: string;
  /**
   * Set on the days after the first of such a dish: the day it was cooked. These
   * days are leftovers, so nothing is cooked on them.
   */
  cookedOn?: DateKey;
}

/** A day on which the dish is only reheated, because it was cooked earlier. */
export function isLeftover(entry: PlanEntry): boolean {
  return entry.cookedOn !== undefined;
}

/** A day has at most one entry per meal type, so the two together identify it. */
export function planEntryKey(date: DateKey, mealType: MealType): string {
  return `${date}_${mealType}`;
}
