import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  clearCheckedIngredients,
  listCheckedIngredients,
  setIngredientChecked,
} from './shoppingRepository';

beforeEach(async () => {
  await db.shoppingChecks.clear();
});

describe('shoppingRepository', () => {
  it('starts with nothing ticked off', async () => {
    expect(await listCheckedIngredients('2026-10-21')).toEqual(new Set());
  });

  it('ticks items off and back on again', async () => {
    await setIngredientChecked('2026-10-21', 'onion', true);
    await setIngredientChecked('2026-10-21', 'carrot', true);
    expect(await listCheckedIngredients('2026-10-21')).toEqual(new Set(['onion', 'carrot']));

    await setIngredientChecked('2026-10-21', 'onion', false);
    expect(await listCheckedIngredients('2026-10-21')).toEqual(new Set(['carrot']));
  });

  it('is safe to repeat', async () => {
    await setIngredientChecked('2026-10-21', 'onion', true);
    await setIngredientChecked('2026-10-21', 'onion', true);
    await setIngredientChecked('2026-10-21', 'carrot', false);

    expect(await listCheckedIngredients('2026-10-21')).toEqual(new Set(['onion']));
  });

  it('treats any day of a week as the same list', async () => {
    await setIngredientChecked('2026-10-19', 'onion', true);

    expect(await listCheckedIngredients('2026-10-25')).toEqual(new Set(['onion']));
  });

  it('keeps each week separate', async () => {
    await setIngredientChecked('2026-10-21', 'onion', true);

    expect(await listCheckedIngredients('2026-10-28')).toEqual(new Set());
  });

  it('clears one week without touching the others', async () => {
    await setIngredientChecked('2026-10-21', 'onion', true);
    await setIngredientChecked('2026-10-28', 'carrot', true);

    await clearCheckedIngredients('2026-10-23');

    expect(await listCheckedIngredients('2026-10-21')).toEqual(new Set());
    expect(await listCheckedIngredients('2026-10-28')).toEqual(new Set(['carrot']));
  });
});
