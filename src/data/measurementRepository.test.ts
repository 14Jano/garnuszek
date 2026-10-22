import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addMember, listMembers, removeMember } from './memberRepository';
import { listMeasurements, removeMeasurement, saveMeasurement } from './measurementRepository';

async function seedAnna() {
  return addMember({
    name: 'Anna',
    sex: 'female',
    age: 30,
    heightCm: 165,
    weightKg: 80,
    activity: 'light',
    goal: 'lose',
    snackKcal: 0,
    targetWeightKg: 70,
  });
}

async function weightOf(memberId: string) {
  return (await listMembers()).find((member) => member.id === memberId)?.weightKg;
}

beforeEach(async () => {
  await db.measurements.clear();
  await db.members.clear();
});

describe('measurementRepository', () => {
  it('starts out empty', async () => {
    expect(await listMeasurements('anna')).toEqual([]);
  });

  it('stores readings and lists them oldest first', async () => {
    await saveMeasurement({ memberId: 'a', kind: 'weight', date: '2026-10-14', value: 79 });
    await saveMeasurement({ memberId: 'a', kind: 'waist', date: '2026-10-07', value: 90 });
    await saveMeasurement({ memberId: 'a', kind: 'weight', date: '2026-10-07', value: 80 });

    const readings = await listMeasurements('a');

    expect(readings.map((r) => `${r.date} ${r.kind} ${r.value}`)).toEqual([
      '2026-10-07 waist 90',
      '2026-10-07 weight 80',
      '2026-10-14 weight 79',
    ]);
  });

  it('keeps people apart', async () => {
    await saveMeasurement({ memberId: 'a', kind: 'weight', date: '2026-10-07', value: 80 });
    await saveMeasurement({ memberId: 'b', kind: 'weight', date: '2026-10-07', value: 60 });

    expect((await listMeasurements('b')).map((r) => r.value)).toEqual([60]);
  });

  it('replaces a reading of the same kind on the same day', async () => {
    await saveMeasurement({ memberId: 'a', kind: 'weight', date: '2026-10-07', value: 80 });
    await saveMeasurement({ memberId: 'a', kind: 'weight', date: '2026-10-07', value: 79.5 });

    expect((await listMeasurements('a')).map((r) => r.value)).toEqual([79.5]);
  });

  it('removes a reading', async () => {
    await saveMeasurement({ memberId: 'a', kind: 'waist', date: '2026-10-07', value: 90 });
    await saveMeasurement({ memberId: 'a', kind: 'waist', date: '2026-10-14', value: 89 });

    await removeMeasurement({ memberId: 'a', kind: 'waist', date: '2026-10-07' });

    expect((await listMeasurements('a')).map((r) => r.date)).toEqual(['2026-10-14']);
  });
});

describe('keeping the weight of the person up to date', () => {
  it('uses the latest weighing as the weight of the person', async () => {
    const anna = await seedAnna();

    await saveMeasurement({ memberId: anna.id, kind: 'weight', date: '2026-10-14', value: 78 });

    expect(await weightOf(anna.id)).toBe(78);
  });

  it('is not changed by a weighing from before the latest one', async () => {
    const anna = await seedAnna();
    await saveMeasurement({ memberId: anna.id, kind: 'weight', date: '2026-10-14', value: 78 });

    await saveMeasurement({ memberId: anna.id, kind: 'weight', date: '2026-10-07', value: 81 });

    expect(await weightOf(anna.id)).toBe(78);
  });

  it('is not changed by a circumference', async () => {
    const anna = await seedAnna();

    await saveMeasurement({ memberId: anna.id, kind: 'waist', date: '2026-10-14', value: 85 });

    expect(await weightOf(anna.id)).toBe(80);
  });

  it('goes back to the previous weighing when the latest one is removed', async () => {
    const anna = await seedAnna();
    await saveMeasurement({ memberId: anna.id, kind: 'weight', date: '2026-10-07', value: 79 });
    await saveMeasurement({ memberId: anna.id, kind: 'weight', date: '2026-10-14', value: 77 });

    await removeMeasurement({ memberId: anna.id, kind: 'weight', date: '2026-10-14' });

    expect(await weightOf(anna.id)).toBe(79);
  });

  it('keeps the weight when the last weighing is removed', async () => {
    const anna = await seedAnna();
    await saveMeasurement({ memberId: anna.id, kind: 'weight', date: '2026-10-14', value: 77 });

    await removeMeasurement({ memberId: anna.id, kind: 'weight', date: '2026-10-14' });

    expect(await weightOf(anna.id)).toBe(77);
  });

  it('is harmless for a person that does not exist', async () => {
    await expect(
      saveMeasurement({ memberId: 'nobody', kind: 'weight', date: '2026-10-14', value: 70 }),
    ).resolves.toBeUndefined();
  });
});

describe('removing a member', () => {
  it('forgets their measurements but not those of others', async () => {
    const anna = await seedAnna();
    await saveMeasurement({ memberId: anna.id, kind: 'weight', date: '2026-10-14', value: 77 });
    await saveMeasurement({ memberId: 'other', kind: 'weight', date: '2026-10-14', value: 60 });

    await removeMember(anna.id);

    expect(await listMeasurements(anna.id)).toEqual([]);
    expect(await listMeasurements('other')).toHaveLength(1);
  });

  it('keeps the target weight of a member', async () => {
    const anna = await seedAnna();

    expect((await listMembers())[0]).toMatchObject({ id: anna.id, targetWeightKg: 70 });
  });
});
