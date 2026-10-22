import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { BUILTIN_RECIPES } from '../../content/recipes';
import { db } from '../../data/db';
import { addMember } from '../../data/memberRepository';
import { assignRecipe, listPlanEntries } from '../../data/planRepository';
import type { NewMember } from '../../domain/household/member';
import type { Restrictions } from '../../domain/household/restrictions';

const WEDNESDAY = '2026-10-21';
const MONDAY = '2026-10-19';
const SUNDAY = '2026-10-25';
const PATH = `/kalendarz/${WEDNESDAY}/uloz`;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function person(name: string, restrictions?: Restrictions): NewMember {
  return {
    name,
    sex: 'female',
    age: 30,
    heightCm: 165,
    weightKg: 60,
    activity: 'light',
    goal: 'maintain',
    snackKcal: 0,
    ...(restrictions ? { restrictions } : {}),
  };
}

beforeEach(async () => {
  await db.members.clear();
  await db.planEntries.clear();
  await db.favorites.clear();
  await db.customRecipes.clear();
  // The first plan is the one for seed 1, so these tests do not depend on luck.
  vi.spyOn(Math, 'random').mockReturnValue(1 / 2 ** 31);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mealsOf(day: string) {
  return within(screen.getByRole('heading', { level: 3, name: day }).closest('li') as HTMLElement);
}

describe('the proposal for a week', () => {
  it('asks to add household members first', async () => {
    renderAt(PATH);

    expect(await screen.findByText(/Najpierw dodaj domowników/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Przejdź do domowników' })).toBeVisible();
  });

  it('says so for an address that is not a day', async () => {
    renderAt('/kalendarz/nie-dzien/uloz');

    expect(await screen.findByRole('heading', { name: 'Nie ma takiego tygodnia' })).toBeVisible();
  });

  it('proposes a dish for every meal of the week', async () => {
    await addMember(person('Anna'));
    renderAt(PATH);

    expect(await screen.findByText('Do zapisania: 21 posiłków.')).toBeVisible();
    expect(screen.getByText('19–25 października')).toBeVisible();
    // Seven days, each with a breakfast, a lunch and a dinner
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(7);
    expect(screen.queryByText(/brak pasującego dania/)).not.toBeInTheDocument();
  });

  it('does not save anything until the user says so', async () => {
    await addMember(person('Anna'));
    renderAt(PATH);

    await screen.findByText('Do zapisania: 21 posiłków.');

    expect(await listPlanEntries(MONDAY, SUNDAY)).toEqual([]);
  });

  it('saves the proposal, for everyone, and goes back to the calendar', async () => {
    const user = userEvent.setup();
    const anna = await addMember(person('Anna'));
    const bartek = await addMember(person('Bartek'));
    renderAt(PATH);

    await user.click(await screen.findByRole('button', { name: 'Zapisz w planie' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' }),
    ).toBeVisible();
    const saved = await listPlanEntries(MONDAY, SUNDAY);
    expect(saved).toHaveLength(21);
    expect(saved.every(({ memberIds }) => memberIds.length === 2)).toBe(true);
    expect(saved[0]?.memberIds).toEqual([anna.id, bartek.id]);
  });

  it('saves exactly what it showed', async () => {
    const user = userEvent.setup();
    await addMember(person('Anna'));
    renderAt(PATH);
    await screen.findByText('Do zapisania: 21 posiłków.');
    const shown = [...document.querySelectorAll('.auto-plan__meal strong')].map(
      (dish) => dish.textContent,
    );

    await user.click(screen.getByRole('button', { name: 'Zapisz w planie' }));

    await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' });
    const saved = (await listPlanEntries(MONDAY, SUNDAY)).map(
      ({ recipeId }) => BUILTIN_RECIPES.find(({ id }) => id === recipeId)?.name,
    );
    expect(shown).toHaveLength(21);
    expect(saved).toEqual(shown);
  });

  it('proposes another plan when asked', async () => {
    const user = userEvent.setup();
    await addMember(person('Anna'));
    renderAt(PATH);
    await screen.findByText('Do zapisania: 21 posiłków.');
    const first = document.querySelector('.auto-plan__days')?.textContent;

    await user.click(screen.getByRole('button', { name: 'Wylosuj ponownie' }));

    await waitFor(() =>
      expect(document.querySelector('.auto-plan__days')?.textContent).not.toBe(first),
    );
    expect(screen.getByText('Do zapisania: 21 posiłków.')).toBeVisible();
    expect(await listPlanEntries(MONDAY, SUNDAY)).toEqual([]);
  });

  it('plans only the meals that are chosen', async () => {
    const user = userEvent.setup();
    await addMember(person('Anna'));
    renderAt(PATH);
    await screen.findByText('Do zapisania: 21 posiłków.');

    await user.click(screen.getByRole('checkbox', { name: 'Śniadania' }));
    await user.click(screen.getByRole('checkbox', { name: 'Kolacje' }));

    expect(screen.getByText('Do zapisania: 7 posiłków.')).toBeVisible();
    expect(screen.queryByText(/^Śniadanie:/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/^Obiad:/)).toHaveLength(7);

    await user.click(screen.getByRole('button', { name: 'Zapisz w planie' }));
    await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' });
    expect(
      (await listPlanEntries(MONDAY, SUNDAY)).every(({ mealType }) => mealType === 'lunch'),
    ).toBe(true);
  });

  it('asks to choose a meal when none is chosen', async () => {
    const user = userEvent.setup();
    await addMember(person('Anna'));
    renderAt(PATH);
    await screen.findByText('Do zapisania: 21 posiłków.');

    for (const name of ['Śniadania', 'Obiady', 'Kolacje']) {
      await user.click(screen.getByRole('checkbox', { name }));
    }

    expect(screen.getByText('Wybierz, które posiłki ułożyć.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Zapisz w planie' })).toBeDisabled();
  });

  it('leaves the meals that are planned and says so', async () => {
    const anna = await addMember(person('Anna'));
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id]);
    renderAt(PATH);

    expect(
      await screen.findByText('Do zapisania: 20 posiłków. Zajęte miejsca zostają: 1.'),
    ).toBeVisible();
    expect(mealsOf('środa, 21 października').getByText(/Obiad: Chili sin carne/)).toHaveTextContent(
      '(już zaplanowane)',
    );
  });

  it('never replaces a planned meal when it saves', async () => {
    const user = userEvent.setup();
    const anna = await addMember(person('Anna'));
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id]);
    renderAt(PATH);

    await user.click(await screen.findByRole('button', { name: 'Zapisz w planie' }));

    await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' });
    const wednesday = await listPlanEntries(WEDNESDAY, WEDNESDAY);
    expect(wednesday.find(({ mealType }) => mealType === 'lunch')?.recipeId).toBe(
      'chili-sin-carne',
    );
    expect(await listPlanEntries(MONDAY, SUNDAY)).toHaveLength(21);
  });

  it('says when there is nothing left to plan', async () => {
    const user = userEvent.setup();
    await addMember(person('Anna'));
    renderAt(PATH);
    await user.click(await screen.findByRole('button', { name: 'Zapisz w planie' }));
    await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' });

    await user.click(await screen.findByRole('link', { name: 'Ułóż tydzień' }));

    expect(
      await screen.findByText('W tym tygodniu nie ma pustych miejsc do uzupełnienia.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Zapisz w planie' })).toBeDisabled();
  });
});

describe('what the household avoids', () => {
  it('does not propose a dish with something that a member avoids', async () => {
    const user = userEvent.setup();
    await addMember(person('Anna', { allergens: ['milk'], avoidedIngredientIds: [] }));
    renderAt(PATH);

    await user.click(await screen.findByRole('button', { name: 'Zapisz w planie' }));

    await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' });
    const saved = await listPlanEntries(MONDAY, SUNDAY);
    expect(saved.length).toBeGreaterThan(0);
    // The oatmeal and the Greek salad are made with milk and feta.
    const ids = saved.map(({ recipeId }) => recipeId);
    expect(ids).not.toContain('owsianka-z-bananem-i-orzechami');
    expect(ids).not.toContain('salatka-grecka');
  });

  it('says which meals are left without a dish when nothing suits everyone', async () => {
    await addMember(
      person('Anna', {
        diet: 'vegan',
        allergens: ['gluten', 'soy', 'sesame', 'milk', 'eggs', 'fish', 'peanuts', 'tree-nuts'],
        avoidedIngredientIds: ['olive-oil', 'garlic', 'canned-tomatoes', 'bell-pepper'],
      }),
    );
    renderAt(PATH);

    expect(await screen.findByText(/Bez dania zostaje: \d+\./)).toBeVisible();
    expect(screen.getAllByText(/brak pasującego dania/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'własne przepisy' })).toBeVisible();
  });
});

describe('the way to the proposal', () => {
  it('is a link in the calendar once there are household members', async () => {
    const user = userEvent.setup();
    await addMember(person('Anna'));
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await user.click(await screen.findByRole('link', { name: 'Ułóż tydzień' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Ułóż tydzień' })).toBeVisible();
  });

  it('is not offered without household members', async () => {
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await screen.findByText(/najpierw dodaj domowników/);

    expect(screen.queryByRole('link', { name: 'Ułóż tydzień' })).not.toBeInTheDocument();
  });

  it('can be left without saving', async () => {
    const user = userEvent.setup();
    await addMember(person('Anna'));
    renderAt(PATH);

    await user.click(await screen.findByRole('link', { name: 'Anuluj' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' }),
    ).toBeVisible();
    expect(await listPlanEntries(MONDAY, SUNDAY)).toEqual([]);
  });
});
