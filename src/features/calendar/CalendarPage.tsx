import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ROUTES, shoppingPath } from '../../app/navigation';
import { removePlanEntry, setBatchDays, setEaters } from '../../data/planRepository';
import { setSnackOverride } from '../../data/snackRepository';
import { MAX_BATCH_DAYS } from '../../domain/plan/batches';
import { addDays, formatDayHeading, isDateKey, todayKey, weekDays } from '../../domain/plan/dates';
import type { MealType } from '../../domain/recipes/recipe';
import { useMembers } from '../../hooks/useMembers';
import { usePlanEntries } from '../../hooks/usePlanEntries';
import { useRecipeEntries } from '../../hooks/useRecipeEntries';
import { useSnackOverrides } from '../../hooks/useSnackOverrides';
import { DayPlan } from './DayPlan';
import { WeekNavigation } from './WeekNavigation';
import './CalendarPage.css';

export function CalendarPage() {
  const { date } = useParams();
  const today = todayKey();
  const selected = date ?? today;
  // The hooks below must run on every render, so fall back to today for a bad address.
  const days = weekDays(isDateKey(selected) ? selected : today);
  const firstDay = days[0] ?? today;
  const lastDay = days[6] ?? today;
  // A dish cooked on the last day of the week can be eaten for a few days after it.
  const horizon = addDays(lastDay, MAX_BATCH_DAYS - 1);

  const household = useMembers();
  const recipes = useRecipeEntries();
  const weekEntries = usePlanEntries(firstDay, horizon);
  const snackOverrides = useSnackOverrides(firstDay, horizon);
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
    if (
      household === undefined ||
      recipes === undefined ||
      weekEntries === undefined ||
      snackOverrides === undefined
    ) {
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
        entries={weekEntries}
        snackOverrides={snackOverrides}
        onSetEaters={(mealType: MealType, memberIds: string[]) =>
          void run(() => setEaters(selected, mealType, memberIds))
        }
        onRemove={(mealType: MealType) => void run(() => removePlanEntry(selected, mealType))}
        onSetBatchDays={(mealType: MealType, batchDays: number) =>
          void run(() => setBatchDays(selected, mealType, batchDays))
        }
        onSetSnacks={(memberId, kcal) => void run(() => setSnackOverride(selected, memberId, kcal))}
      />
    );
  }

  return (
    <section>
      <h1>Kalendarz posiłków</h1>

      <WeekNavigation
        selected={selected}
        today={today}
        plannedDays={
          new Set(weekEntries?.filter((entry) => entry.date <= lastDay).map((entry) => entry.date))
        }
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
