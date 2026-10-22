import Dexie from 'dexie';
import type { EntityTable } from 'dexie';
import type { Member } from '../domain/household/member';
import type { DateKey } from '../domain/plan/dates';
import type { PlanEntry } from '../domain/plan/planEntry';
import type { SnackOverride } from '../domain/plan/snacks';
import type { Measurement } from '../domain/progress/measurement';
import type { Recipe } from '../domain/recipes/recipe';

/**
 * A stored member plus bookkeeping that the domain does not need to know about.
 * Members saved before snacks existed have no snack amount.
 */
export interface MemberRecord extends Omit<Member, 'snackKcal'> {
  snackKcal?: number;
  createdAt: number;
}

/** A recipe written by the user. Built-in recipes ship with the app and are not stored. */
export interface RecipeRecord extends Recipe {
  createdAt: number;
}

export interface FavoriteRecord {
  /** Id of a built-in or custom recipe. */
  recipeId: string;
}

/** A planned meal. The key (`date_mealType`) allows one meal per slot of a day. */
export interface PlanEntryRecord extends PlanEntry {
  key: string;
}

/** An item of a week's shopping list that is already in the basket. */
export interface ShoppingCheckRecord {
  /** `weekStart_ingredientId`, so an item is checked at most once per week. */
  key: string;
  /** Monday of the week the list belongs to. */
  weekStart: DateKey;
  ingredientId: string;
}

/** A weight or circumference reading. */
export interface MeasurementRecord extends Measurement {
  /** `memberId_kind_date`, so a person has at most one reading per kind and day. */
  key: string;
}

/** The snack amount one person set for one particular day. */
export interface SnackOverrideRecord extends SnackOverride {
  /** `date_memberId`, so a person has at most one amount per day. */
  key: string;
}

/**
 * The app's local database. Everything lives in the browser's IndexedDB; there
 * is no server. Change the schema by adding a new `version()` with an upgrade
 * function, never by editing an existing one: the data of real users is already
 * stored under the old versions.
 */
class GarnuszekDatabase extends Dexie {
  members!: EntityTable<MemberRecord, 'id'>;
  customRecipes!: EntityTable<RecipeRecord, 'id'>;
  favorites!: EntityTable<FavoriteRecord, 'recipeId'>;
  planEntries!: EntityTable<PlanEntryRecord, 'key'>;
  shoppingChecks!: EntityTable<ShoppingCheckRecord, 'key'>;
  snackOverrides!: EntityTable<SnackOverrideRecord, 'key'>;
  measurements!: EntityTable<MeasurementRecord, 'key'>;

  constructor() {
    super('garnuszek');

    this.version(1).stores({
      members: 'id, createdAt',
    });

    // Adds recipes and favorites. Existing members are left as they are.
    this.version(2).stores({
      members: 'id, createdAt',
      customRecipes: 'id, createdAt',
      favorites: 'recipeId',
    });

    // Adds the meal plan. The date index serves "everything in this week".
    this.version(3).stores({
      members: 'id, createdAt',
      customRecipes: 'id, createdAt',
      favorites: 'recipeId',
      planEntries: 'key, date',
    });

    // Adds which shopping list items are ticked off, per week.
    this.version(4).stores({
      members: 'id, createdAt',
      customRecipes: 'id, createdAt',
      favorites: 'recipeId',
      planEntries: 'key, date',
      shoppingChecks: 'key, weekStart',
    });

    // Adds snack amounts for single days, and an index that finds the meals of a
    // dish cooked for several days.
    this.version(5).stores({
      members: 'id, createdAt',
      customRecipes: 'id, createdAt',
      favorites: 'recipeId',
      planEntries: 'key, date, batchId',
      shoppingChecks: 'key, weekStart',
      snackOverrides: 'key, date',
    });

    // Adds weight and circumference readings, found by person.
    this.version(6).stores({
      members: 'id, createdAt',
      customRecipes: 'id, createdAt',
      favorites: 'recipeId',
      planEntries: 'key, date, batchId',
      shoppingChecks: 'key, weekStart',
      snackOverrides: 'key, date',
      measurements: 'key, memberId',
    });
  }
}

export const db = new GarnuszekDatabase();

/**
 * A creation timestamp that is strictly later than the newest existing row, so
 * rows keep a stable order even when several are saved within the same
 * millisecond.
 */
export function nextCreatedAt(newest: { createdAt: number } | undefined): number {
  return Math.max(Date.now(), (newest?.createdAt ?? 0) + 1);
}
