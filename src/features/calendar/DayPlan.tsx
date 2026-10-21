import { INGREDIENT_CATALOG } from '../../content/catalog';
import type { Member } from '../../domain/household/member';
import { dailyCalorieTarget } from '../../domain/nutrition/calorieTarget';
import { summarizeBatch } from '../../domain/plan/batches';
import type { DateKey } from '../../domain/plan/dates';
import { isLeftover } from '../../domain/plan/planEntry';
import type { PlanEntry } from '../../domain/plan/planEntry';
import { dayTotals, planMeal } from '../../domain/plan/portions';
import type { PlannedMeal } from '../../domain/plan/portions';
import { effectiveSnackKcal, snackAllowance } from '../../domain/plan/snacks';
import type { SnackAllowance, SnackOverride } from '../../domain/plan/snacks';
import { MEAL_TYPES } from '../../domain/recipes/recipe';
import type { MealType } from '../../domain/recipes/recipe';
import type { RecipeEntry } from '../../hooks/useRecipeEntries';
import { MealSlot } from './MealSlot';
import { SnackSection } from './SnackSection';

interface DayPlanProps {
  date: DateKey;
  household: readonly Member[];
  recipes: readonly RecipeEntry[];
  /**
   * Planned meals of this day and the days around it. The other days are needed
   * to know how long a dish cooked today lasts.
   */
  entries: readonly PlanEntry[];
  /** Snack amounts that were set for particular days, for the same days as `entries`. */
  snackOverrides: readonly SnackOverride[];
  onSetEaters: (mealType: MealType, memberIds: string[]) => void;
  onRemove: (mealType: MealType) => void;
  onSetBatchDays: (mealType: MealType, days: number) => void;
  /** `null` goes back to the person's usual snack amount. */
  onSetSnacks: (memberId: string, kcal: number | null) => void;
}

/** The three meal slots of a day, sized for the household, with snacks and a calorie summary. */
export function DayPlan({
  date,
  household,
  recipes,
  entries,
  snackOverrides,
  onSetEaters,
  onRemove,
  onSetBatchDays,
  onSetSnacks,
}: DayPlanProps) {
  const recipeById = new Map(recipes.map(({ recipe }) => [recipe.id, recipe]));
  const snacks = snackAllowance(snackOverrides);
  const dayEntries = entries.filter((entry) => entry.date === date);

  const slots = MEAL_TYPES.map((mealType) => {
    const entry = dayEntries.find((candidate) => candidate.mealType === mealType);
    const recipe = entry && recipeById.get(entry.recipeId);
    const meal =
      entry && recipe ? planMeal(entry, recipe, household, INGREDIENT_CATALOG, snacks) : undefined;
    const batch =
      entry && recipe && !isLeftover(entry)
        ? summarizeBatch(entry, entries, recipe, household, INGREDIENT_CATALOG, snacks)
        : undefined;
    return { mealType, entry, meal, batch };
  });

  const plannedMeals = slots.flatMap(({ meal }) => (meal ? [meal] : []));

  return (
    <>
      {slots.map(({ mealType, entry, meal, batch }) => (
        <MealSlot
          key={mealType}
          date={date}
          mealType={mealType}
          household={household}
          entry={entry}
          meal={meal}
          batch={batch}
          onSetEaters={(memberIds) => onSetEaters(mealType, memberIds)}
          onRemove={() => onRemove(mealType)}
          onSetBatchDays={(days) => onSetBatchDays(mealType, days)}
        />
      ))}

      <SnackSection
        date={date}
        household={household}
        snacks={snacks}
        overrides={snackOverrides.filter((override) => override.date === date)}
        onChange={onSetSnacks}
      />

      <DaySummary date={date} meals={plannedMeals} household={household} snacks={snacks} />
    </>
  );
}

interface DaySummaryProps {
  date: DateKey;
  meals: readonly PlannedMeal[];
  household: readonly Member[];
  snacks: SnackAllowance;
}

/** What each person eats on the day, snacks included, compared with their daily target. */
function DaySummary({ date, meals, household, snacks }: DaySummaryProps) {
  const totals = dayTotals(meals);
  const eaters = household.filter((member) => totals.has(member.id));
  if (eaters.length === 0) return null;

  return (
    <section className="day-summary" aria-labelledby="day-summary-title">
      <h3 id="day-summary-title">Podsumowanie dnia</h3>
      <ul>
        {eaters.map((member) => {
          const target = dailyCalorieTarget(member);
          const snackKcal = Math.round(effectiveSnackKcal(target, snacks(date, member)));
          const eaten = Math.round((totals.get(member.id)?.kcal ?? 0) + snackKcal);

          return (
            <li key={member.id}>
              {member.name}: {eaten} z {target} kcal
              {snackKcal > 0 && ` (w tym przekąski: ${snackKcal} kcal)`}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
