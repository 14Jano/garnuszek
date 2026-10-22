import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import { INGREDIENTS } from '../../content/ingredients';
import { db } from '../../data/db';
import { addMember } from '../../data/memberRepository';
import { assignRecipe } from '../../data/planRepository';
import type { NewMember } from '../../domain/household/member';
import type { Restrictions } from '../../domain/household/restrictions';

const WEDNESDAY = '2026-10-21';

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

const avoidsMilk: Restrictions = { allergens: ['milk'], avoidedIngredientIds: [] };
const vegetarian: Restrictions = { diet: 'vegetarian', allergens: [], avoidedIngredientIds: [] };

beforeEach(async () => {
  await db.members.clear();
  await db.planEntries.clear();
});

describe('a planned dish that someone avoids', () => {
  it('warns who avoids what in it', async () => {
    const anna = await addMember(person('Anna', avoidsMilk));
    const bartek = await addMember(person('Bartek'));
    // The oatmeal is cooked in milk.
    await assignRecipe(WEDNESDAY, 'breakfast', 'owsianka-z-bananem-i-orzechami', [
      anna.id,
      bartek.id,
    ]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    const warning = await screen.findByRole('note', { name: '' });
    expect(warning).toHaveTextContent('Uwaga: w tym daniu jest coś, czego unikają');
    expect(warning).toHaveTextContent('Anna: mleko i nabiał (mleko 2%)');
    expect(warning).not.toHaveTextContent('Bartek');
  });

  it('says nothing when the dish suits everyone who eats it', async () => {
    const anna = await addMember(person('Anna', avoidsMilk));
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await screen.findByRole('link', { name: 'Chili sin carne' });

    expect(screen.queryByText(/czego unikają/)).not.toBeInTheDocument();
  });

  it('takes the warning back when the person who avoids it is left out', async () => {
    const user = userEvent.setup();
    const anna = await addMember(person('Anna', avoidsMilk));
    const bartek = await addMember(person('Bartek'));
    await assignRecipe(WEDNESDAY, 'breakfast', 'owsianka-z-bananem-i-orzechami', [
      anna.id,
      bartek.id,
    ]);
    renderAt(`/kalendarz/${WEDNESDAY}`);
    await screen.findByText(/czego unikają/);

    await user.click(screen.getByRole('checkbox', { name: 'Anna' }));

    await waitFor(() => expect(screen.queryByText(/czego unikają/)).not.toBeInTheDocument());
  });

  it('warns about a diet', async () => {
    const anna = await addMember(person('Anna', vegetarian));
    await assignRecipe(WEDNESDAY, 'lunch', 'spaghetti-bolognese', [anna.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    expect(await screen.findByText('Anna: dieta wegetariańska')).toBeVisible();
  });
});

describe('choosing a dish', () => {
  it('hides the dishes that someone who eats it avoids, and says how many', async () => {
    await addMember(person('Anna', vegetarian));
    renderAt(`/kalendarz/${WEDNESDAY}/lunch/wybierz`);

    expect(await screen.findByRole('button', { name: 'Wybierz: Chili sin carne' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Wybierz: Spaghetti bolognese' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Ukryto dań, których ktoś unika: \d+\./);
  });

  it('shows them again, with a warning, when the user asks', async () => {
    const user = userEvent.setup();
    await addMember(person('Anna', vegetarian));
    renderAt(`/kalendarz/${WEDNESDAY}/lunch/wybierz`);

    await user.click(
      await screen.findByRole('checkbox', { name: 'Ukryj dania, których ktoś unika' }),
    );

    const spaghetti = screen
      .getByRole('button', { name: 'Wybierz: Spaghetti bolognese' })
      .closest('li');
    expect(spaghetti).not.toBeNull();
    expect(
      within(spaghetti as HTMLElement).getByText('Uwaga, Anna: dieta wegetariańska'),
    ).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('explains an empty list when every dish is hidden', async () => {
    // Someone who avoids every ingredient leaves no dish at all.
    await addMember(
      person('Anna', { allergens: [], avoidedIngredientIds: INGREDIENTS.map(({ id }) => id) }),
    );
    renderAt(`/kalendarz/${WEDNESDAY}/lunch/wybierz`);

    expect(await screen.findByText(/wszystkie są ukryte/)).toBeVisible();
    expect(screen.queryByText('Nic nie pasuje do wyszukiwania.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Wybierz:/ })).not.toBeInTheDocument();
  });

  it('still says that nothing matches a search when nothing is hidden', async () => {
    const user = userEvent.setup();
    await addMember(person('Anna'));
    renderAt(`/kalendarz/${WEDNESDAY}/lunch/wybierz`);

    await user.type(await screen.findByLabelText('Szukaj przepisu lub składnika'), 'xyzxyz');

    expect(screen.getByText('Nic nie pasuje do wyszukiwania.')).toBeVisible();
  });

  it('does not offer the filter when nobody avoids anything', async () => {
    await addMember(person('Anna'));
    renderAt(`/kalendarz/${WEDNESDAY}/lunch/wybierz`);

    await screen.findByRole('button', { name: 'Wybierz: Chili sin carne' });

    expect(
      screen.queryByRole('checkbox', { name: 'Ukryj dania, których ktoś unika' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wybierz: Spaghetti bolognese' })).toBeVisible();
  });

  it('only counts the people who eat that meal when it is already planned', async () => {
    await addMember(person('Anna', vegetarian));
    const bartek = await addMember(person('Bartek'));
    // Anna is not at this dinner, so what she avoids does not matter for it.
    await assignRecipe(WEDNESDAY, 'dinner', 'salatka-grecka', [bartek.id]);
    renderAt(`/kalendarz/${WEDNESDAY}/dinner/wybierz`);

    await screen.findAllByRole('button', { name: /^Wybierz:/ });

    expect(
      screen.queryByRole('checkbox', { name: 'Ukryj dania, których ktoś unika' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
