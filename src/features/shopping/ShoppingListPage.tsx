import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ROUTES, calendarPath, shoppingPath } from '../../app/navigation';
import { WeekSwitcher } from '../../components/WeekSwitcher';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import { CATEGORY_LABELS } from '../../content/labels';
import { clearCheckedIngredients, setIngredientChecked } from '../../data/shoppingRepository';
import { formatWeekRange, isDateKey, todayKey, weekDays } from '../../domain/plan/dates';
import { planMeals } from '../../domain/plan/portions';
import { buildShoppingList } from '../../domain/plan/shoppingList';
import type { ShoppingSection } from '../../domain/plan/shoppingList';
import { formatGrams } from '../../format/amounts';
import { useCheckedIngredients } from '../../hooks/useCheckedIngredients';
import { useMembers } from '../../hooks/useMembers';
import { usePlanEntries } from '../../hooks/usePlanEntries';
import { useRecipeEntries } from '../../hooks/useRecipeEntries';
import { ShareActions } from './ShareActions';
import { formatShoppingText } from './shareText';
import './ShoppingListPage.css';

/** What to buy for the planned meals of one week, with items to tick off in the shop. */
export function ShoppingListPage() {
  const { date } = useParams();
  const today = todayKey();
  const selected = date ?? today;
  // The hooks below must run on every render, so fall back to today for a bad address.
  const week = isDateKey(selected) ? selected : today;
  const days = weekDays(week);

  const household = useMembers();
  const recipes = useRecipeEntries();
  const entries = usePlanEntries(days[0] ?? today, days[6] ?? today);
  const checked = useCheckedIngredients(week);
  const [actionFailed, setActionFailed] = useState(false);

  if (!isDateKey(selected)) {
    return <Navigate to={shoppingPath.week(today)} replace />;
  }

  async function run(action: () => Promise<void>) {
    setActionFailed(false);
    try {
      await action();
    } catch (error) {
      console.error('Could not update the shopping list', error);
      setActionFailed(true);
    }
  }

  function renderList() {
    if (
      household === undefined ||
      recipes === undefined ||
      entries === undefined ||
      checked === undefined
    ) {
      return <p>Wczytywanie…</p>;
    }

    if (household.length === 0) {
      return (
        <p className="shopping-empty">
          Żeby policzyć zakupy, najpierw dodaj domowników i zaplanuj posiłki.{' '}
          <Link to={ROUTES.household}>Przejdź do domowników</Link>.
        </p>
      );
    }

    const meals = planMeals(
      entries,
      recipes.map(({ recipe }) => recipe),
      household,
      INGREDIENT_CATALOG,
    );
    const sections = buildShoppingList(meals, INGREDIENT_CATALOG);

    if (sections.length === 0) {
      return (
        <p className="shopping-empty">
          Na ten tydzień nie zaplanowano jeszcze posiłków dla nikogo.{' '}
          <Link to={calendarPath.day(week)}>Przejdź do kalendarza</Link>.
        </p>
      );
    }

    const items = sections.flatMap((section) => section.items);
    const boughtCount = items.filter((item) => checked.has(item.ingredientId)).length;
    const weekLabel = formatWeekRange(week);

    return (
      <>
        <p className="shopping-progress" role="status">
          Kupione: {boughtCount} z {items.length}
        </p>

        <ShareActions
          title="Lista zakupów"
          text={formatShoppingText(weekLabel, sections, checked)}
        />

        {sections.map((section) => (
          <ShoppingSectionView
            key={section.category}
            section={section}
            checked={checked}
            onToggle={(ingredientId, isChecked) =>
              void run(() => setIngredientChecked(week, ingredientId, isChecked))
            }
          />
        ))}

        {boughtCount > 0 && (
          <button
            type="button"
            className="btn btn--small"
            onClick={() => void run(() => clearCheckedIngredients(week))}
          >
            Odznacz wszystko
          </button>
        )}
      </>
    );
  }

  return (
    <section>
      <h1>Lista zakupów</h1>
      <p className="lead">Kupujesz tyle, ile zjecie. Lista powstaje z dań w kalendarzu.</p>

      <nav aria-label="Wybór tygodnia">
        <WeekSwitcher selected={week} today={today} pathFor={shoppingPath.week} />
      </nav>

      {actionFailed && (
        <p className="form-error" role="alert">
          Nie udało się zapisać zmiany. Spróbuj ponownie.
        </p>
      )}

      {renderList()}
    </section>
  );
}

interface ShoppingSectionViewProps {
  section: ShoppingSection;
  checked: ReadonlySet<string>;
  onToggle: (ingredientId: string, checked: boolean) => void;
}

function ShoppingSectionView({ section, checked, onToggle }: ShoppingSectionViewProps) {
  const headingId = `shopping-${section.category}`;

  return (
    <section className="shopping-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{CATEGORY_LABELS[section.category]}</h2>
      <ul className="shopping-items">
        {section.items.map((item) => (
          <li key={item.ingredientId}>
            <label className="shopping-item">
              <input
                type="checkbox"
                checked={checked.has(item.ingredientId)}
                onChange={(event) => onToggle(item.ingredientId, event.target.checked)}
              />
              <span className="shopping-item__name">{item.name}</span>{' '}
              <span className="shopping-item__amount">{formatGrams(item.grams)}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
