import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { addDays, formatWeekRange } from '../domain/plan/dates';
import type { DateKey } from '../domain/plan/dates';
import './WeekSwitcher.css';

interface WeekSwitcherProps {
  /** Any day of the week that is shown. */
  selected: DateKey;
  today: DateKey;
  /** Address of the screen for the given day, so each screen links to itself. */
  pathFor: (date: DateKey) => string;
}

/** Previous and next week, the shown week and a way back to today. */
export function WeekSwitcher({ selected, today, pathFor }: WeekSwitcherProps) {
  return (
    <div className="week-switcher">
      <Link
        className="week-switcher__step"
        to={pathFor(addDays(selected, -7))}
        aria-label="Poprzedni tydzień"
      >
        <ChevronLeft aria-hidden="true" size={22} />
      </Link>
      <p className="week-switcher__range">{formatWeekRange(selected)}</p>
      <Link
        className="week-switcher__step"
        to={pathFor(addDays(selected, 7))}
        aria-label="Następny tydzień"
      >
        <ChevronRight aria-hidden="true" size={22} />
      </Link>
      <Link className="btn btn--small" to={pathFor(today)}>
        Dziś
      </Link>
    </div>
  );
}
