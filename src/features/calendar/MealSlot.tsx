import { useId } from 'react';
import { Link } from 'react-router-dom';
import { calendarPath, recipePath } from '../../app/navigation';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import type { Member } from '../../domain/household/member';
import type { DateKey } from '../../domain/plan/dates';
import type { PlanEntry } from '../../domain/plan/planEntry';
import type { PlannedMeal } from '../../domain/plan/portions';
import { requireIngredient } from '../../domain/recipes/ingredient';
import type { MealType } from '../../domain/recipes/recipe';
import { MEAL_TYPE_LABELS } from '../../content/labels';
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
  onSetEaters: (memberIds: string[]) => void;
  onRemove: () => void;
}

export function MealSlot({
  date,
  mealType,
  household,
  entry,
  meal,
  onSetEaters,
  onRemove,
}: MealSlotProps) {
  const headingId = useId();
  const label = MEAL_TYPE_LABELS[mealType];

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
            <>
              <ul className="meal-slot__portions">
                {meal.portions.map(({ member, servings, nutrition }) => (
                  <li key={member.id}>
                    {member.name}: {formatServings(servings)}, {Math.round(nutrition.kcal)} kcal
                  </li>
                ))}
              </ul>
              <p className="meal-slot__total">
                Do ugotowania: {formatServings(meal.totalServings)}
              </p>
              <details className="meal-slot__ingredients">
                <summary>Składniki dla wszystkich</summary>
                <ul>
                  {meal.ingredients.map(({ ingredientId, grams }) => (
                    <li key={ingredientId}>
                      {requireIngredient(ingredientId, INGREDIENT_CATALOG).name}:{' '}
                      {formatGrams(grams)}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}

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
        </>
      )}
    </section>
  );
}
