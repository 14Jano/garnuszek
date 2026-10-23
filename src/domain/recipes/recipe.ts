import { NO_NUTRIENTS, addNutrients, scaleNutrients } from '../nutrition/nutrients';
import type { Nutrients } from '../nutrition/nutrients';
import { checkNumber } from '../validation';
import type { FieldProblem } from '../validation';
import { requireIngredient } from './ingredient';
import type { IngredientCatalog, IngredientCategory } from './ingredient';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

/** In the order they are eaten during the day. */
export const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'dinner'];

export interface RecipeIngredient {
  ingredientId: string;
  grams: number;
}

/** Where a recipe that was adapted from someone else's work comes from. */
export interface RecipeOrigin {
  /** Who made the original, e.g. a government institute. */
  author: string;
  /** The page of the original. */
  url: string;
  /** The wording of the credit that the source asks for when its work is reused. */
  credit: string;
}

export interface Recipe {
  id: string;
  name: string;
  mealType: MealType;
  /** How many portions the listed ingredients make. */
  servings: number;
  prepMinutes: number;
  ingredients: readonly RecipeIngredient[];
  steps: readonly string[];
  /** Set only for built-in recipes that are adaptations. The rest are written for Garnuszek. */
  origin?: RecipeOrigin;
}

/** What the user fills in; the id is assigned when the recipe is stored. */
export type NewRecipe = Omit<Recipe, 'id'>;

export const RECIPE_LIMITS = {
  nameMaxLength: 60,
  servings: { min: 1, max: 20 },
  prepMinutes: { min: 1, max: 600 },
  grams: { min: 1, max: 5000 },
} as const;

/**
 * From the most to the least permissive. Every vegan recipe is also vegetarian
 * and pescatarian, and every vegetarian one is also pescatarian.
 */
export const DIETS = ['pescatarian', 'vegetarian', 'vegan'] as const;
export type Diet = (typeof DIETS)[number];

const FORBIDDEN_CATEGORIES: Record<Diet, readonly IngredientCategory[]> = {
  pescatarian: ['meat'],
  vegetarian: ['meat', 'fish'],
  vegan: ['meat', 'fish', 'dairy', 'eggs'],
};

/** Every diet the recipe fits, derived from the food groups of its ingredients. */
export function compatibleDiets(
  recipe: Pick<Recipe, 'ingredients'>,
  catalog: IngredientCatalog,
): Diet[] {
  const categories = recipe.ingredients.map(
    ({ ingredientId }) => requireIngredient(ingredientId, catalog).category,
  );

  return DIETS.filter((diet) =>
    categories.every((category) => !FORBIDDEN_CATEGORIES[diet].includes(category)),
  );
}

/** Nutrition of the whole recipe, i.e. all servings together. */
export function recipeNutrition(
  recipe: Pick<Recipe, 'ingredients'>,
  catalog: IngredientCatalog,
): Nutrients {
  return recipe.ingredients.reduce((total, { ingredientId, grams }) => {
    const { per100g } = requireIngredient(ingredientId, catalog);
    return addNutrients(total, scaleNutrients(per100g, grams / 100));
  }, NO_NUTRIENTS);
}

export function nutritionPerServing(
  recipe: Pick<Recipe, 'ingredients' | 'servings'>,
  catalog: IngredientCatalog,
): Nutrients {
  return scaleNutrients(recipeNutrition(recipe, catalog), 1 / recipe.servings);
}

export interface RecipeDraft {
  name: string;
  /** NaN stands for an empty or unreadable input. */
  servings: number;
  prepMinutes: number;
  ingredients: readonly { ingredientId: string; grams: number }[];
}

export type IngredientRowErrors = Partial<Record<'ingredientId' | 'grams', FieldProblem>>;

export interface RecipeErrors {
  name?: FieldProblem;
  servings?: FieldProblem;
  prepMinutes?: FieldProblem;
  /** True when there is not a single ingredient row. */
  noIngredients?: boolean;
  /** One entry per ingredient row, in the same order. */
  rows: IngredientRowErrors[];
}

export function validateRecipe(draft: RecipeDraft, catalog: IngredientCatalog): RecipeErrors {
  const errors: RecipeErrors = { rows: [] };

  const name = draft.name.trim();
  if (name === '') {
    errors.name = 'required';
  } else if (name.length > RECIPE_LIMITS.nameMaxLength) {
    errors.name = 'invalid';
  }

  const servings = checkNumber(draft.servings, RECIPE_LIMITS.servings, { integer: true });
  if (servings) errors.servings = servings;

  const prepMinutes = checkNumber(draft.prepMinutes, RECIPE_LIMITS.prepMinutes, { integer: true });
  if (prepMinutes) errors.prepMinutes = prepMinutes;

  if (draft.ingredients.length === 0) {
    errors.noIngredients = true;
  }

  errors.rows = draft.ingredients.map((row) => {
    const rowErrors: IngredientRowErrors = {};

    if (row.ingredientId === '') {
      rowErrors.ingredientId = 'required';
    } else if (!catalog.has(row.ingredientId)) {
      rowErrors.ingredientId = 'invalid';
    }

    const grams = checkNumber(row.grams, RECIPE_LIMITS.grams);
    if (grams) rowErrors.grams = grams;

    return rowErrors;
  });

  return errors;
}

export function hasRecipeErrors(errors: RecipeErrors): boolean {
  return (
    errors.name !== undefined ||
    errors.servings !== undefined ||
    errors.prepMinutes !== undefined ||
    errors.noIngredients === true ||
    errors.rows.some((row) => Object.keys(row).length > 0)
  );
}
