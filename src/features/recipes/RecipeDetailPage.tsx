import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES, recipePath } from '../../app/navigation';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import { removeCustomRecipe } from '../../data/recipeRepository';
import { requireIngredient } from '../../domain/recipes/ingredient';
import { compatibleDiets, nutritionPerServing } from '../../domain/recipes/recipe';
import { FavoriteButton } from './FavoriteButton';
import { DIET_LABELS, MEAL_TYPE_LABELS } from '../../content/labels';
import { NutritionSummary } from './NutritionSummary';
import { useConfirmFocus } from '../../hooks/useConfirmFocus';
import { useRecipeEntries } from '../../hooks/useRecipeEntries';
import './RecipeDetailPage.css';

export function RecipeDetailPage() {
  const { recipeId } = useParams();
  const entries = useRecipeEntries();
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const { trigger, cancel } = useConfirmFocus(confirmingDelete);

  if (entries === undefined) return <p>Wczytywanie…</p>;

  const entry = entries.find(({ recipe }) => recipe.id === recipeId);
  if (!entry) {
    return (
      <section>
        <h1>Nie znaleziono przepisu</h1>
        <p>
          Być może został usunięty. <Link to={ROUTES.recipes}>Wróć do listy przepisów</Link>.
        </p>
      </section>
    );
  }

  const { recipe, favorite, custom } = entry;
  const diets = compatibleDiets(recipe, INGREDIENT_CATALOG);
  const strictestDiet = diets.at(-1);

  async function handleDelete() {
    setDeleteFailed(false);
    try {
      await removeCustomRecipe(recipe.id);
      void navigate(ROUTES.recipes);
    } catch (error) {
      console.error('Could not delete recipe', error);
      setDeleteFailed(true);
    }
  }

  return (
    <article className="recipe-details">
      <p>
        <Link to={ROUTES.recipes}>← Wszystkie przepisy</Link>
      </p>

      <header className="recipe-details__header">
        <h1>{recipe.name}</h1>
        <FavoriteButton recipeId={recipe.id} recipeName={recipe.name} favorite={favorite} />
      </header>

      <p className="recipe-details__meta">
        {MEAL_TYPE_LABELS[recipe.mealType]}, {recipe.prepMinutes} min
        {strictestDiet && `, ${DIET_LABELS[strictestDiet].toLowerCase()}`}
        {custom && ', własny przepis'}
      </p>

      <h2>Wartości odżywcze na jedną porcję</h2>
      <NutritionSummary nutrients={nutritionPerServing(recipe, INGREDIENT_CATALOG)} />

      <h2>Składniki (na {recipe.servings} porcji)</h2>
      <ul className="recipe-details__ingredients">
        {recipe.ingredients.map(({ ingredientId, grams }, index) => (
          <li key={`${ingredientId}-${index}`}>
            {requireIngredient(ingredientId, INGREDIENT_CATALOG).name}: {grams} g
          </li>
        ))}
      </ul>

      <h2>Przygotowanie</h2>
      {recipe.steps.length === 0 ? (
        <p className="recipe-details__meta">Ten przepis nie ma jeszcze opisu przygotowania.</p>
      ) : (
        <ol className="recipe-details__steps">
          {recipe.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      )}

      {recipe.origin && (
        <p className="recipe-details__origin">
          Przepis na podstawie materiałów: {recipe.origin.author}. {recipe.origin.credit}.{' '}
          <a href={recipe.origin.url} target="_blank" rel="noopener noreferrer">
            Oryginał (po angielsku)
          </a>
          . Gramatury, liczbę porcji i składniki dopasowaliśmy do Garnuszka.
        </p>
      )}

      {custom && (
        <div className="recipe-details__actions">
          {deleteFailed && (
            <p className="form-error" role="alert">
              Nie udało się usunąć przepisu. Spróbuj ponownie.
            </p>
          )}
          {confirmingDelete ? (
            <div role="group" aria-label="Usuwanie przepisu" className="recipe-details__confirm">
              <span>Usunąć ten przepis?</span>
              <button type="button" className="btn btn--danger" onClick={handleDelete}>
                Tak, usuń
              </button>
              <button
                type="button"
                className="btn"
                ref={cancel}
                onClick={() => setConfirmingDelete(false)}
              >
                Anuluj
              </button>
            </div>
          ) : (
            <>
              <Link className="btn recipe-details__link-button" to={recipePath.edit(recipe.id)}>
                Edytuj przepis
              </Link>
              <button
                type="button"
                className="btn"
                ref={trigger}
                onClick={() => setConfirmingDelete(true)}
              >
                Usuń przepis
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
