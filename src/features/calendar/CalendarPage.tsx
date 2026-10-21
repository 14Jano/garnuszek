import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ROUTES, shoppingPath } from '../../app/navigation';
import { removePlanEntry, setEaters } from '../../data/planRepository';
import { formatDayHeading, isDateKey, todayKey, weekDays } from '../../domain/plan/dates';
import type { MealType } from '../../domain/recipes/recipe';
import { useMembers } from '../../hooks/useMembers';
import { usePlanEntries } from '../../hooks/usePlanEntries';
import { useRecipeEntries } from '../../hooks/useRecipeEntries';
import { DayPlan } from './DayPlan';
import { WeekNavigation } from './WeekNavigation';
import './CalendarPage.css';

export function CalendarPage() {
  const { date } = useParams();
  const today = todayKey();
  const selected = date ?? today;
  // The hooks below must run on every render, so fall back to today for a bad address.
  const days = weekDays(isDateKey(selected) ? selected : today);

  const household = useMembers();
  const recipes = useRecipeEntries();
  const weekEntries = usePlanEntries(days[0] ?? today, days[6] ?? today);
  const [actionFailed, setActionFailed] = useState(false);

  if (!isDateKey(selected)) {
    return <Navigate to={`${ROUTES.calendar}/${today}`} replace />;
  }

  async function run(action: () => Promise<void>) {
    setActionFailed(false);
    try {
      await action();
    } catch (error) {
      console.error('Could not update the meal plan', error);
      setActionFailed(true);
    }
  }

  function renderDay() {
    if (household === undefined || recipes === undefined || weekEntries === undefined) {
      return <p>Wczytywanie…</p>;
    }

    if (household.length === 0) {
      return (
        <p className="calendar-empty">
          Żeby zaplanować posiłki, najpierw dodaj domowników, bo na ich podstawie liczymy porcje.{' '}
          <Link to={ROUTES.household}>Przejdź do domowników</Link>.
        </p>
      );
    }

    return (
      <DayPlan
        date={selected}
        household={household}
        recipes={recipes}
        entries={weekEntries.filter((entry) => entry.date === selected)}
        onSetEaters={(mealType: MealType, memberIds: string[]) =>
          void run(() => setEaters(selected, mealType, memberIds))
        }
        onRemove={(mealType: MealType) => void run(() => removePlanEntry(selected, mealType))}
      />
    );
  }

  return (
    <section>
      <h1>Kalendarz posiłków</h1>

      <WeekNavigation
        selected={selected}
        today={today}
        plannedDays={new Set(weekEntries?.map((entry) => entry.date))}
      />

      <p className="calendar-shopping-link">
        <Link to={shoppingPath.week(selected)}>Lista zakupów na ten tydzień</Link>
      </p>

      <h2>{formatDayHeading(selected)}</h2>

      {actionFailed && (
        <p className="form-error" role="alert">
          Nie udało się zapisać zmiany. Spróbuj ponownie.
        </p>
      )}

      {renderDay()}
    </section>
  );
}
