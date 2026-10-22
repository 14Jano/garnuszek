import { useId } from 'react';
import { Link } from 'react-router-dom';
import { calendarPath, recipePath } from '../../app/navigation';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import { describeConflicts } from '../../content/conflictText';
import { MEAL_TYPE_LABELS } from '../../content/labels';
import type { Member } from '../../domain/household/member';
import { conflictsForMembers } from '../../domain/household/restrictions';
import { MAX_BATCH_DAYS } from '../../domain/plan/batches';
import type { BatchSummary } from '../../domain/plan/batches';
import { formatDayHeading } from '../../domain/plan/dates';
import type { DateKey } from '../../domain/plan/dates';
import { isLeftover } from '../../domain/plan/planEntry';
import type { PlanEntry } from '../../domain/plan/planEntry';
import type { PlannedMeal } from '../../domain/plan/portions';
import { requireIngredient } from '../../domain/recipes/ingredient';
import type { MealType } from '../../domain/recipes/recipe';
import { formatGrams } from '../../format/amounts';
import { formatServings } from './format';
import './MealSlot.css';

interface MealSlotProps {
  date: DateKey;
  mealType: MealType;
  household: readonly Member[];
  /** What is planned in this slot, if anything. */
  entry: PlanEntry | undefined;
  /** The planned meal sized for each eater. Missing when the recipe can no longer be found. */
  meal: PlannedMeal | undefined;
  /** What cooking the dish involves over all the days it is eaten. Not given for leftovers. */
  batch: BatchSummary | undefined;
  onSetEaters: (memberIds: string[]) => void;
  onRemove: () => void;
  onSetBatchDays: (days: number) => void;
}

export function MealSlot({
  date,
  mealType,
  household,
  entry,
  meal,
  batch,
  onSetEaters,
  onRemove,
  onSetBatchDays,
}: MealSlotProps) {
  const headingId = useId();
  const batchSelectId = useId();
  const label = MEAL_TYPE_LABELS[mealType];

  // Whoever eats the dish and avoids something in it, e.g. after the eaters were changed.
  const clashes =
    entry && meal
      ? conflictsForMembers(
          meal.recipe,
          household.filter((member) => entry.memberIds.includes(member.id)),
          INGREDIENT_CATALOG,
        )
      : [];

  return (
    <section className="meal-slot" aria-labelledby={headingId}>
      <h3 id={headingId} className="meal-slot__title">
        {label}
      </h3>

      {!entry && (
        <Link
          className="btn btn--small"
          to={calendarPath.pickRecipe(date, mealType)}
          aria-label={`Dodaj danie: ${label}`}
        >
          Dodaj danie
        </Link>
      )}

      {entry && !meal && (
        <>
          <p>Nie znaleziono przepisu, który był tu zaplanowany.</p>
          <div className="meal-slot__actions">
            <Link
              className="btn btn--small"
              to={calendarPath.pickRecipe(date, mealType)}
              aria-label={`Wybierz inne danie: ${label}`}
            >
              Wybierz inne danie
            </Link>
            <button
              type="button"
              className="btn btn--small"
              aria-label={`Usuń: ${label}`}
              onClick={onRemove}
            >
              Usuń
            </button>
          </div>
        </>
      )}

      {entry && meal && (
        <>
          <p className="meal-slot__recipe">
            <Link to={recipePath.details(meal.recipe.id)}>{meal.recipe.name}</Link>
          </p>

          {clashes.length > 0 && (
            <div className="meal-slot__warning" role="note">
              <p>
                <strong>Uwaga:</strong> w tym daniu jest coś, czego unikają:
              </p>
              <ul>
                {clashes.map(({ member, conflicts }) => (
                  <li key={member.id}>
                    {member.name}: {describeConflicts(conflicts)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.cookedOn !== undefined && (
            <p className="meal-slot__leftover">
              Resztki z: {formatDayHeading(entry.cookedOn)}. Nic nie gotujesz.{' '}
              <Link to={calendarPath.day(entry.cookedOn)}>Przejdź do ugotowanego dania</Link>
            </p>
          )}

          <fieldset className="meal-slot__eaters">
            <legend>Kto je</legend>
            {household.map((member) => (
              <label key={member.id} className="choice">
                <input
                  type="checkbox"
                  checked={entry.memberIds.includes(member.id)}
                  onChange={(event) =>
                    onSetEaters(
                      household
                        .filter((other) =>
                          other.id === member.id
                            ? event.target.checked
                            : entry.memberIds.includes(other.id),
                        )
                        .map((other) => other.id),
                    )
                  }
                />
                {member.name}
              </label>
            ))}
          </fieldset>

          {meal.portions.length === 0 ? (
            <p className="meal-slot__empty">Nikt nie je tego posiłku.</p>
          ) : (
            <ul className="meal-slot__portions">
              {meal.portions.map(({ member, servings, nutrition }) => (
                <li key={member.id}>
                  {member.name}: {formatServings(servings)}, {Math.round(nutrition.kcal)} kcal
                </li>
              ))}
            </ul>
          )}

          {batch && (
            <>
              <p className="meal-slot__total">
                Do ugotowania: {formatServings(batch.totalServings)}
                {batch.days > 1 && ` (na ${batch.days} dni)`}
              </p>
              <details className="meal-slot__ingredients">
                <summary>Składniki dla wszystkich</summary>
                <ul>
                  {batch.ingredients.map(({ ingredientId, grams }) => (
                    <li key={ingredientId}>
                      {requireIngredient(ingredientId, INGREDIENT_CATALOG).name}:{' '}
                      {formatGrams(grams)}
                    </li>
                  ))}
                </ul>
              </details>

              <div className="meal-slot__batch">
                <label htmlFor={batchSelectId}>Gotuj na</label>
                <select
                  id={batchSelectId}
                  className="input"
                  value={batch.days}
                  onChange={(event) => onSetBatchDays(Number(event.target.value))}
                >
                  {Array.from({ length: MAX_BATCH_DAYS }, (_, index) => index + 1).map((days) => (
                    <option key={days} value={days}>
                      {days === 1 ? '1 dzień' : `${days} dni`}
                    </option>
                  ))}
                </select>
                {batch.days > 1 && (
                  <p className="meal-slot__hint">
                    Resztki zjecie do: {formatDayHeading(batch.lastDay)}.
                  </p>
                )}
              </div>
            </>
          )}

          {!isLeftover(entry) && (
            <div className="meal-slot__actions">
              <Link
                className="btn btn--small"
                to={calendarPath.pickRecipe(date, mealType)}
                aria-label={`Wymień: ${meal.recipe.name}`}
              >
                Wymień
              </Link>
              <button
                type="button"
                className="btn btn--small"
                aria-label={`Usuń: ${label}`}
                onClick={onRemove}
              >
                Usuń
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
