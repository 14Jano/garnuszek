import { createBackup } from '../domain/backup/backup';
import type { Backup } from '../domain/backup/backup';
import { measurementKey } from '../domain/progress/measurement';
import { db } from './db';

/** Every table that holds something the user entered. */
const ALL_TABLES = [
  db.members,
  db.customRecipes,
  db.favorites,
  db.planEntries,
  db.shoppingChecks,
  db.snackOverrides,
  db.measurements,
];

/** Reads everything the user has entered into a backup, in one consistent snapshot. */
export async function exportBackup(now: Date = new Date()): Promise<Backup> {
  return db.transaction('r', ALL_TABLES, async () => {
    const [
      members,
      customRecipes,
      favorites,
      planEntries,
      shoppingChecks,
      snackOverrides,
      measurements,
    ] = await Promise.all([
      db.members.orderBy('createdAt').toArray(),
      db.customRecipes.orderBy('createdAt').toArray(),
      db.favorites.toArray(),
      db.planEntries.toArray(),
      db.shoppingChecks.toArray(),
      db.snackOverrides.toArray(),
      db.measurements.toArray(),
    ]);

    // Copy the fields explicitly so storage-only data (keys, timestamps) stays out of the file.
    return createBackup(
      {
        members: members.map((member) => ({
          id: member.id,
          name: member.name,
          sex: member.sex,
          age: member.age,
          heightCm: member.heightCm,
          weightKg: member.weightKg,
          activity: member.activity,
          goal: member.goal,
          snackKcal: member.snackKcal ?? 0,
          ...(member.targetWeightKg === undefined ? {} : { targetWeightKg: member.targetWeightKg }),
        })),
        customRecipes: customRecipes.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          mealType: recipe.mealType,
          servings: recipe.servings,
          prepMinutes: recipe.prepMinutes,
          ingredients: recipe.ingredients.map(({ ingredientId, grams }) => ({
            ingredientId,
            grams,
          })),
          steps: [...recipe.steps],
        })),
        favoriteRecipeIds: favorites.map((favorite) => favorite.recipeId),
        planEntries: planEntries
          .map((entry) => ({
            date: entry.date,
            mealType: entry.mealType,
            recipeId: entry.recipeId,
            memberIds: [...entry.memberIds],
            ...(entry.batchId === undefined ? {} : { batchId: entry.batchId }),
            ...(entry.cookedOn === undefined ? {} : { cookedOn: entry.cookedOn }),
          }))
          .sort((a, b) => a.date.localeCompare(b.date) || a.mealType.localeCompare(b.mealType)),
        shoppingChecks: shoppingChecks.map(({ weekStart, ingredientId }) => ({
          weekStart,
          ingredientId,
        })),
        snackOverrides: snackOverrides.map(({ date, memberId, kcal }) => ({
          date,
          memberId,
          kcal,
        })),
        measurements: measurements
          .map(({ memberId, kind, date, value }) => ({ memberId, kind, date, value }))
          .sort(
            (a, b) =>
              a.memberId.localeCompare(b.memberId) ||
              a.date.localeCompare(b.date) ||
              a.kind.localeCompare(b.kind),
          ),
      },
      now,
    );
  });
}

/**
 * Replaces everything stored on the device with the contents of the backup.
 * It all happens in one transaction: if anything fails, nothing is changed.
 */
export async function importBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', ALL_TABLES, async () => {
    await clearAll();

    // Members and recipes are listed oldest first. The stored order is a timestamp,
    // so hand out increasing ones that keep the order of the file.
    const base = Date.now();
    await db.members.bulkAdd(
      backup.members.map((member, index) => ({ ...member, createdAt: base + index })),
    );
    await db.customRecipes.bulkAdd(
      backup.customRecipes.map((recipe, index) => ({ ...recipe, createdAt: base + index })),
    );
    await db.favorites.bulkAdd(backup.favoriteRecipeIds.map((recipeId) => ({ recipeId })));
    await db.planEntries.bulkAdd(
      backup.planEntries.map((entry) => ({
        ...entry,
        memberIds: [...entry.memberIds],
        key: `${entry.date}_${entry.mealType}`,
      })),
    );
    await db.shoppingChecks.bulkAdd(
      backup.shoppingChecks.map((check) => ({
        ...check,
        key: `${check.weekStart}_${check.ingredientId}`,
      })),
    );
    await db.snackOverrides.bulkAdd(
      backup.snackOverrides.map((override) => ({
        ...override,
        key: `${override.date}_${override.memberId}`,
      })),
    );
    await db.measurements.bulkAdd(
      backup.measurements.map((measurement) => ({
        ...measurement,
        key: measurementKey(measurement),
      })),
    );
  });
}

/** Removes everything the user has entered from this device. */
export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', ALL_TABLES, clearAll);
}

async function clearAll(): Promise<void> {
  await Promise.all(ALL_TABLES.map((table) => table.clear()));
}
