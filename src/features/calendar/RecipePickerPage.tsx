import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES, calendarPath } from '../../app/navigation';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import { describeConflicts } from '../../content/conflictText';
import { assignRecipe } from '../../data/planRepository';
import { conflictsForMembers, hasRestrictions } from '../../domain/household/restrictions';
import { formatDayHeading, isDateKey } from '../../domain/plan/dates';
import { NO_FILTER, filterRecipes } from '../../domain/recipes/filterRecipes';
import { MEAL_TYPES, nutritionPerServing } from '../../domain/recipes/recipe';
import { useMembers } from '../../hooks/useMembers';
import { usePlanEntries } from '../../hooks/usePlanEntries';
import { useRecipeEntries } from '../../hooks/useRecipeEntries';
import { MEAL_TYPE_LABELS } from '../../content/labels';
import './RecipePickerPage.css';

/** Lets the user choose a dish for a meal slot, or swap the one that is already there. */
export function RecipePickerPage() {
  const { date, mealType: mealParam } = useParams();
  const navigate = useNavigate();
  const members = useMembers();
  const recipes = useRecipeEntries();
  const dayEntries = usePlanEntries(date ?? '', date ?? '');
  const [query, setQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  // On by default, so a dish someone avoids is not proposed unless the user asks to see it.
  const [hideClashing, setHideClashing] = useState(true);
  const [saveFailed, setSaveFailed] = useState(false);

  const mealType = MEAL_TYPES.find((type) => type === mealParam);

  if (!date || !isDateKey(date) || !mealType) {
    return (
      <section>
        <h1>Nie ma takiego posiłku</h1>
        <p>
          Sprawdź adres albo <Link to={ROUTES.calendar}>wróć do kalendarza</Link>.
        </p>
      </section>
    );
  }

  if (members === undefined || recipes === undefined || dayEntries === undefined) {
    return <p>Wczytywanie…</p>;
  }

  const current = dayEntries.find((entry) => entry.mealType === mealType);
  const currentRecipeId = current?.recipeId;
  const heading = currentRecipeId ? 'Wymień danie' : 'Wybierz danie';

  // Leftovers belong to a dish cooked on another day, so the dish is changed there.
  if (current?.cookedOn !== undefined) {
    return (
      <section>
        <h1>To są resztki</h1>
        <p>
          Danie z tego dnia ugotowano wcześniej, więc tutaj nie da się go zmienić.{' '}
          <Link to={calendarPath.day(current.cookedOn)}>Przejdź do dnia, w którym je gotujesz</Link>
          .
        </p>
      </section>
    );
  }

  if (members.length === 0) {
    return (
      <section>
        <h1>{heading}</h1>
        <p>
          Najpierw dodaj domowników, bo na ich podstawie liczymy porcje.{' '}
          <Link to={ROUTES.household}>Przejdź do domowników</Link>.
        </p>
      </section>
    );
  }

  const memberIds = members.map((member) => member.id);
  // Whoever will eat the dish: those already set for this slot, or everyone for an empty one.
  const eaters = current
    ? members.filter((member) => current.memberIds.includes(member.id))
    : members;
  const hasRestrictedEaters = eaters.some((member) => hasRestrictions(member.restrictions));

  // Favorites first; the sort is stable, so the original order is kept within each group.
  const found = filterRecipes(
    recipes,
    { ...NO_FILTER, query, mealType, favoritesOnly },
    INGREDIENT_CATALOG,
  )
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
    .map((entry) => ({
      ...entry,
      clashes: conflictsForMembers(entry.recipe, eaters, INGREDIENT_CATALOG),
    }));
  const choices = hideClashing ? found.filter(({ clashes }) => clashes.length === 0) : found;
  const hiddenCount = found.length - choices.length;

  async function choose(recipeId: string) {
    if (!date || !mealType) return;

    setSaveFailed(false);
    try {
      await assignRecipe(date, mealType, recipeId, memberIds);
      void navigate(calendarPath.day(date));
    } catch (error) {
      console.error('Could not plan the meal', error);
      setSaveFailed(true);
    }
  }

  return (
    <section>
      <h1>{heading}</h1>
      <p className="lead">
        {MEAL_TYPE_LABELS[mealType]}, {formatDayHeading(date)}
      </p>

      <p>
        <Link className="btn picker-cancel" to={calendarPath.day(date)}>
          Anuluj
        </Link>
      </p>

      {saveFailed && (
        <p className="form-error" role="alert">
          Nie udało się zapisać zmiany. Spróbuj ponownie.
        </p>
      )}

      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <div className="field">
          <label className="field__label" htmlFor="picker-search">
            Szukaj przepisu lub składnika
          </label>
          <input
            id="picker-search"
            className="input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <label className="choice">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.target.checked)}
          />
          Tylko ulubione
        </label>
        {hasRestrictedEaters && (
          <label className="choice">
            <input
              type="checkbox"
              checked={hideClashing}
              onChange={(event) => setHideClashing(event.target.checked)}
            />
            Ukryj dania, których ktoś unika
          </label>
        )}
      </form>

      {hiddenCount > 0 && (
        <p className="picker-note" role="status">
          {hiddenCount === 1
            ? 'Ukryto 1 danie, którego ktoś unika.'
            : `Ukryto dań, których ktoś unika: ${hiddenCount}.`}
        </p>
      )}

      {choices.length === 0 ? (
        <p>
          {hiddenCount > 0
            ? 'Każde pasujące danie zawiera coś, czego ktoś unika, więc wszystkie są ukryte. Odznacz „Ukryj dania, których ktoś unika”, żeby je zobaczyć.'
            : 'Nic nie pasuje do wyszukiwania.'}
        </p>
      ) : (
        <ul className="picker-list">
          {choices.map(({ recipe, favorite, clashes }) => {
            const kcal = Math.round(nutritionPerServing(recipe, INGREDIENT_CATALOG).kcal);

            return (
              <li key={recipe.id} className="picker-item">
                <div>
                  <p className="picker-item__name">{recipe.name}</p>
                  <p className="picker-item__meta">
                    {kcal} kcal na porcję, {recipe.prepMinutes} min
                    {favorite && ', ulubione'}
                    {recipe.id === currentRecipeId && ', obecnie wybrane'}
                  </p>
                  {clashes.map(({ member, conflicts }) => (
                    <p key={member.id} className="picker-item__warning">
                      Uwaga, {member.name}: {describeConflicts(conflicts)}
                    </p>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn--small"
                  aria-label={`Wybierz: ${recipe.name}`}
                  onClick={() => void choose(recipe.id)}
                >
                  Wybierz
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
