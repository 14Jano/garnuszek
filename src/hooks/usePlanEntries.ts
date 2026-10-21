import { useLiveQuery } from 'dexie-react-hooks';
import { listPlanEntries } from '../data/planRepository';
import type { DateKey } from '../domain/plan/dates';
import type { PlanEntry } from '../domain/plan/planEntry';

/**
 * Planned meals from one day to another (both included), kept up to date as
 * they change. Returns undefined until the first read from IndexedDB completes.
 */
export function usePlanEntries(from: DateKey, to: DateKey): PlanEntry[] | undefined {
  return useLiveQuery(() => listPlanEntries(from, to), [from, to]);
}
