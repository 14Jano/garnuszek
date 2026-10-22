import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import { addMember, listMembers } from '../../data/memberRepository';
import type { NewMember } from '../../domain/household/member';
import { HouseholdPage } from './HouseholdPage';

const anna: NewMember = {
  name: 'Anna',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activity: 'light',
  goal: 'maintain',
  snackKcal: 0,
};

beforeEach(async () => {
  await db.members.clear();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <HouseholdPage />
    </MemoryRouter>,
  );
}

async function fillBasics(
  user: UserEvent,
  values: { name: string; age: string; height: string; weight: string },
) {
  await user.type(screen.getByLabelText('Imię'), values.name);
  await user.type(screen.getByLabelText('Wiek (lata)'), values.age);
  await user.type(screen.getByLabelText('Wzrost (cm)'), values.height);
  await user.type(screen.getByLabelText('Waga (kg)'), values.weight);
}

describe('HouseholdPage', () => {
  it('invites the user to add the first member', async () => {
    renderPage();

    expect(await screen.findByText(/Nie ma tu jeszcze nikogo/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Dodaj domownika' })).toBeVisible();
  });

  it('adds a member, stores it and shows the daily calorie target', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await fillBasics(user, { name: 'Anna', age: '30', height: '165', weight: '60' });
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Anna' })).toBeVisible();
    // 1320.25 kcal at rest, lightly active, keeping weight
    expect(screen.getByText('1815 kcal')).toBeVisible();
    expect((await listMembers()).map((member) => member.name)).toEqual(['Anna']);
  });

  it('explains what is missing and does not save an incomplete form', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    expect(screen.getByText('Wpisz imię lub pseudonim.')).toBeVisible();
    expect(screen.getByText('Podaj wiek.')).toBeVisible();
    expect(screen.getByText('Podaj wzrost.')).toBeVisible();
    expect(screen.getByText('Podaj wagę.')).toBeVisible();
    expect(screen.getByLabelText('Imię')).toHaveFocus();
    expect(screen.getByLabelText('Imię')).toHaveAttribute('aria-invalid', 'true');
    expect(await listMembers()).toEqual([]);
  });

  it('clears a field error as soon as the user starts fixing it', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await user.type(screen.getByLabelText('Imię'), 'A');

    expect(screen.queryByText('Wpisz imię lub pseudonim.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Imię')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('Podaj wiek.')).toBeVisible();
  });

  it('saves how many calories go to snacks and shows it on the card', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await fillBasics(user, { name: 'Anna', age: '30', height: '165', weight: '60' });
    const snacks = screen.getByLabelText('Przekąski (kcal dziennie)');
    expect(snacks).toHaveValue(0);
    await user.clear(snacks);
    await user.type(snacks, '200');
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    expect(await screen.findByText('Na przekąski: 200 kcal dziennie.')).toBeVisible();
    expect((await listMembers())[0]?.snackKcal).toBe(200);
  });

  it('does not mention snacks on the card when there are none', async () => {
    await addMember(anna);
    renderPage();

    await screen.findByRole('heading', { name: 'Anna' });

    expect(screen.queryByText(/Na przekąski/)).not.toBeInTheDocument();
  });

  it('asks for a sensible snack amount', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    const snacks = screen.getByLabelText('Przekąski (kcal dziennie)');
    await user.clear(snacks);
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    expect(screen.getByText(/Podaj kalorie na przekąski/)).toBeVisible();

    await user.type(snacks, '5000');
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    expect(screen.getByText('Podaj kalorie w pełnych liczbach, od 0 do 1000.')).toBeVisible();
  });

  it('asks for a target weight only when losing or gaining weight', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await user.type(screen.getByLabelText('Wiek (lata)'), '30');

    expect(screen.queryByLabelText('Docelowa waga (kg)')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Cel'), 'Schudnąć');
    expect(screen.getByLabelText('Docelowa waga (kg)')).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Cel'), 'Przytyć');
    expect(screen.getByLabelText('Docelowa waga (kg)')).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Cel'), 'Utrzymać wagę');
    expect(screen.queryByLabelText('Docelowa waga (kg)')).not.toBeInTheDocument();
  });

  it('saves a target weight and shows it on the card', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await fillBasics(user, { name: 'Anna', age: '30', height: '165', weight: '70' });
    await user.selectOptions(screen.getByLabelText('Cel'), 'Schudnąć');
    await user.type(screen.getByLabelText('Docelowa waga (kg)'), '62.5');

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    expect(await screen.findByText('Docelowa waga: 62,5 kg.')).toBeVisible();
    expect((await listMembers())[0]?.targetWeightKg).toBe(62.5);
  });

  it('allows leaving the target weight empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await fillBasics(user, { name: 'Anna', age: '30', height: '165', weight: '70' });
    await user.selectOptions(screen.getByLabelText('Cel'), 'Przytyć');

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    expect(await screen.findByRole('heading', { name: 'Anna' })).toBeVisible();
    expect((await listMembers())[0]?.targetWeightKg).toBeUndefined();
  });

  it('rejects a target on the wrong side of the current weight', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await fillBasics(user, { name: 'Anna', age: '30', height: '165', weight: '70' });
    await user.selectOptions(screen.getByLabelText('Cel'), 'Schudnąć');
    await user.type(screen.getByLabelText('Docelowa waga (kg)'), '75');

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    expect(screen.getByText(/Podaj docelową wagę w kilogramach/)).toBeVisible();
    expect(screen.getByLabelText('Docelowa waga (kg)')).toHaveFocus();
    expect(await listMembers()).toEqual([]);
  });

  it('forgets the target weight when the goal becomes keeping weight', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await fillBasics(user, { name: 'Anna', age: '30', height: '165', weight: '70' });
    await user.selectOptions(screen.getByLabelText('Cel'), 'Schudnąć');
    await user.type(screen.getByLabelText('Docelowa waga (kg)'), '62');
    await user.selectOptions(screen.getByLabelText('Cel'), 'Utrzymać wagę');

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    expect(await screen.findByRole('heading', { name: 'Anna' })).toBeVisible();
    expect((await listMembers())[0]?.targetWeightKg).toBeUndefined();
  });

  it('writes a fractional weight with a decimal comma', async () => {
    await addMember({ ...anna, weightKg: 68.5 });
    renderPage();

    expect(await screen.findByText(/165 cm, 68,5 kg/)).toBeVisible();
  });

  it('saves what a member avoids and says so on the card', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await fillBasics(user, { name: 'Anna', age: '30', height: '165', weight: '60' });

    await user.selectOptions(
      screen.getByLabelText('Dieta'),
      'Wegańska (bez mięsa, ryb, nabiału i jajek)',
    );
    await user.click(screen.getByRole('checkbox', { name: 'Gluten' }));
    await user.selectOptions(screen.getByLabelText('Inne składniki, których unika'), 'Cebula');
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    expect(await screen.findByText('Unika: dieta wegańska, gluten, cebula.')).toBeVisible();
    expect((await listMembers())[0]?.restrictions).toEqual({
      diet: 'vegan',
      allergens: ['gluten'],
      avoidedIngredientIds: ['onion'],
    });
  });

  it('stores nothing about restrictions for someone who avoids nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await fillBasics(user, { name: 'Anna', age: '30', height: '165', weight: '60' });

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    expect(await screen.findByRole('heading', { name: 'Anna' })).toBeVisible();
    expect(screen.queryByText(/Unika:/)).not.toBeInTheDocument();
    expect((await listMembers())[0]).not.toHaveProperty('restrictions');
  });

  it('keeps the allergens in the order of the list, whatever order they are ticked in', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await fillBasics(user, { name: 'Anna', age: '30', height: '165', weight: '60' });

    await user.click(screen.getByRole('checkbox', { name: 'Sezam' }));
    await user.click(screen.getByRole('checkbox', { name: 'Jajka' }));
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    await screen.findByRole('heading', { name: 'Anna' });
    expect((await listMembers())[0]?.restrictions?.allergens).toEqual(['eggs', 'sesame']);
  });

  it('removes an ingredient from the list and keeps focus in the form', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    const add = screen.getByLabelText('Inne składniki, których unika');

    await user.selectOptions(add, 'Cebula');
    await user.selectOptions(add, 'Czosnek');
    const list = screen.getByRole('list', { name: 'Składniki, których unika' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Nie unika już: Cebula' }));

    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).queryByText('Cebula')).not.toBeInTheDocument();
    expect(add).toHaveFocus();
  });

  it('offers an ingredient only once', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    const add = screen.getByLabelText('Inne składniki, których unika');

    await user.selectOptions(add, 'Cebula');

    expect(within(add).queryByRole('option', { name: 'Cebula' })).not.toBeInTheDocument();
  });

  it('shows what a member avoids when editing, and lets the user clear it', async () => {
    const user = userEvent.setup();
    await addMember({
      ...anna,
      restrictions: { diet: 'vegetarian', allergens: ['milk'], avoidedIngredientIds: ['onion'] },
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Edytuj: Anna' }));
    expect(screen.getByLabelText('Dieta')).toHaveValue('vegetarian');
    expect(screen.getByRole('checkbox', { name: 'Mleko i nabiał' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Gluten' })).not.toBeChecked();

    await user.selectOptions(screen.getByLabelText('Dieta'), 'Je wszystko');
    await user.click(screen.getByRole('checkbox', { name: 'Mleko i nabiał' }));
    await user.click(screen.getByRole('button', { name: 'Nie unika już: Cebula' }));
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Anna' })).toBeVisible();
    expect(screen.queryByText(/Unika:/)).not.toBeInTheDocument();
    expect((await listMembers())[0]).not.toHaveProperty('restrictions');
  });

  it('reminds the user that this is help with planning, not a guarantee', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));

    expect(screen.getByText(/przy alergii zawsze czytaj etykiety/)).toBeVisible();
  });

  it('links each member to their measurements', async () => {
    const saved = await addMember(anna);
    renderPage();

    const link = await screen.findByRole('link', { name: 'Pomiary i postępy: Anna' });

    expect(link).toHaveAttribute('href', `/domownicy/${saved.id}/pomiary`);
  });

  it('locks the goal to keeping weight for children', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await user.type(screen.getByLabelText('Wiek (lata)'), '10');

    const goal = screen.getByLabelText('Cel');
    expect(goal).toBeDisabled();
    expect(goal).toHaveValue('maintain');
    expect(screen.getByText(/dostępny jest tylko cel/)).toBeVisible();
  });

  it('returns to the list when the user cancels', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Dodaj domownika' }));
    await user.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(await screen.findByText(/Nie ma tu jeszcze nikogo/)).toBeVisible();
  });

  it('edits an existing member and recalculates the target', async () => {
    const user = userEvent.setup();
    await addMember(anna);
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Edytuj: Anna' }));
    expect(screen.getByLabelText('Imię')).toHaveValue('Anna');

    const weight = screen.getByLabelText('Waga (kg)');
    await user.clear(weight);
    await user.type(weight, '70');
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

    // 1420.25 kcal at rest, lightly active, keeping weight
    expect(await screen.findByText('1953 kcal')).toBeVisible();
    expect((await listMembers())[0]?.weightKg).toBe(70);
  });

  it('removes a member only after confirmation', async () => {
    const user = userEvent.setup();
    await addMember(anna);
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Usuń: Anna' }));
    await user.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(screen.getByRole('heading', { name: 'Anna' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Usuń: Anna' }));
    await user.click(screen.getByRole('button', { name: 'Tak, usuń' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Anna' })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Nie ma tu jeszcze nikogo/)).toBeVisible();
    expect(await listMembers()).toEqual([]);
  });
});
