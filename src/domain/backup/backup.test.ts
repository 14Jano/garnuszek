import { describe, expect, it } from 'vitest';
import type { Member } from '../household/member';
import { createCatalog } from '../recipes/ingredient';
import type { Recipe } from '../recipes/recipe';
import { BACKUP_FORMAT, BACKUP_VERSION, createBackup, parseBackup } from './backup';
import type { Backup, BackupContext, BackupData } from './backup';

const catalog = createCatalog([
  {
    id: 'potato',
    name: 'Ziemniaki',
    category: 'vegetables',
    per100g: { kcal: 77, proteinG: 2, fatG: 0.1, carbsG: 17.5 },
  },
  {
    id: 'quark',
    name: 'Twaróg',
    category: 'dairy',
    per100g: { kcal: 133, proteinG: 18, fatG: 5, carbsG: 3.5 },
  },
]);

const context: BackupContext = {
  catalog,
  builtInRecipeIds: new Set(['szakszuka', 'chili-sin-carne']),
};

const anna: Member = {
  id: 'anna-id',
  name: 'Anna',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activity: 'light',
  goal: 'maintain',
  snackKcal: 150,
};

const pierogi: Recipe = {
  id: 'pierogi-id',
  name: 'Pierogi ruskie',
  mealType: 'lunch',
  servings: 4,
  prepMinutes: 90,
  ingredients: [
    { ingredientId: 'potato', grams: 600 },
    { ingredientId: 'quark', grams: 250 },
  ],
  steps: ['Ugotuj ziemniaki.', 'Wymieszaj z twarogiem.'],
};

const data: BackupData = {
  members: [anna],
  customRecipes: [pierogi],
  favoriteRecipeIds: ['szakszuka', 'pierogi-id'],
  planEntries: [
    { date: '2026-10-21', mealType: 'lunch', recipeId: 'pierogi-id', memberIds: ['anna-id'] },
    {
      date: '2026-10-22',
      mealType: 'lunch',
      recipeId: 'pierogi-id',
      memberIds: ['anna-id'],
      batchId: 'batch-1',
      cookedOn: '2026-10-21',
    },
  ],
  shoppingChecks: [{ weekStart: '2026-10-19', ingredientId: 'potato' }],
  snackOverrides: [{ date: '2026-10-21', memberId: 'anna-id', kcal: 400 }],
  measurements: [
    { memberId: 'anna-id', kind: 'weight', date: '2026-10-14', value: 61 },
    { memberId: 'anna-id', kind: 'waist', date: '2026-10-14', value: 78.5 },
  ],
};

const NOW = new Date('2026-10-21T12:00:00.000Z');
const NO_DROPPED = {
  planEntries: 0,
  favorites: 0,
  shoppingChecks: 0,
  snackOverrides: 0,
  measurements: 0,
};

function parse(value: unknown) {
  return parseBackup(JSON.stringify(value), context);
}

/** A fresh copy of the good backup that a test may change. */
function copyOfBackup(): Backup {
  return structuredClone(createBackup(data, NOW));
}

/** Sets a value deep inside a backup, e.g. `members[0].age`, even to a value of the wrong type. */
function setPath(root: unknown, path: string, value: unknown): void {
  const keys = path.split(/[.[\]]+/).filter(Boolean);
  const last = keys.pop() ?? '';
  let node = root;
  for (const key of keys) node = (node as Record<string, unknown>)[key];
  (node as Record<string, unknown>)[last] = value;
}

/** Parses the good backup after damaging it at the given places. */
function parseDamaged(...damage: [path: string, value: unknown][]) {
  const backup = copyOfBackup();
  for (const [path, value] of damage) setPath(backup, path, value);
  return parse(backup);
}

/** Parses the good backup after a change that keeps every value of the right type. */
function parseChanged(change: (backup: Backup) => void) {
  const backup = copyOfBackup();
  change(backup);
  const result = parse(backup);
  if (!result.ok) throw new Error(`expected a readable backup, got ${result.problem}`);
  return result;
}

describe('createBackup', () => {
  it('labels the file and records when it was made', () => {
    const backup = createBackup(data, NOW);

    expect(backup).toMatchObject({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: '2026-10-21T12:00:00.000Z',
    });
    expect(backup.members).toEqual(data.members);
  });
});

describe('parseBackup: a good file', () => {
  it('gives back exactly what was written', () => {
    const result = parseBackup(JSON.stringify(createBackup(data, NOW)), context);

    expect(result).toEqual({ ok: true, backup: createBackup(data, NOW), dropped: NO_DROPPED });
  });

  it('accepts an empty backup', () => {
    const empty = createBackup(
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
    );

    expect(parse(empty)).toMatchObject({ ok: true, dropped: NO_DROPPED });
  });
});

describe('parseBackup: measurements and target weight', () => {
  it('reads the measurements and the target weight of a member', () => {
    const withTarget: BackupData = {
      ...data,
      members: [{ ...anna, weightKg: 70, goal: 'lose', targetWeightKg: 62.5 }],
    };

    const result = parse(createBackup(withTarget, NOW));

    expect(result).toEqual({
      ok: true,
      backup: createBackup(withTarget, NOW),
      dropped: NO_DROPPED,
    });
  });

  it('still reads a version 1 file, which has no measurements', () => {
    const file: Partial<Backup> = copyOfBackup();
    delete file.measurements;

    const result = parse({ ...file, version: 1 });

    expect(result).toMatchObject({ ok: true, dropped: NO_DROPPED });
    expect(result.ok && result.backup.measurements).toEqual([]);
    expect(result.ok && result.backup.version).toBe(BACKUP_VERSION);
  });

  it('ignores measurements in a version 1 file, which cannot have them', () => {
    const result = parse({ ...createBackup(data, NOW), version: 1 });

    expect(result.ok && result.backup.measurements).toEqual([]);
  });

  it('requires the list of measurements in a version 2 file', () => {
    const file: Partial<Backup> = copyOfBackup();
    delete file.measurements;

    expect(parse(file)).toEqual({ ok: false, problem: 'invalid-data', detail: 'measurements' });
  });

  it.each([
    ['measurements[0].kind', 'wzrost', 'measurements[0].kind'],
    ['measurements[0].date', '2026-13-01', 'measurements[0].date'],
    ['measurements[0].value', 'dużo', 'measurements[0].value'],
    ['measurements[0].value', 9, 'measurements[0].value'],
    ['measurements[0].value', 301, 'measurements[0].value'],
    ['measurements[1].value', 19, 'measurements[1].value'],
    ['measurements[0].memberId', '', 'measurements[0].memberId'],
    ['members[0].targetWeightKg', 'mało', 'members[0].targetWeightKg'],
    ['members[0].targetWeightKg', 5, 'members[0].targetWeightKg'],
  ])('damaging %s points at the problem', (path, value, detail) => {
    const backup = copyOfBackup();
    // The member has to be losing weight for the target to be looked at.
    setPath(backup, 'members[0].goal', 'lose');
    setPath(backup, 'members[0].targetWeightKg', 55);
    setPath(backup, path, value);

    expect(parse(backup)).toEqual({ ok: false, problem: 'invalid-data', detail });
  });

  it('keeps a target the person has already reached', () => {
    // Weighings move the weight, so the member now weighs less than the target.
    const reached: BackupData = {
      ...data,
      members: [{ ...anna, weightKg: 61, goal: 'lose', targetWeightKg: 62 }],
    };

    expect(parse(createBackup(reached, NOW))).toMatchObject({ ok: true });
  });

  it('drops the measurements of people who are not in the backup', () => {
    const { backup, dropped } = parseChanged((b) => {
      b.measurements.push({
        memberId: 'someone-gone',
        kind: 'weight',
        date: '2026-10-15',
        value: 80,
      });
    });

    expect(backup.measurements).toHaveLength(2);
    expect(dropped.measurements).toBe(1);
  });

  it('keeps one reading per person, kind and day, the later one winning', () => {
    const { backup, dropped } = parseChanged((b) => {
      b.measurements.push({ memberId: 'anna-id', kind: 'weight', date: '2026-10-14', value: 60.4 });
    });

    expect(backup.measurements.filter((m) => m.kind === 'weight')).toEqual([
      { memberId: 'anna-id', kind: 'weight', date: '2026-10-14', value: 60.4 },
    ]);
    expect(dropped.measurements).toBe(1);
  });
});

describe('parseBackup: not a backup', () => {
  it('rejects text that is not JSON', () => {
    expect(parseBackup('to nie jest json', context)).toEqual({ ok: false, problem: 'not-json' });
    expect(parseBackup('', context)).toEqual({ ok: false, problem: 'not-json' });
  });

  it.each([
    ['an array', []],
    ['null', null],
    ['a number', 42],
    ['an object of another app', { app: 'something-else', members: [] }],
    ['the wrong format name', { ...createBackup(data, NOW), format: 'other' }],
    ['a missing version', { ...createBackup(data, NOW), version: undefined }],
    ['a fractional version', { ...createBackup(data, NOW), version: 1.5 }],
    ['version zero', { ...createBackup(data, NOW), version: 0 }],
  ])('rejects %s', (_name, value) => {
    expect(parse(value)).toEqual({ ok: false, problem: 'not-a-backup' });
  });

  it('refuses a file made by a newer version of the app', () => {
    expect(parse({ ...createBackup(data, NOW), version: BACKUP_VERSION + 1 })).toEqual({
      ok: false,
      problem: 'newer-version',
    });
  });
});

describe('parseBackup: damaged data', () => {
  it.each([
    ['members[0].age', 500, 'members[0].age'],
    ['members[0].heightCm', 'wysoki', 'members[0].heightCm'],
    ['members[0].sex', 'inne', 'members[0].sex'],
    ['members[0].activity', undefined, 'members[0].activity'],
    ['members[0].name', '   ', 'members[0].name'],
    ['members[0].snackKcal', 5000, 'members[0].snackKcal'],
    ['members[0].id', '', 'members[0].id'],
    ['customRecipes[0].ingredients', [], 'customRecipes[0]'],
    ['customRecipes[0].ingredients[0].ingredientId', 'unicorn', 'customRecipes[0]'],
    ['customRecipes[0].mealType', 'brunch', 'customRecipes[0].mealType'],
    ['customRecipes[0].steps[1]', 7, 'customRecipes[0].steps[1]'],
    ['planEntries[0].date', '2026-02-31', 'planEntries[0].date'],
    ['planEntries[1].cookedOn', 'wczoraj', 'planEntries[1].cookedOn'],
    ['planEntries[0].memberIds', 'anna', 'planEntries[0].memberIds'],
    ['snackOverrides[0].kcal', -5, 'snackOverrides[0].kcal'],
    ['shoppingChecks[0].weekStart', 5, 'shoppingChecks[0].weekStart'],
    ['members', 'Anna', 'members'],
    ['exportedAt', 'kiedyś', 'exportedAt'],
  ])('damaging %s points at the problem', (path, value, detail) => {
    expect(parseDamaged([path, value])).toEqual({ ok: false, problem: 'invalid-data', detail });
  });

  it('rejects a child with a goal other than keeping weight', () => {
    const result = parseDamaged(['members[0].age', 10], ['members[0].goal', 'lose']);

    expect(result).toEqual({ ok: false, problem: 'invalid-data', detail: 'members[0].goal' });
  });

  it('rejects two members with the same id', () => {
    const backup = copyOfBackup();
    backup.members.push({ ...anna, name: 'Bis' });

    expect(parse(backup)).toEqual({ ok: false, problem: 'invalid-data', detail: 'members' });
  });

  it('rejects a custom recipe that takes the id of a built-in one', () => {
    const backup = copyOfBackup();
    backup.customRecipes = [{ ...pierogi, id: 'szakszuka' }];

    expect(parse(backup)).toEqual({
      ok: false,
      problem: 'invalid-data',
      detail: 'customRecipes[0].id',
    });
  });
});

describe('parseBackup: references to things that no longer exist', () => {
  it('drops planned meals whose recipe is gone and counts them', () => {
    const { backup, dropped } = parseChanged((b) => {
      b.planEntries.push({
        date: '2026-10-23',
        mealType: 'dinner',
        recipeId: 'removed-from-the-app',
        memberIds: ['anna-id'],
      });
    });

    expect(backup.planEntries).toHaveLength(2);
    expect(dropped.planEntries).toBe(1);
  });

  it('keeps meals planned with a built-in recipe', () => {
    const { backup, dropped } = parseChanged((b) => {
      b.planEntries.push({
        date: '2026-10-23',
        mealType: 'dinner',
        recipeId: 'chili-sin-carne',
        memberIds: ['anna-id'],
      });
    });

    expect(backup.planEntries.map((entry) => entry.recipeId)).toContain('chili-sin-carne');
    expect(dropped.planEntries).toBe(0);
  });

  it('removes eaters who are not in the backup, but keeps the meal', () => {
    const { backup } = parseChanged((b) => {
      const first = b.planEntries[0];
      if (first) first.memberIds = ['anna-id', 'someone-gone'];
    });

    expect(backup.planEntries[0]?.memberIds).toEqual(['anna-id']);
  });

  it('keeps the batch fields of a planned meal', () => {
    const { backup } = parseChanged(() => undefined);

    expect(backup.planEntries[1]).toMatchObject({ batchId: 'batch-1', cookedOn: '2026-10-21' });
  });

  it('drops favorites of unknown recipes and repeated ones', () => {
    const { backup, dropped } = parseChanged((b) => {
      b.favoriteRecipeIds = ['szakszuka', 'szakszuka', 'removed', 'pierogi-id'];
    });

    expect(backup.favoriteRecipeIds).toEqual(['szakszuka', 'pierogi-id']);
    expect(dropped.favorites).toBe(2);
  });

  it('drops ticked items of unknown ingredients and snack amounts of unknown people', () => {
    const { backup, dropped } = parseChanged((b) => {
      b.shoppingChecks.push({ weekStart: '2026-10-19', ingredientId: 'unicorn' });
      b.snackOverrides.push({ date: '2026-10-22', memberId: 'someone-gone', kcal: 100 });
    });

    expect(backup.shoppingChecks).toHaveLength(1);
    expect(backup.snackOverrides).toHaveLength(1);
    expect(dropped).toMatchObject({ shoppingChecks: 1, snackOverrides: 1 });
  });

  it('moves a ticked item to the Monday of its week', () => {
    const { backup } = parseChanged((b) => {
      b.shoppingChecks = [{ weekStart: '2026-10-23', ingredientId: 'potato' }];
    });

    expect(backup.shoppingChecks).toEqual([{ weekStart: '2026-10-19', ingredientId: 'potato' }]);
  });

  it('keeps one meal per slot, the later one winning', () => {
    const { backup } = parseChanged((b) => {
      b.planEntries.push({
        date: '2026-10-21',
        mealType: 'lunch',
        recipeId: 'szakszuka',
        memberIds: ['anna-id'],
      });
    });

    const lunches = backup.planEntries.filter((entry) => entry.date === '2026-10-21');
    expect(lunches.map((entry) => entry.recipeId)).toEqual(['szakszuka']);
  });
});
