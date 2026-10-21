import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES, recipePath } from '../../app/navigation';
import { requestPersistentStorage } from '../../data/persistence';
import { addCustomRecipe, updateCustomRecipe } from '../../data/recipeRepository';
import type { NewRecipe } from '../../domain/recipes/recipe';
import { RecipeForm } from './RecipeForm';
import { useRecipeEntries } from './useRecipeEntries';

/** Creates a new recipe, or edits one of the user's own when the address has a recipe id. */
export function RecipeFormPage() {
  const { recipeId } = useParams();
  const entries = useRecipeEntries();
  const navigate = useNavigate();
  const [saveFailed, setSaveFailed] = useState(false);

  if (entries === undefined) return <p>Wczytywanie…</p>;

  const isEditing = recipeId !== undefined;
  // Built-in recipes cannot be edited, so only the user's own count here.
  const existing = isEditing
    ? entries.find(({ recipe, custom }) => custom && recipe.id === recipeId)?.recipe
    : undefined;

  if (isEditing && !existing) {
    return (
      <section>
        <h1>Nie można edytować tego przepisu</h1>
        <p>
          Przepis nie istnieje albo jest wbudowany w aplikację. Możesz edytować tylko własne
          przepisy. <Link to={ROUTES.recipes}>Wróć do listy przepisów</Link>.
        </p>
      </section>
    );
  }

  async function handleSubmit(input: NewRecipe) {
    setSaveFailed(false);
    try {
      if (existing) {
        await updateCustomRecipe({ ...input, id: existing.id });
        void navigate(recipePath.details(existing.id));
      } else {
        const saved = await addCustomRecipe(input);
        // Ask only once the user has something worth keeping.
        void requestPersistentStorage();
        void navigate(recipePath.details(saved.id));
      }
    } catch (error) {
      console.error('Could not save recipe', error);
      setSaveFailed(true);
    }
  }

  function handleCancel() {
    void navigate(existing ? recipePath.details(existing.id) : ROUTES.recipes);
  }

  return (
    <section>
      <h1>{existing ? 'Edycja przepisu' : 'Nowy przepis'}</h1>
      {saveFailed && (
        <p className="form-error" role="alert">
          Nie udało się zapisać przepisu. Spróbuj ponownie.
        </p>
      )}
      <RecipeForm
        key={existing?.id ?? 'new'}
        initialValues={existing}
        submitLabel={existing ? 'Zapisz zmiany' : 'Dodaj przepis'}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </section>
  );
}
