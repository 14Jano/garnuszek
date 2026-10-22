import { beforeEach, describe, expect, it } from 'vitest';
import { createBackup } from '../domain/backup/backup';
import type { Backup, BackupData } from '../domain/backup/backup';
import { db } from './db';
import { setFavorite } from './favoriteRepository';
import { deleteAllData, exportBackup, importBackup } from './backupRepository';
import { addMember, listMembers } from './memberRepository';
import { assignRecipe, listPlanEntries, setBatchDays, setEaters } from './planRepository';
import { addCustomRecipe, listCustomRecipes } from './recipeRepository';
import { setIngredientChecked } from './shoppingRepository';
import { listSnackOverrides, setSnackOverride } from './snackRepository';

const NOW = new Date('2026-10-21T12:00:00.000Z');

async function clearEverything() {
  await Promise.all([
    db.members.clear(),
    db.customRecipes.clear(),
    db.favorites.clear(),
    db.planEntries.clear(),
    db.shoppingChecks.clear(),
    db.snackOverrides.clear(),
  ]);
}

/** Fills every table with something, including a dish cooked for two days. */
async function fillWithData() {
  const anna = await addMember({
    name: 'Anna',
    sex: 'female',
    age: 30,
    heightCm: 165,
    weightKg: 60,
    activity: 'light',
    goal: 'maintain',
    snackKcal: 150,
  });
  const bartek = await addMember({
    name: 'Bartek',
    sex: 'male',
    age: 32,
    heightCm: 180,
    weightKg: 80,
    activity: 'sedentary',
    goal: 'lose',
    snackKcal: 0,
  });
  const pierogi = await addCustomRecipe({
    name: 'Pierogi ruskie',
    mealType: 'lunch',
    servings: 4,
    prepMinutes: 90,
    ingredients: [
      { ingredientId: 'potato', grams: 600 },
      { ingredientId: 'quark', grams: 250 },
    ],
    steps: ['Ugotuj ziemniaki.', 'Wymieszaj z twarogiem.'],
  });
  await setFavorite('szakszuka', true);
  await setFavorite(pierogi.id, true);
  await assignRecipe('2026-10-21', 'lunch', pierogi.id, [anna.id, bartek.id]);
  await setBatchDays('2026-10-21', 'lunch', 2);
  await setEaters('2026-10-22', 'lunch', [bartek.id]);
  await assignRecipe('2026-10-21', 'dinner', 'salatka-grecka', [anna.id]);
  await setIngredientChecked('2026-10-21', 'potato', true);
  await setSnackOverride('2026-10-21', anna.id, 400);
  return { anna, bartek, pierogi };
}

beforeEach(async () => {
  await clearEverything();
});

describe('exportBackup', () => {
  it('is empty when nothing has been entered', async () => {
    const backup = await exportBackup(NOW);

    expect(backup).toEqual(
      createBackup(
        {
          members: [],
          customRecipes: [],
          favoriteRecipeIds: [],
          planEntries: [],
          shoppingChecks: [],
          snackOverrides: [],
          measurements: [],
        },
        NOW,
      ),
    );
  });

  it('contains everything the user entered, without storage details', async () => {
    const { anna, bartek, pierogi } = await fillWithData();

    const backup = await exportBackup(NOW);

    expect(backup.members.map((member) => member.name)).toEqual(['Anna', 'Bartek']);
    expect(backup.members[0]).toEqual({
      id: anna.id,
      name: 'Anna',
      sex: 'female',
      age: 30,
      heightCm: 165,
      weightKg: 60,
      activity: 'light',
      goal: 'maintain',
      snackKcal: 150,
    });
    expect(backup.customRecipes).toEqual([pierogi]);
    expect(new Set(backup.favoriteRecipeIds)).toEqual(new Set(['szakszuka', pierogi.id]));
    expect(backup.planEntries.map((entry) => `${entry.date} ${entry.mealType}`)).toEqual([
      '2026-10-21 dinner',
      '2026-10-21 lunch',
      '2026-10-22 lunch',
    ]);
    expect(backup.planEntries[2]).toMatchObject({
      memberIds: [bartek.id],
      cookedOn: '2026-10-21',
    });
    expect(backup.shoppingChecks).toEqual([{ weekStart: '2026-10-19', ingredientId: 'potato' }]);
    expect(backup.snackOverrides).toEqual([{ date: '2026-10-21', memberId: anna.id, kcal: 400 }]);
    expect(JSON.stringify(backup)).not.toContain('createdAt');
  });

  it('writes a member saved before snacks existed with a snack amount of zero', async () => {
    await db.members.add({
      id: 'old',
      name: 'Stary',
      sex: 'male',
      age: 50,
      heightCm: 175,
      weightKg: 85,
      activity: 'light',
      goal: 'maintain',
      createdAt: 1,
    });

    expect((await exportBackup(NOW)).members[0]?.snackKcal).toBe(0);
  });
});

describe('importBackup', () => {
  it('restores exactly what was exported', async () => {
    await fillWithData();
    const original = await exportBackup(NOW);
    await clearEverything();

    await importBackup(original);

    const restored = await exportBackup(NOW);
    expect(restored.members).toEqual(original.members);
    expect(restored.customRecipes).toEqual(original.customRecipes);
    expect(new Set(restored.favoriteRecipeIds)).toEqual(new Set(original.favoriteRecipeIds));
    expect(restored.planEntries).toEqual(original.planEntries);
    expect(restored.shoppingChecks).toEqual(original.shoppingChecks);
    expect(restored.snackOverrides).toEqual(original.snackOverrides);
  });

  it('keeps members and recipes in the order of the file', async () => {
    const data: BackupData = {
      members: ['Celina', 'Anna', 'Bartek'].map((name, index) => ({
        id: `m${index}`,
        name,
        sex: 'female',
        age: 30,
        heightCm: 165,
        weightKg: 60,
        activity: 'light',
        goal: 'maintain',
        snackKcal: 0,
      })),
      customRecipes: [],
      favoriteRecipeIds: [],
      planEntries: [],
      shoppingChecks: [],
      snackOverrides: [],
      measurements: [],
    };

    await importBackup(createBackup(data, NOW));

    expect((await listMembers()).map((member) => member.name)).toEqual([
      'Celina',
      'Anna',
      'Bartek',
    ]);
  });

  it('replaces what was on the device instead of adding to it', async () => {
    await fillWithData();
    const smaller = createBackup(
      {
        members: [
          {
            id: 'only',
            name: 'Jedyny',
            sex: 'male',
            age: 40,
            heightCm: 180,
            weightKg: 80,
            activity: 'light',
            goal: 'maintain',
            snackKcal: 0,
          },
        ],
        customRecipes: [],
        favoriteRecipeIds: [],
        planEntries: [],
        shoppingChecks: [],
        snackOverrides: [],
        measurements: [],
      },
      NOW,
    );

    await importBackup(smaller);

    expect((await listMembers()).map((member) => member.name)).toEqual(['Jedyny']);
    expect(await listCustomRecipes()).toEqual([]);
    expect(await listPlanEntries('2000-01-01', '2100-12-31')).toEqual([]);
    expect(await listSnackOverrides('2000-01-01', '2100-12-31')).toEqual([]);
  });

  it('changes nothing when the import fails half way', async () => {
    await fillWithData();
    const before = await exportBackup(NOW);
    // Two members with the same id make the database refuse the second one.
    const broken: Backup = createBackup(
      {
        members: [before.members[0], before.members[0]].flatMap((member) =>
          member ? [member] : [],
        ),
        customRecipes: [],
        favoriteRecipeIds: [],
        planEntries: [],
        shoppingChecks: [],
        snackOverrides: [],
        measurements: [],
      },
      NOW,
    );

    await expect(importBackup(broken)).rejects.toThrow();

    const after = await exportBackup(NOW);
    expect(after.members).toEqual(before.members);
    expect(after.planEntries).toEqual(before.planEntries);
    expect(after.customRecipes).toEqual(before.customRecipes);
  });
});

describe('deleteAllData', () => {
  it('removes everything the user entered', async () => {
    await fillWithData();

    await deleteAllData();

    const backup = await exportBackup(NOW);
    expect(backup.members).toEqual([]);
    expect(backup.customRecipes).toEqual([]);
    expect(backup.favoriteRecipeIds).toEqual([]);
    expect(backup.planEntries).toEqual([]);
    expect(backup.shoppingChecks).toEqual([]);
    expect(backup.snackOverrides).toEqual([]);
  });

  it('is safe on an empty device', async () => {
    await expect(deleteAllData()).resolves.toBeUndefined();
  });
});
