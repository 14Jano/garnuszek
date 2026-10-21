import type { MealType } from '../recipes/recipe';
import type { DateKey } from './dates';

/** One planned meal: which recipe is cooked on a day for a meal, and who eats it. */
export interface PlanEntry {
  date: DateKey;
  mealType: MealType;
  recipeId: string;
  /** Household members who eat this meal, so someone can be left out of a dinner. */
  memberIds: readonly string[];
}

/** A day has at most one entry per meal type, so the two together identify it. */
export function planEntryKey(date: DateKey, mealType: MealType): string {
  return `${date}_${mealType}`;
}
