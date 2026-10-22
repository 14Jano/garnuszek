import type { Member, NewMember } from '../domain/household/member';
import { copyRestrictions } from '../domain/household/restrictions';
import { db, nextCreatedAt } from './db';
import type { MemberRecord } from './db';

/** All members, oldest first. */
export async function listMembers(): Promise<Member[]> {
  const records = await db.members.orderBy('createdAt').toArray();
  return records.map(toMember);
}

export async function addMember(input: NewMember): Promise<Member> {
  const member: Member = { ...input, id: crypto.randomUUID() };

  await db.transaction('rw', db.members, async () => {
    const createdAt = nextCreatedAt(await db.members.orderBy('createdAt').last());
    await db.members.add({ ...member, createdAt });
  });

  return member;
}

/**
 * Replaces everything stored about the member. The whole record is written, not
 * just the fields that are given, so a field the person has cleared (a target
 * weight, a restriction) is gone afterwards instead of lingering.
 */
export async function updateMember(member: Member): Promise<void> {
  await db.transaction('rw', db.members, async () => {
    const existing = await db.members.get(member.id);
    if (!existing) {
      throw new Error(`Cannot update member ${member.id}: it does not exist`);
    }
    await db.members.put({ ...member, createdAt: existing.createdAt });
  });
}

/**
 * Deletes the member, takes them off every planned meal they were eating and
 * forgets their snack amounts for single days and their measurements.
 */
export async function removeMember(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.members,
    db.planEntries,
    db.snackOverrides,
    db.measurements,
    async () => {
      await db.members.delete(id);
      await db.measurements.where('memberId').equals(id).delete();
      await db.snackOverrides.filter((override) => override.memberId === id).delete();
      await db.planEntries
        .filter((entry) => entry.memberIds.includes(id))
        .modify((entry) => {
          entry.memberIds = entry.memberIds.filter((memberId) => memberId !== id);
        });
    },
  );
}

// Copy the fields explicitly so storage-only data never leaks into the app.
function toMember(record: MemberRecord): Member {
  return {
    id: record.id,
    name: record.name,
    sex: record.sex,
    age: record.age,
    heightCm: record.heightCm,
    weightKg: record.weightKg,
    activity: record.activity,
    goal: record.goal,
    snackKcal: record.snackKcal ?? 0,
    ...(record.targetWeightKg === undefined ? {} : { targetWeightKg: record.targetWeightKg }),
    ...(record.restrictions === undefined
      ? {}
      : { restrictions: copyRestrictions(record.restrictions) }),
  };
}
