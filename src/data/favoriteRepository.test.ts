import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { listFavoriteIds, setFavorite } from './favoriteRepository';

beforeEach(async () => {
  await db.favorites.clear();
});

describe('favoriteRepository', () => {
  it('starts out with no favorites', async () => {
    expect(await listFavoriteIds()).toEqual(new Set());
  });

  it('marks and unmarks recipes', async () => {
    await setFavorite('szakszuka', true);
    await setFavorite('chili-sin-carne', true);
    expect(await listFavoriteIds()).toEqual(new Set(['szakszuka', 'chili-sin-carne']));

    await setFavorite('szakszuka', false);
    expect(await listFavoriteIds()).toEqual(new Set(['chili-sin-carne']));
  });

  it('is safe to repeat', async () => {
    await setFavorite('szakszuka', true);
    await setFavorite('szakszuka', true);
    await setFavorite('inne', false);

    expect(await listFavoriteIds()).toEqual(new Set(['szakszuka']));
  });
});
