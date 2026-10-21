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

    expect((await listMembers()).map((member) => member.name)).toEqual(['Anna']);
    expect(await listCustomRecipes()).toEqual([]);
    expect(await listFavoriteIds()).toEqual(new Set());
  });
});
