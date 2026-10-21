import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import { BUILTIN_RECIPES } from '../../content/recipes';
import { db } from '../../data/db';
import { listFavoriteIds } from '../../data/favoriteRepository';

const TOTAL = BUILTIN_RECIPES.length;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await db.customRecipes.clear();
  await db.favorites.clear();
});

describe('recipe list', () => {
  it('shows every built-in recipe with its calories per serving', async () => {
    renderAt('/przepisy');

    expect(await screen.findByText(`Pokazano ${TOTAL} z ${TOTAL} przepisów.`)).toBeVisible();
    const card = screen
      .getByRole('heading', { name: 'Owsianka z bananem i orzechami' })
      .closest('a');
    expect(card).toHaveTextContent('Śniadanie, 10 min, 345 kcal na porcję');
  });

  it('searches names and ingredients without caring about diacritics', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy');
    await screen.findByText(`Pokazano ${TOTAL} z ${TOTAL} przepisów.`);

    await user.type(screen.getByLabelText('Szukaj przepisu lub składnika'), 'losos');

    expect(
      screen.getByRole('heading', { name: 'Pieczony łosoś z batatami i brokułem' }),
    ).toBeVisible();
    expect(screen.getByText(`Pokazano 1 z ${TOTAL} przepisów.`)).toBeVisible();
  });

  it('filters by meal type', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy');
    await screen.findByText(`Pokazano ${TOTAL} z ${TOTAL} przepisów.`);

    await user.selectOptions(screen.getByLabelText('Posiłek'), 'Kolacje');

    const dinners = BUILTIN_RECIPES.filter((recipe) => recipe.mealType === 'dinner').length;
    expect(screen.getByText(`Pokazano ${dinners} z ${TOTAL} przepisów.`)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Sałatka grecka z fetą' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Spaghetti bolognese' })).not.toBeInTheDocument();
  });

  it('filters by diet', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy');
    await screen.findByText(`Pokazano ${TOTAL} z ${TOTAL} przepisów.`);

    await user.selectOptions(screen.getByLabelText('Dieta'), 'Wegańskie');

    expect(screen.getByRole('heading', { name: 'Curry z ciecierzycy i szpinaku' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Szakszuka' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Pieczony łosoś z batatami i brokułem' }),
    ).not.toBeInTheDocument();
  });

  it('says so when nothing matches and lets the user clear the filters', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy');
    await screen.findByText(`Pokazano ${TOTAL} z ${TOTAL} przepisów.`);

    await user.type(screen.getByLabelText('Szukaj przepisu lub składnika'), 'zzzz');
    expect(screen.getByText(/Nic nie pasuje do wybranych filtrów/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Wyczyść filtry' }));

    expect(screen.getByText(`Pokazano ${TOTAL} z ${TOTAL} przepisów.`)).toBeVisible();
    expect(screen.getByLabelText('Szukaj przepisu lub składnika')).toHaveValue('');
  });

  it('remembers favorites and can show only them', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy');
    await screen.findByText(`Pokazano ${TOTAL} z ${TOTAL} przepisów.`);

    const heart = screen.getByRole('button', { name: 'Ulubione: Szakszuka' });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    await user.click(heart);

    expect(
      await screen.findByRole('button', { name: 'Ulubione: Szakszuka', pressed: true }),
    ).toBeVisible();
    expect(await listFavoriteIds()).toEqual(new Set(['szakszuka']));

    await user.click(screen.getByLabelText('Tylko ulubione'));

    expect(screen.getByText(`Pokazano 1 z ${TOTAL} przepisów.`)).toBeVisible();
  });
});

describe('what can I cook with what I have', () => {
  async function openFridge(user: UserEvent) {
    await screen.findByText(`Pokazano ${TOTAL} z ${TOTAL} przepisów.`);
    await user.click(screen.getByText('Co ugotować z tego, co mam'));
  }

  it('keeps only recipes that contain every chosen ingredient', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy');
    await openFridge(user);

    await user.selectOptions(screen.getByLabelText('Dodaj składnik'), 'Jajko');
    const withEgg = BUILTIN_RECIPES.filter((recipe) =>
      recipe.ingredients.some(({ ingredientId }) => ingredientId === 'egg'),
    ).length;
    expect(screen.getByText(`Pokazano ${withEgg} z ${TOTAL} przepisów.`)).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Dodaj składnik'), 'Szpinak');
    expect(screen.getByText(`Pokazano 1 z ${TOTAL} przepisów.`)).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Jajecznica ze szpinakiem i pomidorem' }),
    ).toBeVisible();
  });

  it('shows the chosen ingredients and lets the user take one back', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy');
    await openFridge(user);
    await user.selectOptions(screen.getByLabelText('Dodaj składnik'), 'Jajko');
    await user.selectOptions(screen.getByLabelText('Dodaj składnik'), 'Szpinak');

    await user.click(screen.getByRole('button', { name: 'Usuń z listy: Szpinak' }));

    expect(screen.queryByRole('button', { name: 'Usuń z listy: Szpinak' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usuń z listy: Jajko' })).toBeVisible();
    expect(screen.queryByText(`Pokazano 1 z ${TOTAL} przepisów.`)).not.toBeInTheDocument();
  });

  it('does not offer an ingredient that is already chosen', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy');
    await openFridge(user);
    const picker = screen.getByLabelText('Dodaj składnik');
    expect(within(picker).getByRole('option', { name: 'Jajko' })).toBeInTheDocument();

    await user.selectOptions(picker, 'Jajko');

    expect(within(picker).queryByRole('option', { name: 'Jajko' })).not.toBeInTheDocument();
  });

  it('combines with the other filters and is cleared with them', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy');
    await openFridge(user);
    await user.selectOptions(screen.getByLabelText('Dodaj składnik'), 'Jajko');
    await user.selectOptions(screen.getByLabelText('Posiłek'), 'Kolacje');

    // Only the omelette is a dinner with eggs.
    expect(screen.getByText(`Pokazano 1 z ${TOTAL} przepisów.`)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Omlet z pieczarkami i serem' })).toBeVisible();

    await user.type(screen.getByLabelText('Szukaj przepisu lub składnika'), 'zzzz');
    await user.click(screen.getByRole('button', { name: 'Wyczyść filtry' }));

    expect(screen.getByText(`Pokazano ${TOTAL} z ${TOTAL} przepisów.`)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Usuń z listy: Jajko' })).not.toBeInTheDocument();
  });
});

describe('recipe details', () => {
  it('opens from the list and shows nutrition, ingredients and steps', async () => {
    const user = userEvent.setup();
    renderAt('/przepisy');

    await user.click(await screen.findByRole('heading', { name: 'Szakszuka' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Szakszuka' })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Wartości odżywcze na jedną porcję' }),
    ).toBeVisible();
    expect(screen.getByText('Jajko: 220 g')).toBeVisible();
    expect(screen.getByText(/Zrób w sosie cztery wgłębienia/)).toBeVisible();
  });

  it('does not offer to edit or delete a built-in recipe', async () => {
    renderAt('/przepisy/szakszuka');

    await screen.findByRole('heading', { level: 1, name: 'Szakszuka' });

    expect(screen.queryByRole('link', { name: 'Edytuj przepis' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usuń przepis' })).not.toBeInTheDocument();
  });

  it('explains when the recipe does not exist', async () => {
    renderAt('/przepisy/nie-ma-takiego');

    expect(await screen.findByRole('heading', { name: 'Nie znaleziono przepisu' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Wróć do listy przepisów' })).toBeVisible();
  });
});
