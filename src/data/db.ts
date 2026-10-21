import Dexie from 'dexie';
import type { EntityTable } from 'dexie';
import type { Member } from '../domain/household/member';
import type { Recipe } from '../domain/recipes/recipe';

/** A stored member plus bookkeeping that the domain does not need to know about. */
export interface MemberRecord extends Member {
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
