import { describe, expect, it } from 'vitest';
import { niceStep, timeFraction, valueAxis } from './chart';

describe('niceStep', () => {
  it.each([
    [0.3, 0.5],
    [0.5, 0.5],
    [0.7, 1],
    [1.2, 2],
    [3, 5],
    [5, 5],
    [6, 10],
    [12, 20],
    [130, 200],
  ])('rounds %s up to %s', (rough, expected) => {
    expect(niceStep(rough)).toBe(expected);
  });
});

describe('valueAxis', () => {
  it('starts and ends on round numbers around the values', () => {
    const axis = valueAxis([68.5, 72, 70], 2);

    expect(axis.min).toBeLessThanOrEqual(68.5);
    expect(axis.max).toBeGreaterThanOrEqual(72);
    expect(axis.ticks[0]).toBe(axis.min);
    expect(axis.ticks.at(-1)).toBe(axis.max);
  });

  it('spaces the ticks evenly', () => {
    const { ticks } = valueAxis([61, 70], 2);
    const gaps = ticks.slice(1).map((tick, index) => tick - (ticks[index] ?? 0));

    expect(new Set(gaps.map((gap) => gap.toFixed(6))).size).toBe(1);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
  });

  it('gives a single value room on both sides', () => {
    const axis = valueAxis([70], 2);

    expect(axis.min).toBeLessThan(70);
    expect(axis.max).toBeGreaterThan(70);
  });

  it('does not stretch readings that barely differ into a big swing', () => {
    const axis = valueAxis([70, 70.1], 2);

    expect(axis.max - axis.min).toBeGreaterThanOrEqual(2);
  });

  it('keeps fractions free of floating point noise', () => {
    const { ticks } = valueAxis([70, 70.3], 2);

    for (const tick of ticks) expect(String(tick).length).toBeLessThanOrEqual(6);
  });
});

describe('timeFraction', () => {
  it('places the first day at the start and the last at the end', () => {
    expect(timeFraction('2026-10-01', '2026-10-01', '2026-10-31')).toBe(0);
    expect(timeFraction('2026-10-31', '2026-10-01', '2026-10-31')).toBe(1);
  });

  it('places days in proportion to the time between them', () => {
    expect(timeFraction('2026-10-11', '2026-10-01', '2026-10-21')).toBe(0.5);
  });

  it('puts a lone day in the middle', () => {
    expect(timeFraction('2026-10-01', '2026-10-01', '2026-10-01')).toBe(0.5);
  });
});
