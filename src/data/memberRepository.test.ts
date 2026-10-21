import { beforeEach, describe, expect, it } from 'vitest';
import type { NewMember } from '../domain/household/member';
import { db } from './db';
import { addMember, listMembers, removeMember, updateMember } from './memberRepository';

function newMember(overrides: Partial<NewMember> = {}): NewMember {
  return {
    name: 'Anna',
    sex: 'female',
    age: 30,
    heightCm: 165,
    weightKg: 60,
    activity: 'light',
    goal: 'maintain',
    ...overrides,
  };
}

beforeEach(async () => {
  await db.members.clear();
});

describe('memberRepository', () => {
  it('starts out empty', async () => {
    expect(await listMembers()).toEqual([]);
  });

  it('stores a member and gives it an id', async () => {
    const input = newMember();

    const saved = await addMember(input);

    expect(saved.id).toBeTruthy();
    expect(await listMembers()).toEqual([{ ...input, id: saved.id }]);
  });

  it('lists members in the order they were added', async () => {
    await addMember(newMember({ name: 'Anna' }));
    await addMember(newMember({ name: 'Bartek' }));
    await addMember(newMember({ name: 'Celina' }));

    const names = (await listMembers()).map((member) => member.name);

    expect(names).toEqual(['Anna', 'Bartek', 'Celina']);
  });

  it('updates an existing member in place', async () => {
    const saved = await addMember(newMember());

    await updateMember({ ...saved, weightKg: 58.5, goal: 'lose' });

    expect(await listMembers()).toEqual([{ ...saved, weightKg: 58.5, goal: 'lose' }]);
  });

  it('refuses to update a member that does not exist', async () => {
    const ghost = { ...newMember(), id: 'missing' };

    await expect(updateMember(ghost)).rejects.toThrow('does not exist');
  });

  it('removes a member', async () => {
    const anna = await addMember(newMember({ name: 'Anna' }));
    await addMember(newMember({ name: 'Bartek' }));

    await removeMember(anna.id);

    const names = (await listMembers()).map((member) => member.name);
    expect(names).toEqual(['Bartek']);
  });
});
