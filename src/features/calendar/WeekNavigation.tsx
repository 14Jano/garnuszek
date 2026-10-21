import { Link } from 'react-router-dom';
import { calendarPath } from '../../app/navigation';
import { WeekSwitcher } from '../../components/WeekSwitcher';
import { dayOfMonth, weekDays, weekdayShortName } from '../../domain/plan/dates';
import type { DateKey } from '../../domain/plan/dates';
import './WeekNavigation.css';

interface WeekNavigationProps {
  selected: DateKey;
  today: DateKey;
  /** Days of the shown week that already have at least one planned meal. */
  plannedDays: ReadonlySet<DateKey>;
}

export function WeekNavigation({ selected, today, plannedDays }: WeekNavigationProps) {
  return (
    <nav className="week-nav" aria-label="Wybór dnia">
      <WeekSwitcher selected={selected} today={today} pathFor={calendarPath.day} />

      <ul className="week-nav__days">
        {weekDays(selected).map((day) => (
          <li key={day}>
            <Link
              className="week-nav__day"
              to={calendarPath.day(day)}
              aria-current={day === selected ? 'date' : undefined}
            >
              <span>{weekdayShortName(day)}</span>{' '}
              <span className="week-nav__number">{dayOfMonth(day)}</span>
              {day === today && <span className="visually-hidden">, dziś</span>}
              {plannedDays.has(day) && (
                <>
                  <span className="week-nav__dot" aria-hidden="true" />
                  <span className="visually-hidden">, zaplanowane posiłki</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
