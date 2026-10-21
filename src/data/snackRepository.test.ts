import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addMember, removeMember } from './memberRepository';
import { listSnackOverrides, setSnackOverride } from './snackRepository';

beforeEach(async () => {
  await db.snackOverrides.clear();
  await db.members.clear();
});

describe('snackRepository', () => {
  it('starts out with no amounts for single days', async () => {
    expect(await listSnackOverrides('2026-10-19', '2026-10-25')).toEqual([]);
  });

  it('stores an amount for one person on one day', async () => {
    await setSnackOverride('2026-10-21', 'anna', 300);

    expect(await listSnackOverrides('2026-10-19', '2026-10-25')).toEqual([
      { date: '2026-10-21', memberId: 'anna', kcal: 300 },
    ]);
  });

  it('replaces the amount instead of adding a second one', async () => {
    await setSnackOverride('2026-10-21', 'anna', 300);
    await setSnackOverride('2026-10-21', 'anna', 100);

    expect(await listSnackOverrides('2026-10-21', '2026-10-21')).toEqual([
      { date: '2026-10-21', memberId: 'anna', kcal: 100 },
    ]);
  });

  it('keeps a zero, which means no snacks that day', async () => {
    await setSnackOverride('2026-10-21', 'anna', 0);

    expect(await listSnackOverrides('2026-10-21', '2026-10-21')).toHaveLength(1);
  });

  it('goes back to the usual amount when given null', async () => {
    await setSnackOverride('2026-10-21', 'anna', 300);
    await setSnackOverride('2026-10-21', 'anna', null);

    expect(await listSnackOverrides('2026-10-21', '2026-10-21')).toEqual([]);
  });

  it('lists only the requested days', async () => {
    await setSnackOverride('2026-10-18', 'anna', 100);
    await setSnackOverride('2026-10-19', 'anna', 200);
    await setSnackOverride('2026-10-26', 'anna', 300);

    const days = (await listSnackOverrides('2026-10-19', '2026-10-25')).map((o) => o.date);

    expect(days).toEqual(['2026-10-19']);
  });

  it('is forgotten when the member is removed', async () => {
    const anna = await addMember({
      name: 'Anna',
      sex: 'female',
      age: 30,
      heightCm: 165,
      weightKg: 60,
      activity: 'light',
      goal: 'maintain',
      snackKcal: 0,
    });
    await setSnackOverride('2026-10-21', anna.id, 300);
    await setSnackOverride('2026-10-21', 'someone-else', 100);

    await removeMember(anna.id);

    expect(await listSnackOverrides('2026-10-21', '2026-10-21')).toEqual([
      { date: '2026-10-21', memberId: 'someone-else', kcal: 100 },
    ]);
  });
});
