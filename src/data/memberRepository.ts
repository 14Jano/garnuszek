import type { Member, NewMember } from '../domain/household/member';
import { db } from './db';
import type { MemberRecord } from './db';

/** All members, oldest first. */
export async function listMembers(): Promise<Member[]> {
  const records = await db.members.orderBy('createdAt').toArray();
  return records.map(toMember);
}

export async function addMember(input: NewMember): Promise<Member> {
  const member: Member = { ...input, id: crypto.randomUUID() };

  await db.transaction('rw', db.members, async () => {
    // Two members saved within the same millisecond would otherwise have no
    // stable order, so always go at least one past the newest one.
    const newest = await db.members.orderBy('createdAt').last();
    const createdAt = Math.max(Date.now(), (newest?.createdAt ?? 0) + 1);
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

export async function removeMember(id: string): Promise<void> {
  await db.members.delete(id);
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
