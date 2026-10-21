import { INGREDIENT_CATALOG } from '../../content/catalog';
import type { Member } from '../../domain/household/member';
import { dailyCalorieTarget } from '../../domain/nutrition/calorieTarget';
import type { DateKey } from '../../domain/plan/dates';
import type { PlanEntry } from '../../domain/plan/planEntry';
import { dayTotals, planMeal } from '../../domain/plan/portions';
import type { PlannedMeal } from '../../domain/plan/portions';
import { MEAL_TYPES } from '../../domain/recipes/recipe';
import type { MealType } from '../../domain/recipes/recipe';
import type { RecipeEntry } from '../../hooks/useRecipeEntries';
import { MealSlot } from './MealSlot';

interface DayPlanProps {
  date: DateKey;
  household: readonly Member[];
  recipes: readonly RecipeEntry[];
  /** Only the planned meals of this day. */
  entries: readonly PlanEntry[];
  onSetEaters: (mealType: MealType, memberIds: string[]) => void;
  onRemove: (mealType: MealType) => void;
}

/** The three meal slots of a day, sized for the household, with a calorie summary. */
export function DayPlan({
  date,
  household,
  recipes,
  entries,
  onSetEaters,
  onRemove,
}: DayPlanProps) {
  const recipeById = new Map(recipes.map(({ recipe }) => [recipe.id, recipe]));

  const slots = MEAL_TYPES.map((mealType) => {
    const entry = entries.find((candidate) => candidate.mealType === mealType);
    const recipe = entry && recipeById.get(entry.recipeId);
    const meal =
      entry && recipe ? planMeal(entry, recipe, household, INGREDIENT_CATALOG) : undefined;
    return { mealType, entry, meal };
  });

  const plannedMeals = slots.flatMap(({ meal }) => (meal ? [meal] : []));

  return (
    <>
      {slots.map(({ mealType, entry, meal }) => (
        <MealSlot
          key={mealType}
          date={date}
          mealType={mealType}
          household={household}
          entry={entry}
          meal={meal}
          onSetEaters={(memberIds) => onSetEaters(mealType, memberIds)}
          onRemove={() => onRemove(mealType)}
        />
      ))}

      <DaySummary meals={plannedMeals} household={household} />
    </>
  );
}

interface DaySummaryProps {
  meals: readonly PlannedMeal[];
  household: readonly Member[];
}

/** What each person eats on the day compared with their daily target. */
function DaySummary({ meals, household }: DaySummaryProps) {
  const totals = dayTotals(meals);
  const eaters = household.filter((member) => totals.has(member.id));
  if (eaters.length === 0) return null;

  return (
    <section className="day-summary" aria-labelledby="day-summary-title">
      <h3 id="day-summary-title">Podsumowanie dnia</h3>
      <ul>
        {eaters.map((member) => (
          <li key={member.id}>
            {member.name}: {Math.round(totals.get(member.id)?.kcal ?? 0)} z{' '}
            {dailyCalorieTarget(member)} kcal
          </li>
        ))}
      </ul>
    </section>
  );
}
