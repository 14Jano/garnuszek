import Dexie from 'dexie';
import type { EntityTable } from 'dexie';
import type { Member } from '../domain/household/member';

/** A stored member plus bookkeeping that the domain does not need to know about. */
export interface MemberRecord extends Member {
  createdAt: number;
}

/**
 * The app's local database. Everything lives in the browser's IndexedDB; there
 * is no server. Change the schema by adding a new `version()` with an upgrade
 * function, never by editing an existing one.
 */
class GarnuszekDatabase extends Dexie {
  members!: EntityTable<MemberRecord, 'id'>;

  constructor() {
    super('garnuszek');

    this.version(1).stores({
      members: 'id, createdAt',
    });
  }
}

export const db = new GarnuszekDatabase();
