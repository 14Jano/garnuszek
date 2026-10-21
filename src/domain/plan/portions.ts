import type { Member } from '../household/member';
import { dailyCalorieTarget } from '../nutrition/calorieTarget';
import { NO_NUTRIENTS, addNutrients, scaleNutrients } from '../nutrition/nutrients';
import type { Nutrients } from '../nutrition/nutrients';
import type { IngredientCatalog } from '../recipes/ingredient';
import { nutritionPerServing } from '../recipes/recipe';
import type { MealType, Recipe, RecipeIngredient } from '../recipes/recipe';
import type { PlanEntry } from './planEntry';

/**
 * Share of the day's calories that each meal should provide. They add up to
 * one; a later snack allowance is subtracted from the daily target before
 * these shares are applied.
 */
export const MEAL_SHARES: Record<MealType, number> = {
  breakfast: 0.3,
  lunch: 0.4,
  dinner: 0.3,
};

/**
 * Portions are sized in recipe servings. They are rounded to a quarter-spoon
 * sized step so the numbers stay cookable, and kept within sensible bounds so a
 * very light or very rich dish never produces an absurd amount of food.
 */
export const PORTION_LIMITS = { min: 0.25, max: 3, step: 0.05 } as const;

export function mealCalorieTarget(dailyKcal: number, mealType: MealType): number {
  return dailyKcal * MEAL_SHARES[mealType];
}

export interface Portion {
  /** How many recipe servings the person eats. */
  servings: number;
  nutrition: Nutrients;
  /** The person's share of each ingredient, in grams. */
  ingredients: RecipeIngredient[];
}

/** The portion of a recipe that comes closest to the calorie target within the limits. */
export function portionForTarget(
  recipe: Recipe,
  targetKcal: number,
  catalog: IngredientCatalog,
): Portion {
  const perServing = nutritionPerServing(recipe, catalog);
  const ideal = perServing.kcal > 0 ? targetKcal / perServing.kcal : 1;
  const servings = clamp(roundToStep(ideal), PORTION_LIMITS.min, PORTION_LIMITS.max);

  return {
    servings,
    nutrition: scaleNutrients(perServing, servings),
    ingredients: recipe.ingredients.map(({ ingredientId, grams }) => ({
      ingredientId,
      grams: (grams / recipe.servings) * servings,
    })),
  };
}

export interface MemberPortion extends Portion {
  member: Member;
  /** Calories this meal should give the member, before rounding the portion. */
  targetKcal: number;
}

export interface PlannedMeal {
  entry: PlanEntry;
  recipe: Recipe;
  /** One portion per person who eats the meal, in household order. */
  portions: MemberPortion[];
  /** How many recipe servings to cook for everyone together. */
  totalServings: number;
  /** What to use for the whole meal; the same ingredient is listed once. */
  ingredients: RecipeIngredient[];
}

/**
 * Sizes the meal for each person who eats it. Members the entry lists but who
 * no longer live in the household are ignored.
 */
export function planMeal(
  entry: PlanEntry,
  recipe: Recipe,
  household: readonly Member[],
  catalog: IngredientCatalog,
): PlannedMeal {
  const portions = household
    .filter((member) => entry.memberIds.includes(member.id))
    .map((member) => {
      const targetKcal = mealCalorieTarget(dailyCalorieTarget(member), entry.mealType);
      return { member, targetKcal, ...portionForTarget(recipe, targetKcal, catalog) };
    });

  return {
    entry,
    recipe,
    portions,
    totalServings: roundToStep(portions.reduce((sum, portion) => sum + portion.servings, 0)),
    ingredients: mergeIngredients(portions.flatMap((portion) => portion.ingredients)),
  };
}

/**
 * Sizes every planned meal whose recipe is known. An entry whose recipe has
 * disappeared is skipped, so one stale entry cannot break a whole day or week.
 */
export function planMeals(
  entries: readonly PlanEntry[],
  recipes: readonly Recipe[],
  household: readonly Member[],
  catalog: IngredientCatalog,
): PlannedMeal[] {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  return entries.flatMap((entry) => {
    const recipe = recipeById.get(entry.recipeId);
    return recipe ? [planMeal(entry, recipe, household, catalog)] : [];
  });
}

/** What each person eats over the day, keyed by member id. */
export function dayTotals(meals: readonly PlannedMeal[]): Map<string, Nutrients> {
  const totals = new Map<string, Nutrients>();

  for (const meal of meals) {
    for (const { member, nutrition } of meal.portions) {
      totals.set(member.id, addNutrients(totals.get(member.id) ?? NO_NUTRIENTS, nutrition));
    }
  }
  return totals;
}

function mergeIngredients(lines: readonly RecipeIngredient[]): RecipeIngredient[] {
  const grams = new Map<string, number>();
  for (const { ingredientId, grams: amount } of lines) {
    grams.set(ingredientId, (grams.get(ingredientId) ?? 0) + amount);
  }
  return [...grams].map(([ingredientId, amount]) => ({ ingredientId, grams: amount }));
}

function roundToStep(value: number): number {
  // toFixed removes the floating-point noise that multiplying by 0.05 leaves behind.
  return Number((Math.round(value / PORTION_LIMITS.step) * PORTION_LIMITS.step).toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
