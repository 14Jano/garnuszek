import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { recipePath } from '../../app/navigation';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import { NO_FILTER, filterRecipes } from '../../domain/recipes/filterRecipes';
import type { RecipeFilter } from '../../domain/recipes/filterRecipes';
import { DIETS, MEAL_TYPES } from '../../domain/recipes/recipe';
import { DIET_LABELS, MEAL_TYPE_PLURAL_LABELS } from '../../content/labels';
import { RecipeCard } from './RecipeCard';
import { useRecipeEntries } from '../../hooks/useRecipeEntries';
import './RecipesPage.css';

export function RecipesPage() {
  const entries = useRecipeEntries();
  const [filter, setFilter] = useState<RecipeFilter>(NO_FILTER);

  const visible = useMemo(
    () => (entries ? filterRecipes(entries, filter, INGREDIENT_CATALOG) : []),
    [entries, filter],
  );

  const isFiltered = filter !== NO_FILTER;

  return (
    <section>
      <h1>Przepisy</h1>
      <p className="lead">Proste, domowe dania, które da się ugotować po pracy.</p>

      <p>
        <Link className="btn btn--primary recipes-add" to={recipePath.create}>
          Dodaj własny przepis
        </Link>
      </p>

      <form className="recipe-filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <div className="field">
          <label className="field__label" htmlFor="recipe-search">
            Szukaj przepisu lub składnika
          </label>
          <input
            id="recipe-search"
            className="input"
            type="search"
            value={filter.query}
            onChange={(event) => setFilter({ ...filter, query: event.target.value })}
          />
        </div>

        <div className="recipe-filters__row">
          <div className="field">
            <label className="field__label" htmlFor="recipe-meal-type">
              Posiłek
            </label>
            <select
              id="recipe-meal-type"
              className="input"
              value={filter.mealType ?? ''}
              onChange={(event) =>
                setFilter({
                  ...filter,
                  mealType: MEAL_TYPES.find((type) => type === event.target.value) ?? null,
                })
              }
            >
              <option value="">Wszystkie</option>
              {MEAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MEAL_TYPE_PLURAL_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="recipe-diet">
              Dieta
            </label>
            <select
              id="recipe-diet"
              className="input"
              value={filter.diet ?? ''}
              onChange={(event) =>
                setFilter({
                  ...filter,
                  diet: DIETS.find((diet) => diet === event.target.value) ?? null,
                })
              }
            >
              <option value="">Dowolna</option>
              {DIETS.map((diet) => (
                <option key={diet} value={diet}>
                  {DIET_LABELS[diet]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="choice">
          <input
            type="checkbox"
            checked={filter.favoritesOnly}
            onChange={(event) => setFilter({ ...filter, favoritesOnly: event.target.checked })}
          />
          Tylko ulubione
        </label>
      </form>

      {entries === undefined ? (
        <p>Wczytywanie…</p>
      ) : (
        <>
          <p className="recipes-count" role="status">
            Pokazano {visible.length} z {entries.length} przepisów.
          </p>

          {visible.length === 0 ? (
            <p>
              Nic nie pasuje do wybranych filtrów.{' '}
              {isFiltered && (
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => setFilter(NO_FILTER)}
                >
                  Wyczyść filtry
                </button>
              )}
            </p>
          ) : (
            <ul className="recipe-list">
              {visible.map((entry) => (
                <RecipeCard key={entry.recipe.id} {...entry} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
