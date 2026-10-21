import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayOfMonth,
  formatDayHeading,
  formatWeekRange,
  isDateKey,
  parseDateKey,
  startOfWeek,
  toDateKey,
  todayKey,
  weekDays,
  weekdayName,
  weekdayShortName,
} from './dates';

// 2026-10-21 is a Wednesday. The clocks go back on Sunday 2026-10-25.

describe('parseDateKey', () => {
  it('reads a real day', () => {
    const date = parseDateKey('2026-10-21');

    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(21);
  });

  it.each(['', '2026-1-5', '21-10-2026', '2026-13-01', '2026-02-31', '2026-00-10', 'wtorek'])(
    'rejects "%s"',
    (text) => {
      expect(parseDateKey(text)).toBeNull();
      expect(isDateKey(text)).toBe(false);
    },
  );

  it('knows about leap years', () => {
    expect(isDateKey('2028-02-29')).toBe(true);
    expect(isDateKey('2026-02-29')).toBe(false);
  });
});

describe('toDateKey and todayKey', () => {
  it('formats the local day with leading zeros', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('round-trips through parseDateKey', () => {
    expect(toDateKey(parseDateKey('2026-10-21') ?? new Date(0))).toBe('2026-10-21');
  });

  it('uses the given moment as "now"', () => {
    expect(todayKey(new Date(2026, 9, 21, 23, 59))).toBe('2026-10-21');
  });
});

describe('addDays', () => {
  it('moves forward and backward by calendar days', () => {
    expect(addDays('2026-10-21', 1)).toBe('2026-10-22');
    expect(addDays('2026-10-21', -21)).toBe('2026-09-30');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('is not thrown off when the clocks change', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });

  it('rejects an invalid key', () => {
    expect(() => addDays('nonsense', 1)).toThrow(RangeError);
  });
});

describe('weeks', () => {
  it('start on Monday', () => {
    expect(startOfWeek('2026-10-21')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26');
  });

  it('list seven days from Monday to Sunday, including the day the clocks change', () => {
    expect(weekDays('2026-10-21')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });

  it('can span two months or two years', () => {
    expect(weekDays('2026-10-28')[6]).toBe('2026-11-01');
    expect(weekDays('2026-12-30')).toContain('2027-01-03');
  });
});

describe('Polish names', () => {
  it('names the weekday', () => {
    expect(weekdayName('2026-10-21')).toBe('środa');
    expect(weekdayName('2026-10-25')).toBe('niedziela');
    expect(weekdayShortName('2026-10-19')).toBe('pon.');
    expect(weekdayShortName('2026-10-24')).toBe('sob.');
  });

  it('gives the day of the month', () => {
    expect(dayOfMonth('2026-10-05')).toBe(5);
  });

  it('writes a day heading', () => {
    expect(formatDayHeading('2026-10-21')).toBe('środa, 21 października');
    expect(formatDayHeading('2026-03-01')).toBe('niedziela, 1 marca');
  });

  it('writes a week range', () => {
    expect(formatWeekRange('2026-10-21')).toBe('19–25 października');
    expect(formatWeekRange('2026-10-28')).toBe('26 października – 1 listopada');
    expect(formatWeekRange('2026-12-30')).toBe('28 grudnia 2026 – 3 stycznia 2027');
  });
});
