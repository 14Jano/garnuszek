import { describe, expect, it } from 'vitest';
import { forecastTarget, summarizeSeries, targetProgress } from './progress';
import type { SeriesPoint } from './measurement';

/** Weekly readings: the first one on 2026-10-07, then every seven days. */
function weekly(...values: number[]): SeriesPoint[] {
  const firstDay = new Date(2026, 9, 7);
  return values.map((value, index) => {
    const day = new Date(firstDay);
    day.setDate(firstDay.getDate() + index * 7);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return { date, value };
  });
}

describe('summarizeSeries', () => {
  it('gives the start, the latest reading and the change', () => {
    expect(summarizeSeries(weekly(80, 79, 78))).toEqual({
      start: { date: '2026-10-07', value: 80 },
      latest: { date: '2026-10-21', value: 78 },
      change: -2,
    });
  });

  it('is nothing for an empty series', () => {
    expect(summarizeSeries([])).toBeUndefined();
  });

  it('shows no change for a single reading', () => {
    expect(summarizeSeries(weekly(80))?.change).toBe(0);
  });
});

describe('targetProgress', () => {
  it('measures how far a person lost and how far is left', () => {
    expect(targetProgress(80, 76.5, 70)).toEqual({ achieved: 3.5, remaining: 6.5, reached: false });
  });

  it('measures progress towards gaining weight', () => {
    expect(targetProgress(60, 62, 66)).toEqual({ achieved: 2, remaining: 4, reached: false });
  });

  it('counts going the wrong way as no progress', () => {
    expect(targetProgress(80, 82, 70)).toEqual({ achieved: 0, remaining: 12, reached: false });
  });

  it('knows when the target is reached or passed', () => {
    expect(targetProgress(80, 70, 70)).toMatchObject({ remaining: 0, reached: true });
    expect(targetProgress(80, 69, 70)).toMatchObject({ remaining: 0, reached: true });
    expect(targetProgress(60, 66.5, 66)).toMatchObject({ remaining: 0, reached: true });
  });

  it('treats a start that already is the target as reached', () => {
    expect(targetProgress(70, 70, 70).reached).toBe(true);
  });
});

describe('forecastTarget', () => {
  it('projects the date at the current pace', () => {
    // One kilogram a week from 78 kg to 70 kg takes eight more weeks: 56 days.
    const forecast = forecastTarget(weekly(80, 79, 78), 70);

    expect(forecast).toMatchObject({ status: 'projected', date: '2026-12-16' });
    expect(forecast.status === 'projected' && forecast.changePerWeek).toBeCloseTo(-1);
  });

  it('works for gaining weight too', () => {
    // Half a kilogram a week from 61 kg to 64 kg takes six more weeks: 42 days.
    const forecast = forecastTarget(weekly(60, 60.5, 61), 64);

    expect(forecast).toMatchObject({ status: 'projected', date: '2026-12-02' });
    expect(forecast.status === 'projected' && forecast.changePerWeek).toBeCloseTo(0.5);
  });

  it('uses the trend of all recent readings, not just the last two', () => {
    // The last two readings alone would suggest 2 kg a week; the fitted line says 0.85 kg.
    const forecast = forecastTarget(weekly(80, 78.5, 79, 77), 70);

    expect(forecast.status).toBe('projected');
    expect(forecast.status === 'projected' && forecast.changePerWeek).toBeCloseTo(-0.85, 2);
  });

  it('only looks at the last weeks', () => {
    const older: SeriesPoint[] = [
      { date: '2026-06-01', value: 90 },
      { date: '2026-06-08', value: 95 },
    ];
    // Rising long ago, but falling by a kilogram a week for the last 3 weeks.
    const recent = weekly(80, 79, 78, 77);

    const forecast = forecastTarget([...older, ...recent], 70);

    expect(forecast.status).toBe('projected');
    expect(forecast.status === 'projected' && forecast.changePerWeek).toBeCloseTo(-1);
  });

  it('says the target is reached once the value has got there', () => {
    expect(forecastTarget(weekly(80, 74, 69.5), 70)).toEqual({ status: 'reached' });
    expect(forecastTarget(weekly(60, 63, 66.5), 66)).toEqual({ status: 'reached' });
  });

  it('needs readings that are at least a week apart', () => {
    expect(forecastTarget([], 70)).toEqual({ status: 'not-enough-data' });
    expect(forecastTarget(weekly(80), 70)).toEqual({ status: 'not-enough-data' });
    expect(
      forecastTarget(
        [
          { date: '2026-10-20', value: 80 },
          { date: '2026-10-21', value: 79 },
        ],
        70,
      ),
    ).toEqual({ status: 'not-enough-data' });
  });

  it('says so when the trend moves away from the target', () => {
    const forecast = forecastTarget(weekly(78, 79, 80), 70);

    expect(forecast.status).toBe('not-approaching');
    expect(forecast.status === 'not-approaching' && forecast.changePerWeek).toBeCloseTo(1);
  });

  it('says so when the value stands still', () => {
    expect(forecastTarget(weekly(80, 80, 80), 70).status).toBe('not-approaching');
    expect(forecastTarget(weekly(80, 79.98, 79.96), 70).status).toBe('not-approaching');
  });

  it('does not promise a date more than two years away', () => {
    // 60 g a week from 79.88 kg to 70 kg would take over three years.
    expect(forecastTarget(weekly(80, 79.94, 79.88), 70).status).toBe('too-far');
  });
});
