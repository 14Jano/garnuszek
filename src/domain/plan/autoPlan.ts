import { conflictsForMembers } from '../household/restrictions';
import type { Member } from '../household/member';
import { dailyCalorieTarget } from '../nutrition/calorieTarget';
import type { IngredientCatalog } from '../recipes/ingredient';
import { MEAL_TYPES, nutritionPerServing } from '../recipes/recipe';
import type { MealType, Recipe } from '../recipes/recipe';
import { daysBetween } from './dates';
import type { DateKey } from './dates';
import { planEntryKey } from './planEntry';
import type { PlanEntry } from './planEntry';
import { mealCalorieTarget } from './portions';
import { mealBudgetKcal } from './snacks';

export interface PlannableRecipe {
  recipe: Recipe;
  favorite: boolean;
}

export interface AutoPlanRequest {
  /** The days to plan, e.g. the seven days of a week. */
  days: readonly DateKey[];
  /** Which meals to plan. */
  mealTypes: readonly MealType[];
  /** Everyone eats every meal that is planned, so a dish has to suit all of them. */
  household: readonly Member[];
  recipes: readonly PlannableRecipe[];
  /** What is planned already. Those slots are left alone and count as variety. */
  existing: readonly PlanEntry[];
  catalog: IngredientCatalog;
  /** The same seed gives the same plan, and another seed another one. */
  seed: number;
}

export interface Suggestion {
  date: DateKey;
  mealType: MealType;
  recipeId: string;
}

/** A meal that could not be planned, because no dish suits everyone. */
export interface Gap {
  date: DateKey;
  mealType: MealType;
}

export interface AutoPlan {
  /** In calendar order. */
  suggestions: Suggestion[];
  gaps: Gap[];
  /** How many of the chosen slots were already planned and were left as they are. */
  kept: number;
}

/** A favorite dish is a bit more likely to be picked than the others. */
const FAVORITE_WEIGHT = 1.6;

/** A dish that is planned within this many days is not repeated if there is any other. */
const NEIGHBOUR_DAYS = 1;

/** A dish that is planned within this many days is less likely, but still possible. */
const TOO_CLOSE_DAYS = 2;
const TOO_CLOSE_WEIGHT = 0.3;

/**
 * A portion of this many servings or in between still feels natural. Beyond it the dish
 * is too small or too big a meal for the person, and its chance falls quickly.
 */
const NATURAL_SERVINGS = { min: 0.6, max: 2.4 } as const;

/** A dish that fits someone worse than this is never proposed. */
const MIN_FIT = 0.1;

/**
 * Chooses a dish for every empty meal slot. It never proposes a dish that someone in
 * the household avoids and prefers dishes that give each person a sensible portion.
 * Dishes are spread out: none comes back before all the others of its meal have been
 * used, and none is repeated on the next day or the one before when another is possible.
 * Slots that are planned already stay as they are and count towards the variety. Among
 * what is left the choice is random but repeatable: it follows `seed`, so a person who
 * does not like the plan can ask for another one.
 */
export function autoPlan(request: AutoPlanRequest): AutoPlan {
  const random = createRandom(request.seed);
  const candidates = candidatesByMeal(request);

  const taken = new Set(request.existing.map(({ date, mealType }) => planEntryKey(date, mealType)));
  // Everything that is in the plan so far, for variety.
  const placed: { date: DateKey; recipeId: string }[] = request.existing.map(
    ({ date, recipeId }) => ({ date, recipeId }),
  );

  const suggestions: Suggestion[] = [];
  const gaps: Gap[] = [];
  let kept = 0;

  for (const date of request.days) {
    for (const mealType of MEAL_TYPES) {
      if (!request.mealTypes.includes(mealType)) continue;

      if (taken.has(planEntryKey(date, mealType))) {
        kept += 1;
        continue;
      }

      const history = candidates[mealType].map((candidate) => {
        const uses = placed.filter((other) => other.recipeId === candidate.recipe.id);
        const closest = Math.min(...uses.map((other) => Math.abs(daysBetween(other.date, date))));
        return { candidate, uses: uses.length, closest };
      });

      // Dishes that have been used the least come first, and of those the ones that are not
      // right next to a day with the same dish, unless that leaves nothing to choose from.
      const fewestUses = Math.min(...history.map(({ uses }) => uses));
      const leastUsed = history.filter(({ uses }) => uses === fewestUses);
      const apart = leastUsed.filter(({ closest }) => closest > NEIGHBOUR_DAYS);
      const options = apart.length > 0 ? apart : leastUsed;

      const weights = options.map(
        ({ candidate: { favorite, fit }, closest }) =>
          fit *
          (favorite ? FAVORITE_WEIGHT : 1) *
          (closest <= TOO_CLOSE_DAYS ? TOO_CLOSE_WEIGHT : 1),
      );
      const chosen = pickWeighted(
        options.map(({ candidate }) => candidate),
        weights,
        random,
      );
      if (!chosen) {
        gaps.push({ date, mealType });
        continue;
      }

      suggestions.push({ date, mealType, recipeId: chosen.recipe.id });
      placed.push({ date, recipeId: chosen.recipe.id });
    }
  }

  return { suggestions, gaps, kept };
}

interface Candidate extends PlannableRecipe {
  /** How well the portions fit everyone, from 0 (not at all) to 1. */
  fit: number;
}

/** For every meal, the dishes that suit everyone in the household, with how well. */
function candidatesByMeal({
  recipes,
  household,
  catalog,
}: AutoPlanRequest): Record<MealType, Candidate[]> {
  const result: Record<MealType, Candidate[]> = { breakfast: [], lunch: [], dinner: [] };

  for (const entry of recipes) {
    const { recipe } = entry;
    if (conflictsForMembers(recipe, household, catalog).length > 0) continue;

    const fit = fitForHousehold(recipe, household, catalog);
    if (fit >= MIN_FIT) result[recipe.mealType].push({ ...entry, fit });
  }
  return result;
}

/** The worst fit over the household: a dish has to work for everyone who eats it. */
function fitForHousehold(
  recipe: Recipe,
  household: readonly Member[],
  catalog: IngredientCatalog,
): number {
  const kcalPerServing = nutritionPerServing(recipe, catalog).kcal;
  if (kcalPerServing <= 0) return 0;

  return Math.min(
    1,
    ...household.map((member) => {
      const budget = mealBudgetKcal(dailyCalorieTarget(member), member.snackKcal);
      const servings = mealCalorieTarget(budget, recipe.mealType) / kcalPerServing;
      return portionFit(servings);
    }),
  );
}

/** 1 for a natural portion, and less the further the ideal portion is outside that range. */
export function portionFit(servings: number): number {
  const { min, max } = NATURAL_SERVINGS;
  if (servings >= min && servings <= max) return 1;
  if (servings <= 0) return 0;

  const off = servings < min ? Math.log(min / servings) : Math.log(servings / max);
  return Math.exp(-2 * off);
}

function pickWeighted<T>(
  items: readonly T[],
  weights: readonly number[],
  random: () => number,
): T | undefined {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (items.length === 0 || total <= 0) return undefined;

  let point = random() * total;
  for (const [index, item] of items.entries()) {
    point -= weights[index] ?? 0;
    if (point < 0) return item;
  }
  return items.at(-1);
}

/** A small seeded random number generator (mulberry32), so a plan can be repeated. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
