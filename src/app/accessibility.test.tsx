import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { db } from '../data/db';
import { createBackup } from '../domain/backup/backup';
import { setFavorite } from '../data/favoriteRepository';
import { saveMeasurement } from '../data/measurementRepository';
import { addMember } from '../data/memberRepository';
import { assignRecipe, setBatchDays } from '../data/planRepository';
import { addCustomRecipe } from '../data/recipeRepository';
import { setIngredientChecked } from '../data/shoppingRepository';
import { setSnackOverride } from '../data/snackRepository';
import { accessibilityProblems } from '../test/axe';

const DAY = '2026-10-21';

/**
 * Opens a screen and waits until it has its heading and a tab title that
 * matches it, which is what a person (or a screen reader) meets first.
 */
async function openScreen(path: string, heading?: string | RegExp) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

  const h1 = await screen.findByRole('heading', {
    level: 1,
    ...(heading === undefined ? {} : { name: heading }),
  });
  await waitFor(() => expect(document.title).toBe(`${h1.textContent} – Garnuszek`));
}

/** A household with a planned week, a custom recipe, favorites and measurements. */
async function seedEverything() {
  const anna = await addMember({
    name: 'Anna',
    sex: 'female',
    age: 30,
    heightCm: 165,
    weightKg: 70,
    activity: 'light',
    goal: 'lose',
    snackKcal: 150,
    targetWeightKg: 62,
    // The Greek salad has feta in it, so the calendar and the picker show their warnings.
    restrictions: { allergens: ['milk'], avoidedIngredientIds: ['onion'] },
  });
  const bartek = await addMember({
    name: 'Bartek',
    sex: 'male',
    age: 32,
    heightCm: 180,
    weightKg: 80,
    activity: 'moderate',
    goal: 'maintain',
    snackKcal: 0,
  });
  const eaters = [anna.id, bartek.id];

  await assignRecipe(DAY, 'breakfast', 'szakszuka', eaters);
  await assignRecipe(DAY, 'lunch', 'chili-sin-carne', eaters);
  await assignRecipe(DAY, 'dinner', 'salatka-grecka', eaters);
  await setBatchDays(DAY, 'lunch', 2);
  await setSnackOverride(DAY, anna.id, 300);
  await setIngredientChecked('2026-10-19', 'egg', true);
  await setFavorite('szakszuka', true);

  const custom = await addCustomRecipe({
    name: 'Pierogi ruskie',
    mealType: 'lunch',
    servings: 4,
    prepMinutes: 90,
    ingredients: [
      { ingredientId: 'potato', grams: 600 },
      { ingredientId: 'quark', grams: 250 },
    ],
    steps: ['Ugotuj ziemniaki.', 'Wymieszaj z twarogiem.'],
  });

  for (const [date, value] of [
    ['2026-10-07', 71],
    ['2026-10-14', 70.4],
    ['2026-10-21', 69.8],
  ] as const) {
    await saveMeasurement({ memberId: anna.id, kind: 'weight', date, value });
  }
  await saveMeasurement({ memberId: anna.id, kind: 'waist', date: DAY, value: 80 });

  return { anna, custom };
}

beforeAll(() => {
  // index.html sets the language; the test document has to say the same.
  document.documentElement.lang = 'pl';
});

beforeEach(async () => {
  document.title = '';
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('accessibility: every screen with data', () => {
  it.each([
    ['the calendar', `/kalendarz/${DAY}`, 'Kalendarz posiłków'],
    ['the recipe picker', `/kalendarz/${DAY}/dinner/wybierz`, /danie/],
    ['the shopping list', `/zakupy/${DAY}`, 'Lista zakupów'],
    ['the recipe list', '/przepisy', 'Przepisy'],
    ['a built-in recipe', '/przepisy/szakszuka', 'Szakszuka'],
    ['the new recipe form', '/przepisy/nowy', 'Nowy przepis'],
    ['the household', '/domownicy', 'Domownicy'],
    ['the proposal for a week', `/kalendarz/${DAY}/uloz`, 'Ułóż tydzień'],
    ['the settings', '/ustawienia', 'Ustawienia'],
    ['an address that does not exist', '/nie-ma-takiej-strony', 'Nie ma takiej strony'],
  ])('%s has no accessibility problems', async (_name, path, heading) => {
    await seedEverything();
    await openScreen(path, heading);

    expect(await accessibilityProblems()).toEqual([]);
  });

  it('the page of a custom recipe has no accessibility problems', async () => {
    const { custom } = await seedEverything();
    await openScreen(`/przepisy/${custom.id}`, 'Pierogi ruskie');

    expect(await accessibilityProblems()).toEqual([]);
  });

  it('the form for editing a custom recipe has no accessibility problems', async () => {
    const { custom } = await seedEverything();
    await openScreen(`/przepisy/${custom.id}/edytuj`);
    await screen.findByDisplayValue('Pierogi ruskie');

    expect(await accessibilityProblems()).toEqual([]);
  });

  it('the measurements of a member have no accessibility problems', async () => {
    const { anna } = await seedEverything();
    await openScreen(`/domownicy/${anna.id}/pomiary`, 'Pomiary: Anna');
    await screen.findByRole('img');

    expect(await accessibilityProblems()).toEqual([]);
  });
});

describe('accessibility: screens without data', () => {
  it.each([
    ['the calendar', `/kalendarz/${DAY}`],
    ['the shopping list', `/zakupy/${DAY}`],
    ['the household', '/domownicy'],
    ['the proposal for a week without a household', `/kalendarz/${DAY}/uloz`],
    ['a week that is not a day', '/kalendarz/nie-dzien/uloz'],
    ['the measurements of someone who is not there', '/domownicy/nikt/pomiary'],
    ['a recipe that is not there', '/przepisy/nie-ma'],
  ])('%s has no accessibility problems', async (_name, path) => {
    await openScreen(path);

    expect(await accessibilityProblems()).toEqual([]);
  });
});

describe('accessibility: forms and confirmations', () => {
  it('the member form, empty and with errors, has no accessibility problems', async () => {
    const user = userEvent.setup();
    await openScreen('/domownicy');
    await user.click(await screen.findByRole('button', { name: 'Dodaj domownika' }));
    expect(await accessibilityProblems()).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    expect(screen.getByText('Podaj wiek.')).toBeVisible();

    expect(await accessibilityProblems()).toEqual([]);
  });

  it('the form of a member who avoids things has no accessibility problems', async () => {
    const user = userEvent.setup();
    await seedEverything();
    await openScreen('/domownicy');

    await user.click(await screen.findByRole('button', { name: 'Edytuj: Anna' }));

    expect(screen.getByRole('list', { name: 'Składniki, których unika' })).toBeVisible();
    expect(await accessibilityProblems()).toEqual([]);
  });

  it('shows the warning about a dish that someone avoids', async () => {
    await seedEverything();
    await openScreen(`/kalendarz/${DAY}`);

    expect((await screen.findAllByText(/czego unikają/)).length).toBeGreaterThan(0);
    expect(await accessibilityProblems()).toEqual([]);
  });

  it('the confirmation of deleting a member has no accessibility problems', async () => {
    const user = userEvent.setup();
    await seedEverything();
    await openScreen('/domownicy');

    await user.click(await screen.findByRole('button', { name: 'Usuń: Anna' }));

    expect(await accessibilityProblems()).toEqual([]);
  });

  it('the recipe form with errors has no accessibility problems', async () => {
    const user = userEvent.setup();
    await openScreen('/przepisy/nowy');

    await user.click(await screen.findByRole('button', { name: /Zapisz|Dodaj przepis/ }));

    expect(await accessibilityProblems()).toEqual([]);
  });
});

describe('keyboard focus', () => {
  it('follows the heading when the household list and the form replace each other', async () => {
    const user = userEvent.setup();
    await openScreen('/domownicy', 'Domownicy');

    await user.click(await screen.findByRole('button', { name: 'Dodaj domownika' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Nowy domownik' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Domownicy' })).toHaveFocus();
  });

  it('stays in a confirmation and goes back to the button that opened it', async () => {
    const user = userEvent.setup();
    await seedEverything();
    await openScreen('/domownicy', 'Domownicy');

    await user.click(await screen.findByRole('button', { name: 'Usuń: Anna' }));
    // The safe choice has focus, so pressing Enter by reflex deletes nothing.
    expect(screen.getByRole('button', { name: 'Anuluj' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(screen.getByRole('button', { name: 'Usuń: Anna' })).toHaveFocus();
  });

  it('moves to the heading once a member is deleted', async () => {
    const user = userEvent.setup();
    await seedEverything();
    await openScreen('/domownicy', 'Domownicy');

    await user.click(await screen.findByRole('button', { name: 'Usuń: Bartek' }));
    await user.click(screen.getByRole('button', { name: 'Tak, usuń' }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Bartek' })).toBeNull());
    expect(screen.getByRole('heading', { level: 1, name: 'Domownicy' })).toHaveFocus();
  });

  it('is kept in the confirmation of deleting a recipe and all data', async () => {
    const user = userEvent.setup();
    const { custom } = await seedEverything();
    await openScreen(`/przepisy/${custom.id}`, 'Pierogi ruskie');

    await user.click(screen.getByRole('button', { name: 'Usuń przepis' }));
    expect(screen.getByRole('button', { name: 'Anuluj' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(screen.getByRole('button', { name: 'Usuń przepis' })).toHaveFocus();

    await user.click(screen.getByRole('link', { name: 'Ustawienia' }));
    await user.click(await screen.findByRole('button', { name: 'Usuń wszystkie dane' }));
    expect(screen.getByRole('button', { name: 'Anuluj' })).toHaveFocus();
  });

  it('is kept in the confirmation of deleting a measurement', async () => {
    const user = userEvent.setup();
    const { anna } = await seedEverything();
    await openScreen(`/domownicy/${anna.id}/pomiary`, 'Pomiary: Anna');

    await user.click(await screen.findByRole('button', { name: 'Usuń pomiar: 21.10.2026' }));
    expect(screen.getByRole('button', { name: 'Anuluj' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(screen.getByRole('button', { name: 'Usuń pomiar: 21.10.2026' })).toHaveFocus();
  });

  it('moves to the review of a backup once the file is read', async () => {
    const user = userEvent.setup();
    await openScreen('/ustawienia', 'Ustawienia');
    const backup = createBackup({
      members: [],
      customRecipes: [],
      favoriteRecipeIds: [],
      planEntries: [],
      shoppingChecks: [],
      snackOverrides: [],
      measurements: [],
    });

    await user.upload(
      screen.getByLabelText('Wczytaj kopię zapasową'),
      new File([JSON.stringify(backup)], 'kopia.json', { type: 'application/json' }),
    );

    const review = await screen.findByRole('group', { name: 'Wczytywanie kopii zapasowej' });
    await waitFor(() => expect(review).toHaveFocus());
  });
});

describe('moving between screens', () => {
  it('gives every screen its own title and moves focus to its heading', async () => {
    const user = userEvent.setup();
    await openScreen('/kalendarz');

    await user.click(screen.getByRole('link', { name: 'Zakupy' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Lista zakupów' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(document.title).toBe('Lista zakupów – Garnuszek');

    await user.click(screen.getByRole('link', { name: 'Ustawienia' }));

    const settings = await screen.findByRole('heading', { level: 1, name: 'Ustawienia' });
    await waitFor(() => expect(settings).toHaveFocus());
    expect(document.title).toBe('Ustawienia – Garnuszek');
  });

  it('keeps focus where it is when only the week changes', async () => {
    const user = userEvent.setup();
    await seedEverything();
    await openScreen('/zakupy/2026-10-21');

    const next = await screen.findByRole('link', { name: /Następny tydzień/ });
    await user.click(next);
    await waitFor(() => expect(screen.getByText(/26 października/)).toBeVisible());

    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();
  });
});
