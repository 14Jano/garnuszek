/**
 * Calendar days are identified by a "date key" like 2026-10-21: the day as the
 * user sees it on their own clock. Working with plain strings instead of Date
 * objects keeps time zones and daylight saving out of the data we store.
 */
export type DateKey = string;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const WEEKDAY_NAMES = [
  'niedziela',
  'poniedziałek',
  'wtorek',
  'środa',
  'czwartek',
  'piątek',
  'sobota',
] as const;

const WEEKDAY_SHORT_NAMES = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'] as const;

/** Month names in the genitive case, as used after a day number: "21 października". */
const MONTH_NAMES = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
] as const;

/** The date, or null when the text is not a real calendar day (e.g. 2026-02-31). */
export function parseDateKey(key: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // Date silently rolls over impossible days into the next month, so check.
  const isRealDay =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDay ? date : null;
}

export function isDateKey(value: string): boolean {
  return parseDateKey(value) !== null;
}

export function toDateKey(date: Date): DateKey {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = requireDate(key);
  // Moving by calendar days (not 24-hour blocks) stays correct across clock changes.
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** The Monday of the week the day falls in. Weeks run Monday to Sunday. */
export function startOfWeek(key: DateKey): DateKey {
  const daysSinceMonday = (requireDate(key).getDay() + 6) % 7;
  return addDays(key, -daysSinceMonday);
}

/** The seven days, Monday to Sunday, of the week the day falls in. */
export function weekDays(key: DateKey): DateKey[] {
  const monday = startOfWeek(key);
  return Array.from({ length: 7 }, (_, offset) => addDays(monday, offset));
}

export function weekdayName(key: DateKey): string {
  return WEEKDAY_NAMES[requireDate(key).getDay()] ?? '';
}

export function weekdayShortName(key: DateKey): string {
  return WEEKDAY_SHORT_NAMES[requireDate(key).getDay()] ?? '';
}

export function dayOfMonth(key: DateKey): number {
  return requireDate(key).getDate();
}

/** "środa, 21 października" */
export function formatDayHeading(key: DateKey): string {
  const date = requireDate(key);
  return `${weekdayName(key)}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

/** "19–25 października", "26 października – 1 listopada" or, across years, with the years. */
export function formatWeekRange(key: DateKey): string {
  const days = weekDays(key);
  const first = requireDate(days[0] ?? key);
  const last = requireDate(days[6] ?? key);

  const firstMonth = MONTH_NAMES[first.getMonth()];
  const lastMonth = MONTH_NAMES[last.getMonth()];

  if (first.getFullYear() !== last.getFullYear()) {
    return `${first.getDate()} ${firstMonth} ${first.getFullYear()} – ${last.getDate()} ${lastMonth} ${last.getFullYear()}`;
  }
  if (first.getMonth() !== last.getMonth()) {
    return `${first.getDate()} ${firstMonth} – ${last.getDate()} ${lastMonth}`;
  }
  return `${first.getDate()}–${last.getDate()} ${lastMonth}`;
}

function requireDate(key: DateKey): Date {
  const date = parseDateKey(key);
  if (!date) {
    throw new RangeError(`Not a valid date key: ${key}`);
  }
  return date;
}
