import { useLiveQuery } from 'dexie-react-hooks';
import { listCheckedIngredients } from '../data/shoppingRepository';
import type { DateKey } from '../domain/plan/dates';

/**
 * Ids of the ingredients ticked off on the shopping list of the week that
 * contains the given day, kept up to date. Returns undefined until the first
 * read from IndexedDB completes.
 */
export function useCheckedIngredients(week: DateKey): Set<string> | undefined {
  return useLiveQuery(() => listCheckedIngredients(week), [week]);
}
