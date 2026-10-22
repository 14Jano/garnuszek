import { describe, expect, it } from 'vitest';
import { forecastText } from './forecastText';

describe('forecastText', () => {
  it('congratulates on a reached target', () => {
    expect(forecastText({ status: 'reached' })).toBe('Cel osiągnięty. Gratulacje!');
  });

  it('gives the date and the pace when there is a projection', () => {
    const text = forecastText({ status: 'projected', date: '2026-12-12', changePerWeek: -0.9 });

    expect(text).toBe(
      'Jeśli tempo się utrzyma (−0,9 kg na tydzień), cel osiągniesz około 12 grudnia 2026.',
    );
  });

  it('shows a gain with a plus sign', () => {
    const text = forecastText({ status: 'projected', date: '2027-01-05', changePerWeek: 0.4 });

    expect(text).toContain('(+0,4 kg na tydzień)');
  });

  it.each([
    [{ status: 'too-far', changePerWeek: -0.06 } as const, /dalej niż za dwa lata/],
    [{ status: 'not-approaching', changePerWeek: 0.2 } as const, /nie zbliża się do celu/],
    [{ status: 'not-enough-data' } as const, /co najmniej dwa pomiary/],
  ])('explains why there is no date (%j)', (forecast, message) => {
    expect(forecastText(forecast)).toMatch(message);
  });
});
