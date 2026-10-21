import type { Member, NewMember } from '../domain/household/member';
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

export async function updateMember(member: Member): Promise<void> {
  const updatedCount = await db.members.update(member.id, member);
  if (updatedCount === 0) {
    throw new Error(`Cannot update member ${member.id}: it does not exist`);
  }
}

/** Deletes the member and takes them off every planned meal they were eating. */
export async function removeMember(id: string): Promise<void> {
  await db.transaction('rw', db.members, db.planEntries, async () => {
    await db.members.delete(id);
    await db.planEntries
      .filter((entry) => entry.memberIds.includes(id))
      .modify((entry) => {
        entry.memberIds = entry.memberIds.filter((memberId) => memberId !== id);
      });
  });
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
  };
}
