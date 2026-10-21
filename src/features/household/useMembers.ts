import { useLiveQuery } from 'dexie-react-hooks';
import { listMembers } from '../../data/memberRepository';
import type { Member } from '../../domain/household/member';

/**
 * The stored household, kept up to date as members change. Returns undefined
 * for the brief moment before the first read from IndexedDB completes.
 */
export function useMembers(): Member[] | undefined {
  return useLiveQuery(listMembers, []);
}
