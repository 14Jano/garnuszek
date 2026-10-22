import { useLiveQuery } from 'dexie-react-hooks';
import { listMeasurements } from '../data/measurementRepository';
import type { Measurement } from '../domain/progress/measurement';

/**
 * All readings of one person, oldest first, kept up to date. Returns undefined
 * until the first read from IndexedDB completes.
 */
export function useMeasurements(memberId: string): Measurement[] | undefined {
  return useLiveQuery(() => listMeasurements(memberId), [memberId]);
}
