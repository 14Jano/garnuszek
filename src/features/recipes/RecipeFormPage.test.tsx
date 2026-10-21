import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { listFavoriteIds, setFavorite } from '../../data/favoriteRepository';
import { addCustomRecipe, listCustomRecipes } from '../../data/recipeRepository';
import type { NewRecipe } from '../../domain/recipes/recipe';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const pierogi: NewRecipe = {
  name: 'Pierogi ruskie',
  mealType: 'lunch',
  servings: 4,
  prepMinutes: 90,
  ingredients: [
    { ingredientId: 'potato', grams: 600 },
    { ingredientId: 'quark', grams: 250 },
  ],
  steps: ['Ugotuj ziemniaki.', 'Wymieszaj z twarogiem.'],
};

beforeEach(async () => {
  await db.customRecipes.clear();
  await db.favorites.clear();
});

async function pickIngredient(user: UserEvent, index: number, name: string, grams: string) {
  await user.selectOptions(screen.getByLabelText(`Składnik ${index}`), name);
  await user.type(screen.getByLabelText(`Ilość składnika ${index} (g)`), grams);
}

describe('creating a recipe', () => {
  it('saves a recipe, shows live nutrition and opens the new recipe', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy/nowy');

    await user.type(await screen.findByLabelText('Nazwa'), 'Pierogi ruskie');
    await user.clear(screen.getByLabelText('Liczba porcji'));
    await user.type(screen.getByLabelText('Liczba porcji'), '4');
    await user.type(screen.getByLabelText('Czas (minuty)'), '90');
    await pickIngredient(user, 1, 'Ziemniaki', '600');

    await user.click(screen.getByRole('button', { name: 'Dodaj składnik' }));
    expect(screen.getByLabelText('Składnik 2')).toHaveFocus();
    await pickIngredient(user, 2, 'Twaróg półtłusty', '250');

    // 600 g potatoes (462 kcal) + 250 g quark (332.5 kcal), shared by 4
    expect(screen.getByText('199 kcal')).toBeVisible();

    await user.type(
      screen.getByLabelText('Przygotowanie (jeden krok w jednej linii)'),
      'Ugotuj ziemniaki.{Enter}Wymieszaj z twarogiem.',
    );
    await user.click(screen.getByRole('button', { name: 'Dodaj przepis' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Pierogi ruskie' })).toBeVisible();
    expect(screen.getByText('Ziemniaki: 600 g')).toBeVisible();
    expect(screen.getByText('Wymieszaj z twarogiem.')).toBeVisible();

    const [saved] = await listCustomRecipes();
    expect(saved).toMatchObject({
      name: 'Pierogi ruskie',
      servings: 4,
      prepMinutes: 90,
      steps: ['Ugotuj ziemniaki.', 'Wymieszaj z twarogiem.'],
    });
  });

  it('explains what is missing, focuses the first problem and clears errors as they are fixed', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy/nowy');

    await user.click(await screen.findByRole('button', { name: 'Dodaj przepis' }));

    expect(screen.getByText('Wpisz nazwę przepisu.')).toBeVisible();
    expect(screen.getByText('Podaj czas przygotowania.')).toBeVisible();
    expect(screen.getByText('Wybierz składnik.')).toBeVisible();
    expect(screen.getByText('Podaj ilość.')).toBeVisible();
    expect(screen.getByLabelText('Nazwa')).toHaveFocus();
    expect(screen.getByLabelText('Nazwa')).toHaveAttribute('aria-invalid', 'true');
    expect(await listCustomRecipes()).toEqual([]);

    await user.type(screen.getByLabelText('Nazwa'), 'A');

    expect(screen.queryByText('Wpisz nazwę przepisu.')).not.toBeInTheDocument();
    expect(screen.getByText('Podaj czas przygotowania.')).toBeVisible();
  });

  it('keeps at least one ingredient row', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy/nowy');

    const remove = await screen.findByRole('button', { name: 'Usuń składnik 1' });
    expect(remove).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Dodaj składnik' }));
    expect(screen.getByRole('button', { name: 'Usuń składnik 1' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Usuń składnik 2' }));
    expect(screen.queryByLabelText('Składnik 2')).not.toBeInTheDocument();
  });

  it('returns to the list when the user cancels', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy/nowy');

    await user.click(await screen.findByRole('button', { name: 'Anuluj' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Przepisy' })).toBeVisible();
  });
});

describe('editing and deleting a recipe', () => {
  it('shows the user own recipes first and marks them', async () => {
    await addCustomRecipe(pierogi);
    renderAt('/przepisy');

    const heading = await screen.findByRole('heading', { name: 'Pierogi ruskie' });

    expect(heading.closest('a')).toHaveTextContent('Własny');
    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Pierogi ruskie');
  });

  it('edits a recipe with its current values filled in', async () => {
    const user = userEvent.setup();
    const saved = await addCustomRecipe(pierogi);
    renderAt(`/przepisy/${saved.id}/edytuj`);

    const name = await screen.findByLabelText('Nazwa');
    expect(name).toHaveValue('Pierogi ruskie');
    expect(screen.getByLabelText('Składnik 2')).toHaveValue('quark');
    expect(screen.getByLabelText('Ilość składnika 1 (g)')).toHaveValue(600);

    await user.clear(name);
    await user.type(name, 'Pierogi z twarogiem');
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pierogi z twarogiem' }),
    ).toBeVisible();
    expect((await listCustomRecipes()).map((recipe) => recipe.name)).toEqual([
      'Pierogi z twarogiem',
    ]);
  });

  it('deletes a recipe and its favorite mark only after confirmation', async () => {
    const user = userEvent.setup();
    const saved = await addCustomRecipe(pierogi);
    await setFavorite(saved.id, true);
    renderAt(`/przepisy/${saved.id}`);

    await user.click(await screen.findByRole('button', { name: 'Usuń przepis' }));
    await user.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Pierogi ruskie' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Usuń przepis' }));
    await user.click(screen.getByRole('button', { name: 'Tak, usuń' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Przepisy' })).toBeVisible();
    await waitFor(async () => {
      expect(await listCustomRecipes()).toEqual([]);
    });
    expect(await listFavoriteIds()).toEqual(new Set());
  });

  it('does not allow editing a built-in recipe', async () => {
    renderAt('/przepisy/szakszuka/edytuj');

    expect(
      await screen.findByRole('heading', { name: 'Nie można edytować tego przepisu' }),
    ).toBeVisible();
  });
});
