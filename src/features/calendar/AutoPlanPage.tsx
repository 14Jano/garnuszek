import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES, calendarPath, recipePath } from '../../app/navigation';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import { MEAL_TYPE_LABELS, MEAL_TYPE_PLURAL_LABELS } from '../../content/labels';
import { applySuggestions } from '../../data/planRepository';
import { autoPlan } from '../../domain/plan/autoPlan';
import {
  formatDayHeading,
  formatWeekRange,
  isDateKey,
  todayKey,
  weekDays,
} from '../../domain/plan/dates';
import { planEntryKey } from '../../domain/plan/planEntry';
import { MEAL_TYPES } from '../../domain/recipes/recipe';
import type { MealType } from '../../domain/recipes/recipe';
import { pluralPl } from '../../format/plural';
import { useMembers } from '../../hooks/useMembers';
import { usePlanEntries } from '../../hooks/usePlanEntries';
import { useRecipeEntries } from '../../hooks/useRecipeEntries';
import './AutoPlanPage.css';

const MEALS = ['posiłek', 'posiłki', 'posiłków'] as const;

function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Proposes dishes for the empty meals of a week, to be looked over before they are saved. */
export function AutoPlanPage() {
  const { date } = useParams();
  const navigate = useNavigate();
  const members = useMembers();
  const recipes = useRecipeEntries();

  const validDate = date !== undefined && isDateKey(date);
  // The hooks run on every render, so a bad address falls back to this week until it is caught below.
  const days = weekDays(validDate ? date : todayKey());
  const firstDay = days[0] ?? '';
  const lastDay = days[6] ?? '';
  const entries = usePlanEntries(firstDay, lastDay);

  const [mealTypes, setMealTypes] = useState<readonly MealType[]>(MEAL_TYPES);
  const [seed, setSeed] = useState(newSeed);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  // The same inputs always give the same plan, and it is cheap, so it is simply worked out again.
  const plan =
    members && recipes && entries && members.length > 0
      ? autoPlan({
          days,
          mealTypes,
          household: members,
          recipes,
          existing: entries,
          catalog: INGREDIENT_CATALOG,
          seed,
        })
      : undefined;

  if (!validDate) {
    return (
      <section>
        <h1>Nie ma takiego tygodnia</h1>
        <p>
          Sprawdź adres albo <Link to={ROUTES.calendar}>wróć do kalendarza</Link>.
        </p>
      </section>
    );
  }

  if (members === undefined || recipes === undefined || entries === undefined) {
    return <p>Wczytywanie…</p>;
  }

  if (members.length === 0 || !plan) {
    return (
      <section>
        <h1>Ułóż tydzień</h1>
        <p>
          Najpierw dodaj domowników, bo na ich podstawie dobieramy dania i liczymy porcje.{' '}
          <Link to={ROUTES.household}>Przejdź do domowników</Link>.
        </p>
      </section>
    );
  }

  const recipeNames = new Map(recipes.map(({ recipe }) => [recipe.id, recipe.name]));
  const suggested = new Map(
    plan.suggestions.map(({ date: day, mealType, recipeId }) => [
      planEntryKey(day, mealType),
      recipeId,
    ]),
  );
  const planned = new Map(
    entries.map((entry) => [planEntryKey(entry.date, entry.mealType), entry.recipeId]),
  );

  function toggleMeal(mealType: MealType, wanted: boolean) {
    setMealTypes(
      MEAL_TYPES.filter((type) => (type === mealType ? wanted : mealTypes.includes(type))),
    );
  }

  async function save() {
    if (!plan || !members) return;

    setSaveFailed(false);
    setSaving(true);
    try {
      await applySuggestions(
        plan.suggestions,
        members.map((member) => member.id),
      );
      void navigate(calendarPath.day(date ?? ''));
    } catch (error) {
      console.error('Could not save the planned week', error);
      setSaveFailed(true);
      setSaving(false);
    }
  }

  const toSave = plan.suggestions.length;

  return (
    <section className="auto-plan">
      <h1>Ułóż tydzień</h1>
      <p className="lead">{formatWeekRange(firstDay)}</p>
      <p>
        Garnuszek dobierze dania do pustych miejsc w tym tygodniu. To, co już zaplanowałeś, zostaje
        bez zmian. Pomija dania, których ktoś z domowników unika, i nie powtarza dania, dopóki są
        inne do wyboru. Plan możesz losować do skutku, a zapisuje się dopiero po kliknięciu.
      </p>

      <fieldset className="field">
        <legend className="field__label">Które posiłki ułożyć?</legend>
        <div className="choice-group">
          {MEAL_TYPES.map((mealType) => (
            <label key={mealType} className="choice">
              <input
                type="checkbox"
                checked={mealTypes.includes(mealType)}
                onChange={(event) => toggleMeal(mealType, event.target.checked)}
              />
              {MEAL_TYPE_PLURAL_LABELS[mealType]}
            </label>
          ))}
        </div>
      </fieldset>

      {saveFailed && (
        <p className="form-error" role="alert">
          Nie udało się zapisać planu. Spróbuj ponownie.
        </p>
      )}

      <p className="auto-plan__summary" role="status">
        {mealTypes.length === 0
          ? 'Wybierz, które posiłki ułożyć.'
          : toSave === 0 && plan.gaps.length === 0
            ? 'W tym tygodniu nie ma pustych miejsc do uzupełnienia.'
            : `Do zapisania: ${toSave} ${pluralPl(toSave, MEALS)}.${
                plan.kept > 0 ? ` Zajęte miejsca zostają: ${plan.kept}.` : ''
              }${plan.gaps.length > 0 ? ` Bez dania zostaje: ${plan.gaps.length}.` : ''}`}
      </p>

      {plan.gaps.length > 0 && (
        <p className="auto-plan__gaps">
          Dla części miejsc nie ma dania, które pasuje wszystkim domownikom, a przy tym daje każdemu
          sensowną porcję. Dodaj <Link to={recipePath.create}>własne przepisy</Link> albo zmień to,
          czego domownicy unikają.
        </p>
      )}

      <div className="auto-plan__actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={toSave === 0 || saving}
          onClick={() => void save()}
        >
          Zapisz w planie
        </button>
        <button
          type="button"
          className="btn"
          disabled={saving}
          onClick={() => setSeed((current) => current + 1)}
        >
          Wylosuj ponownie
        </button>
        <Link className="btn auto-plan__cancel" to={calendarPath.day(date)}>
          Anuluj
        </Link>
      </div>

      <h2>Propozycja</h2>
      <ol className="auto-plan__days">
        {days.map((day) => (
          <li key={day} className="auto-plan__day">
            <h3>{formatDayHeading(day)}</h3>
            <ul className="auto-plan__meals">
              {MEAL_TYPES.filter((mealType) => mealTypes.includes(mealType)).map((mealType) => {
                const key = planEntryKey(day, mealType);
                const label = MEAL_TYPE_LABELS[mealType];
                const keptId = planned.get(key);
                const chosenId = suggested.get(key);

                if (keptId !== undefined) {
                  return (
                    <li key={mealType} className="auto-plan__meal auto-plan__meal--kept">
                      {label}: {recipeNames.get(keptId) ?? 'danie, którego już nie ma'}{' '}
                      <span className="auto-plan__tag">(już zaplanowane)</span>
                    </li>
                  );
                }
                if (chosenId !== undefined) {
                  return (
                    <li key={mealType} className="auto-plan__meal">
                      {label}: <strong>{recipeNames.get(chosenId)}</strong>
                    </li>
                  );
                }
                return (
                  <li key={mealType} className="auto-plan__meal auto-plan__meal--gap">
                    {label}: brak pasującego dania
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
