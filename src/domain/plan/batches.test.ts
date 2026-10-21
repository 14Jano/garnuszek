import { describe, expect, it } from 'vitest';
import type { Member } from '../household/member';
import { createCatalog } from '../recipes/ingredient';
import type { Recipe } from '../recipes/recipe';
import { MAX_BATCH_DAYS, resizeBatch, summarizeBatch } from './batches';
import type { BatchChange } from './batches';
import type { DateKey } from './dates';
import type { PlanEntry } from './planEntry';

// Wednesday 2026-10-21 is the day the dish is cooked in most of these tests.

function lunch(date: DateKey, recipeId: string, extra: Partial<PlanEntry> = {}): PlanEntry {
  return { date, mealType: 'lunch', recipeId, memberIds: ['a', 'b'], ...extra };
}

/** The first day of a dish that is part of a batch, and its leftovers. */
function batchDay(date: DateKey, recipeId: string, batchId: string, cookedOn?: DateKey) {
  return lunch(date, recipeId, { batchId, ...(cookedOn ? { cookedOn } : {}) });
}

const newBatchId = () => 'new-batch';

/** The plan after the change: removals first, then the writes, in date order. */
function apply(entries: readonly PlanEntry[], change: BatchChange): PlanEntry[] {
  const keyOf = (e: { date: DateKey; mealType: string }) => `${e.date}_${e.mealType}`;
  const removed = new Set(change.remove.map(keyOf));
  const plan = new Map(entries.filter((e) => !removed.has(keyOf(e))).map((e) => [keyOf(e), e]));
  for (const entry of change.put) plan.set(keyOf(entry), entry);

  return [...plan.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** "21 stew", "22 stew (z 21)": day of the month, dish and the day it was cooked. */
function describe_(plan: readonly PlanEntry[]): string[] {
  return plan.map(
    (e) => `${e.date.slice(8)} ${e.recipeId}${e.cookedOn ? ` (z ${e.cookedOn.slice(8)})` : ''}`,
  );
}

describe('resizeBatch: cooking for more days', () => {
  it('fills the extra days with leftovers of the same dish for the same people', () => {
    const entries = [lunch('2026-10-21', 'stew')];

    const plan = apply(entries, resizeBatch(entries, '2026-10-21', 'lunch', 3, newBatchId));

    expect(describe_(plan)).toEqual(['21 stew', '22 stew (z 21)', '23 stew (z 21)']);
    expect(plan.every((entry) => entry.batchId === 'new-batch')).toBe(true);
    expect(plan.every((entry) => entry.memberIds.join() === 'a,b')).toBe(true);
    expect(plan[0]?.cookedOn).toBeUndefined();
  });

  it('pushes the dishes that were planned for those days to later days', () => {
    const entries = [
      lunch('2026-10-21', 'stew'),
      lunch('2026-10-22', 'soup'),
      lunch('2026-10-23', 'pizza'),
      lunch('2026-10-30', 'fish'),
    ];

    const plan = apply(entries, resizeBatch(entries, '2026-10-21', 'lunch', 3, newBatchId));

    expect(describe_(plan)).toEqual([
      '21 stew',
      '22 stew (z 21)',
      '23 stew (z 21)',
      '24 soup',
      '25 pizza',
      '30 fish',
    ]);
  });

  it('leaves alone a dish that does not get in the way', () => {
    const entries = [lunch('2026-10-21', 'stew'), lunch('2026-10-23', 'soup')];

    const plan = apply(entries, resizeBatch(entries, '2026-10-21', 'lunch', 2, newBatchId));

    expect(describe_(plan)).toEqual(['21 stew', '22 stew (z 21)', '23 soup']);
  });

  it('moves the dish that lands on the new last day', () => {
    const entries = [lunch('2026-10-21', 'stew'), lunch('2026-10-23', 'soup')];

    const plan = apply(entries, resizeBatch(entries, '2026-10-21', 'lunch', 3, newBatchId));

    expect(describe_(plan)).toEqual(['21 stew', '22 stew (z 21)', '23 stew (z 21)', '24 soup']);
  });

  it('does not touch other meals of the same days', () => {
    const dinner: PlanEntry = { ...lunch('2026-10-22', 'salad'), mealType: 'dinner' };
    const entries = [lunch('2026-10-21', 'stew'), dinner];

    const change = resizeBatch(entries, '2026-10-21', 'lunch', 2, newBatchId);

    expect(change.remove).toEqual([]);
    expect(change.put.some((entry) => entry.mealType === 'dinner')).toBe(false);
  });

  it('adds days to a dish that is already cooked for several', () => {
    const entries = [
      batchDay('2026-10-21', 'stew', 'b1'),
      batchDay('2026-10-22', 'stew', 'b1', '2026-10-21'),
      lunch('2026-10-23', 'soup'),
    ];

    const plan = apply(entries, resizeBatch(entries, '2026-10-21', 'lunch', 4, newBatchId));

    expect(describe_(plan)).toEqual([
      '21 stew',
      '22 stew (z 21)',
      '23 stew (z 21)',
      '24 stew (z 21)',
      '25 soup',
    ]);
    expect(plan.slice(0, 4).every((entry) => entry.batchId === 'b1')).toBe(true);
  });

  it('keeps another batch together when it has to move', () => {
    const entries = [
      lunch('2026-10-21', 'stew'),
      batchDay('2026-10-22', 'curry', 'b2'),
      batchDay('2026-10-23', 'curry', 'b2', '2026-10-22'),
      batchDay('2026-10-24', 'curry', 'b2', '2026-10-22'),
    ];

    const plan = apply(entries, resizeBatch(entries, '2026-10-21', 'lunch', 2, newBatchId));

    expect(describe_(plan)).toEqual([
      '21 stew',
      '22 stew (z 21)',
      '23 curry',
      '24 curry (z 23)',
      '25 curry (z 23)',
    ]);
  });
});

describe('resizeBatch: cooking for fewer days', () => {
  const threeDays = [
    batchDay('2026-10-21', 'stew', 'b1'),
    batchDay('2026-10-22', 'stew', 'b1', '2026-10-21'),
    batchDay('2026-10-23', 'stew', 'b1', '2026-10-21'),
  ];

  it('goes back to a single day, drops the leftovers and pulls later dishes forward', () => {
    const entries = [
      ...threeDays,
      lunch('2026-10-24', 'soup'),
      lunch('2026-10-25', 'pizza'),
      lunch('2026-10-28', 'fish'),
    ];

    const plan = apply(entries, resizeBatch(entries, '2026-10-21', 'lunch', 1, newBatchId));

    // The fish was not pushed by the batch (there is a gap before it), so it stays.
    expect(describe_(plan)).toEqual(['21 stew', '22 soup', '23 pizza', '28 fish']);
    expect(plan[0]?.batchId).toBeUndefined();
  });

  it('can drop only some of the days', () => {
    const entries = [...threeDays, lunch('2026-10-24', 'soup'), lunch('2026-10-25', 'pizza')];

    const plan = apply(entries, resizeBatch(entries, '2026-10-21', 'lunch', 2, newBatchId));

    expect(describe_(plan)).toEqual(['21 stew', '22 stew (z 21)', '23 soup', '24 pizza']);
    expect(plan[0]?.batchId).toBe('b1');
  });

  it('does not pull forward a dish that is separated from the batch by a gap', () => {
    const entries = [...threeDays.slice(0, 2), lunch('2026-10-25', 'soup')];

    const plan = apply(entries, resizeBatch(entries, '2026-10-21', 'lunch', 1, newBatchId));

    expect(describe_(plan)).toEqual(['21 stew', '25 soup']);
  });

  it('undoes what extending did, bringing the dishes back where they were', () => {
    const original = [
      lunch('2026-10-21', 'stew'),
      lunch('2026-10-22', 'soup'),
      lunch('2026-10-23', 'pizza'),
    ];
    const extended = apply(original, resizeBatch(original, '2026-10-21', 'lunch', 3, newBatchId));

    const restored = apply(extended, resizeBatch(extended, '2026-10-21', 'lunch', 1, newBatchId));

    expect(restored).toEqual(original);
  });
});

describe('resizeBatch: unchanged and invalid requests', () => {
  it('does nothing when the number of days stays the same', () => {
    const single = [lunch('2026-10-21', 'stew')];
    const batch = [
      batchDay('2026-10-21', 'stew', 'b1'),
      batchDay('2026-10-22', 'stew', 'b1', '2026-10-21'),
    ];

    expect(resizeBatch(single, '2026-10-21', 'lunch', 1, newBatchId)).toEqual({
      remove: [],
      put: [],
    });
    expect(resizeBatch(batch, '2026-10-21', 'lunch', 2, newBatchId)).toEqual({
      remove: [],
      put: [],
    });
  });

  it('needs a dish on that day', () => {
    expect(() => resizeBatch([], '2026-10-21', 'lunch', 2, newBatchId)).toThrow(
      'Nothing is planned',
    );
  });

  it('refuses to resize from a leftover day', () => {
    const entries = [
      batchDay('2026-10-21', 'stew', 'b1'),
      batchDay('2026-10-22', 'stew', 'b1', '2026-10-21'),
    ];

    expect(() => resizeBatch(entries, '2026-10-22', 'lunch', 1, newBatchId)).toThrow('leftover');
  });

  it.each([0, MAX_BATCH_DAYS + 1, 1.5, Number.NaN])('rejects %f days', (days) => {
    expect(() =>
      resizeBatch([lunch('2026-10-21', 'stew')], '2026-10-21', 'lunch', days, newBatchId),
    ).toThrow(RangeError);
  });
});

describe('summarizeBatch', () => {
  const catalog = createCatalog([
    {
      id: 'x',
      name: 'X',
      category: 'grains',
      per100g: { kcal: 100, proteinG: 10, fatG: 5, carbsG: 20 },
    },
  ]);
  // 1000 g shared by 2 servings: 500 kcal a serving, so 1.7 servings for Adam at lunch.
  const recipe: Recipe = {
    id: 'stew',
    name: 'Gulasz',
    mealType: 'lunch',
    servings: 2,
    prepMinutes: 30,
    ingredients: [{ ingredientId: 'x', grams: 1000 }],
    steps: [],
  };
  const adam: Member = {
    id: 'a',
    name: 'Adam',
    sex: 'male',
    age: 30,
    heightCm: 180,
    weightKg: 80,
    activity: 'sedentary',
    goal: 'maintain',
    snackKcal: 0,
  };

  it('covers every day the dish is eaten, not just the day it is cooked', () => {
    const entries = [
      batchDay('2026-10-21', 'stew', 'b1'),
      batchDay('2026-10-22', 'stew', 'b1', '2026-10-21'),
    ];

    const summary = summarizeBatch(entries[0] as PlanEntry, entries, recipe, [adam], catalog);

    expect(summary.days).toBe(2);
    expect(summary.lastDay).toBe('2026-10-22');
    expect(summary.totalServings).toBe(3.4);
    expect(summary.ingredients).toHaveLength(1);
    expect(summary.ingredients[0]?.grams).toBeCloseTo(1700);
  });

  it('is just the one day for a dish that is not part of a batch', () => {
    const single = lunch('2026-10-21', 'stew');

    const summary = summarizeBatch(single, [single], recipe, [adam], catalog);

    expect(summary).toMatchObject({ days: 1, lastDay: '2026-10-21', totalServings: 1.7 });
  });

  it('counts only the people who eat on each day', () => {
    const entries = [
      batchDay('2026-10-21', 'stew', 'b1'),
      { ...batchDay('2026-10-22', 'stew', 'b1', '2026-10-21'), memberIds: [] },
    ];

    const summary = summarizeBatch(entries[0] as PlanEntry, entries, recipe, [adam], catalog);

    expect(summary.totalServings).toBe(1.7);
  });
});
