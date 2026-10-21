import { db } from './db';

/** Ids of the recipes the user marked as favorites. */
export async function listFavoriteIds(): Promise<Set<string>> {
  const records = await db.favorites.toArray();
  return new Set(records.map((record) => record.recipeId));
}

export async function setFavorite(recipeId: string, favorite: boolean): Promise<void> {
  if (favorite) {
    await db.favorites.put({ recipeId });
  } else {
    await db.favorites.delete(recipeId);
  }
}
