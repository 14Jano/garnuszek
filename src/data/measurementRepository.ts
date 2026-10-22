import { measurementKey } from '../domain/progress/measurement';
import type { Measurement } from '../domain/progress/measurement';
import { db } from './db';
import type { MeasurementRecord } from './db';

/** All readings of one person, oldest first. */
export async function listMeasurements(memberId: string): Promise<Measurement[]> {
  const records = await db.measurements.where('memberId').equals(memberId).toArray();

  return records
    .map(toMeasurement)
    .sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}

/**
 * Stores a reading, replacing the one of the same kind on the same day. When it
 * is a weight, the person's weight is brought up to date, because their calorie
 * target is worked out from it.
 */
export async function saveMeasurement(measurement: Measurement): Promise<void> {
  await db.transaction('rw', db.measurements, db.members, async () => {
    await db.measurements.put({ ...measurement, key: measurementKey(measurement) });
    if (measurement.kind === 'weight') await syncMemberWeight(measurement.memberId);
  });
}

export async function removeMeasurement(
  measurement: Pick<Measurement, 'memberId' | 'kind' | 'date'>,
): Promise<void> {
  await db.transaction('rw', db.measurements, db.members, async () => {
    await db.measurements.delete(measurementKey(measurement));
    if (measurement.kind === 'weight') await syncMemberWeight(measurement.memberId);
  });
}

/**
 * The person's weight is that of their latest weighing, whatever order the
 * readings were entered in. With no readings left it stays as it was.
 */
async function syncMemberWeight(memberId: string): Promise<void> {
  const weighings = await db.measurements
    .where('memberId')
    .equals(memberId)
    .filter((record) => record.kind === 'weight')
    .toArray();

  const latest = weighings.sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  if (latest) {
    await db.members.update(memberId, { weightKg: latest.value });
  }
}

// Copy the fields explicitly so storage-only data never leaks into the app.
function toMeasurement(record: MeasurementRecord): Measurement {
  return {
    memberId: record.memberId,
    kind: record.kind,
    date: record.date,
    value: record.value,
  };
}
