import { useLiveQuery } from 'dexie-react-hooks';
import { listSnackOverrides } from '../data/snackRepository';
import type { DateKey } from '../domain/plan/dates';
import type { SnackOverride } from '../domain/plan/snacks';

/**
 * Snack amounts set for particular days between two days (both included), kept
 * up to date. Returns undefined until the first read from IndexedDB completes.
 */
export function useSnackOverrides(from: DateKey, to: DateKey): SnackOverride[] | undefined {
  return useLiveQuery(() => listSnackOverrides(from, to), [from, to]);
}
