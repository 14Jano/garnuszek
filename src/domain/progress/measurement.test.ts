import { describe, expect, it } from 'vitest';
import {
  MEASUREMENT_KINDS,
  MEASUREMENT_LIMITS,
  measurementKey,
  seriesOf,
  validateMeasurement,
} from './measurement';
import type { Measurement } from './measurement';

const TODAY = '2026-10-21';

describe('measurementKey', () => {
  it('identifies a reading by person, kind and day', () => {
    expect(measurementKey({ memberId: 'anna', kind: 'weight', date: TODAY })).toBe(
      'anna_weight_2026-10-21',
    );
  });
});

describe('validateMeasurement', () => {
  it('accepts a sensible reading from today or earlier', () => {
    expect(validateMeasurement({ kind: 'weight', date: TODAY, value: 72.5 }, TODAY)).toEqual({});
    expect(validateMeasurement({ kind: 'waist', date: '2026-01-02', value: 81 }, TODAY)).toEqual(
      {},
    );
  });

  it('asks for a date and a value', () => {
    expect(validateMeasurement({ kind: 'weight', date: '', value: Number.NaN }, TODAY)).toEqual({
      date: 'required',
      value: 'required',
    });
  });

  it.each(['2026-10-22', '2027-01-01', '2026-02-31', 'wczoraj'])(
    'rejects the date "%s"',
    (date) => {
      expect(validateMeasurement({ kind: 'weight', date, value: 70 }, TODAY)).toEqual({
        date: 'invalid',
      });
    },
  );

  it.each(MEASUREMENT_KINDS)('keeps a %s reading within its range', (kind) => {
    const { min, max } = MEASUREMENT_LIMITS[kind];

    expect(validateMeasurement({ kind, date: TODAY, value: min }, TODAY)).toEqual({});
    expect(validateMeasurement({ kind, date: TODAY, value: max }, TODAY)).toEqual({});
    expect(validateMeasurement({ kind, date: TODAY, value: min - 1 }, TODAY)).toEqual({
      value: 'invalid',
    });
    expect(validateMeasurement({ kind, date: TODAY, value: max + 1 }, TODAY)).toEqual({
      value: 'invalid',
    });
  });

  it('allows a fractional value', () => {
    expect(validateMeasurement({ kind: 'weight', date: TODAY, value: 72.45 }, TODAY)).toEqual({});
  });
});

describe('seriesOf', () => {
  const reading = (kind: Measurement['kind'], date: string, value: number): Measurement => ({
    memberId: 'anna',
    kind,
    date,
    value,
  });

  it('keeps one kind, oldest first', () => {
    const series = seriesOf(
      [
        reading('weight', '2026-10-14', 79),
        reading('waist', '2026-10-10', 90),
        reading('weight', '2026-10-07', 80),
        reading('weight', '2026-10-21', 78),
      ],
      'weight',
    );

    expect(series).toEqual([
      { date: '2026-10-07', value: 80 },
      { date: '2026-10-14', value: 79 },
      { date: '2026-10-21', value: 78 },
    ]);
  });

  it('is empty when nothing of that kind was measured', () => {
    expect(seriesOf([reading('waist', '2026-10-10', 90)], 'weight')).toEqual([]);
  });
});
