import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';

describe('database upgrade', () => {
  it('keeps members stored under version 1 when moving to the current schema', async () => {
    // Recreate what a user who installed version 0.2 has on their device.
    const legacy = new Dexie('garnuszek');
    legacy.version(1).stores({ members: 'id, createdAt' });
    await legacy.open();
    await legacy.table('members').add({
      id: 'anna-id',
      name: 'Anna',
      sex: 'female',
      age: 30,
      heightCm: 165,
      weightKg: 60,
      activity: 'light',
      goal: 'maintain',
      createdAt: 1,
    });
    legacy.close();

    // Import only now, so the real database definition meets the old data.
    const { listMembers } = await import('./memberRepository');
    const { listCustomRecipes } = await import('./recipeRepository');
    const { listFavoriteIds } = await import('./favoriteRepository');
    const { listPlanEntries } = await import('./planRepository');
    const { listCheckedIngredients } = await import('./shoppingRepository');
    const { listSnackOverrides } = await import('./snackRepository');
    const { listMeasurements, saveMeasurement } = await import('./measurementRepository');

    expect((await listMembers()).map((member) => member.name)).toEqual(['Anna']);
    // Saved before snacks existed, so it has none, and before target weights existed.
    expect((await listMembers())[0]?.snackKcal).toBe(0);
    expect((await listMembers())[0]?.targetWeightKg).toBeUndefined();
    expect(await listMeasurements('anna-id')).toEqual([]);
    // The new table works on a database that was upgraded.
    await saveMeasurement({ memberId: 'anna-id', kind: 'weight', date: '2026-10-21', value: 59 });
    expect(await listMeasurements('anna-id')).toHaveLength(1);
    expect(await listCustomRecipes()).toEqual([]);
    expect(await listFavoriteIds()).toEqual(new Set());
    expect(await listPlanEntries('2000-01-01', '2100-12-31')).toEqual([]);
    expect(await listCheckedIngredients('2026-10-21')).toEqual(new Set());
    expect(await listSnackOverrides('2000-01-01', '2100-12-31')).toEqual([]);
  });
});
