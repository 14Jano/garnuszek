import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { setFavorite } from '../../data/favoriteRepository';
import { addMember } from '../../data/memberRepository';
import { assignRecipe, listPlanEntries, setEaters } from '../../data/planRepository';
import { listSnackOverrides } from '../../data/snackRepository';
import type { NewMember } from '../../domain/household/member';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

// 1815 kcal a day
const annaProfile: NewMember = {
  name: 'Anna',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activity: 'light',
  goal: 'maintain',
  snackKcal: 0,
};

// 2136 kcal a day
const bartekProfile: NewMember = {
  name: 'Bartek',
  sex: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 'sedentary',
  goal: 'maintain',
  snackKcal: 0,
};

const WEDNESDAY = '2026-10-21';

async function seedHousehold() {
  const anna = await addMember(annaProfile);
  const bartek = await addMember(bartekProfile);
  return { anna, bartek };
}

function slot(name: string) {
  return within(screen.getByRole('region', { name }));
}

beforeEach(async () => {
  await db.planEntries.clear();
  await db.members.clear();
  await db.customRecipes.clear();
  await db.favorites.clear();
  await db.snackOverrides.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('calendar without a household', () => {
  it('asks the user to add household members first', async () => {
    renderAt(`/kalendarz/${WEDNESDAY}`);

    expect(await screen.findByText(/najpierw dodaj domowników/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Przejdź do domowników' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Obiad' })).not.toBeInTheDocument();
  });
});

describe('week and day navigation', () => {
  it('shows the day from the address and marks it in its week', async () => {
    await seedHousehold();
    renderAt(`/kalendarz/${WEDNESDAY}`);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' }),
    ).toBeVisible();
    expect(screen.getByText('19–25 października')).toBeVisible();
    expect(screen.getByRole('link', { name: /^śr\. 21/ })).toHaveAttribute('aria-current', 'date');
    expect(screen.getByRole('link', { name: /^czw\. 22/ })).not.toHaveAttribute('aria-current');
  });

  it('moves to another day of the week', async () => {
    const user = userEvent.setup();
    await seedHousehold();
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await user.click(await screen.findByRole('link', { name: /^pt\. 23/ }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'piątek, 23 października' }),
    ).toBeVisible();
  });

  it('moves a week forward and back, keeping the weekday', async () => {
    const user = userEvent.setup();
    await seedHousehold();
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await user.click(await screen.findByRole('link', { name: 'Następny tydzień' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'środa, 28 października' }),
    ).toBeVisible();
    expect(screen.getByText('26 października – 1 listopada')).toBeVisible();

    await user.click(screen.getByRole('link', { name: 'Poprzedni tydzień' }));
    await user.click(screen.getByRole('link', { name: 'Poprzedni tydzień' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'środa, 14 października' }),
    ).toBeVisible();
  });

  it('opens today when the address has no day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
    await seedHousehold();
    renderAt('/kalendarz');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' }),
    ).toBeVisible();
  });

  it('replaces an invalid day in the address with today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
    await seedHousehold();
    renderAt('/kalendarz/2026-02-31');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' }),
    ).toBeVisible();
  });

  it('jumps back to today with the "Dziś" button', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
    const user = userEvent.setup();
    await seedHousehold();
    renderAt('/kalendarz/2026-11-12');

    await user.click(await screen.findByRole('link', { name: 'Dziś' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' }),
    ).toBeVisible();
  });

  it('marks the days that have planned meals', async () => {
    const { anna } = await seedHousehold();
    await assignRecipe('2026-10-23', 'dinner', 'salatka-grecka', [anna.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    expect(
      await screen.findByRole('link', { name: /^pt\. 23.*zaplanowane posiłki/ }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /^czw\. 22/ })).not.toHaveTextContent('zaplanowane');
  });
});

describe('planning a meal', () => {
  it('offers three empty slots for a new day', async () => {
    await seedHousehold();
    renderAt(`/kalendarz/${WEDNESDAY}`);

    expect(await screen.findByRole('link', { name: 'Dodaj danie: Śniadanie' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Dodaj danie: Obiad' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Dodaj danie: Kolacja' })).toBeVisible();
  });

  it('adds a dish and sizes the portions for each person', async () => {
    const user = userEvent.setup();
    await seedHousehold();
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await user.click(await screen.findByRole('link', { name: 'Dodaj danie: Obiad' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Wybierz danie' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Wybierz: Chili sin carne' }));

    expect(await screen.findByRole('link', { name: 'Chili sin carne' })).toBeVisible();
    // Lunch is 40% of the day: 726 kcal for Anna and 854.4 kcal for Bartek, at 363.5 kcal a serving
    expect(slot('Obiad').getByText('Anna: 2 porcje, 727 kcal')).toBeVisible();
    expect(slot('Obiad').getByText('Bartek: 2,35 porcji, 854 kcal')).toBeVisible();
    expect(slot('Obiad').getByText('Do ugotowania: 4,35 porcji')).toBeVisible();

    const planned = await listPlanEntries(WEDNESDAY, WEDNESDAY);
    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({ mealType: 'lunch', recipeId: 'chili-sin-carne' });
    expect(planned[0]?.memberIds).toHaveLength(2);
  });

  it('lists the ingredients for everyone together', async () => {
    const { anna, bartek } = await seedHousehold();
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id, bartek.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await screen.findByRole('link', { name: 'Chili sin carne' });

    // 400 g beans shared by 4 servings, times 4.35 servings: 435 g
    expect(
      slot('Obiad').getByText('Fasola czerwona z puszki (odsączona): 435 g'),
    ).toBeInTheDocument();
  });

  it('summarises the day against each personal target', async () => {
    const { anna, bartek } = await seedHousehold();
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id, bartek.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    expect(await screen.findByText('Anna: 727 z 1815 kcal')).toBeVisible();
    expect(screen.getByText('Bartek: 854 z 2136 kcal')).toBeVisible();
  });

  it('lets the user leave someone out of a meal and remembers it', async () => {
    const user = userEvent.setup();
    const { anna, bartek } = await seedHousehold();
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id, bartek.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await user.click(
      await within(await screen.findByRole('region', { name: 'Obiad' })).findByRole('checkbox', {
        name: 'Bartek',
      }),
    );

    await waitFor(() => {
      expect(slot('Obiad').queryByText(/^Bartek:/)).not.toBeInTheDocument();
    });
    expect(slot('Obiad').getByText('Do ugotowania: 2 porcje')).toBeVisible();
    expect(slot('Obiad').getByRole('checkbox', { name: 'Bartek' })).not.toBeChecked();
    expect((await listPlanEntries(WEDNESDAY, WEDNESDAY))[0]?.memberIds).toEqual([anna.id]);
  });

  it('says so when nobody eats a meal', async () => {
    const { anna } = await seedHousehold();
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id]);
    await setEaters(WEDNESDAY, 'lunch', []);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    expect(await screen.findByText('Nikt nie je tego posiłku.')).toBeVisible();
  });

  it('removes a dish from the plan', async () => {
    const user = userEvent.setup();
    const { anna } = await seedHousehold();
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await user.click(await screen.findByRole('button', { name: 'Usuń: Obiad' }));

    expect(await screen.findByRole('link', { name: 'Dodaj danie: Obiad' })).toBeVisible();
    expect(await listPlanEntries(WEDNESDAY, WEDNESDAY)).toEqual([]);
  });

  it('offers to replace a meal whose recipe no longer exists', async () => {
    const user = userEvent.setup();
    const { anna } = await seedHousehold();
    await assignRecipe(WEDNESDAY, 'lunch', 'recipe-that-is-gone', [anna.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    expect(await screen.findByText(/Nie znaleziono przepisu/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Wybierz inne danie: Obiad' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Usuń: Obiad' }));
    expect(await screen.findByRole('link', { name: 'Dodaj danie: Obiad' })).toBeVisible();
  });
});

describe('snacks', () => {
  it('sizes meals for what is left after the usual snacks', async () => {
    const anna = await addMember({ ...annaProfile, snackKcal: 300 });
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    // Lunch is 40% of the 1515 kcal left, which at 363.5 kcal a serving is 1.65 servings
    expect(await screen.findByText('Anna: 1,65 porcji, 600 kcal')).toBeVisible();
    expect(screen.getByText('Anna: 900 z 1815 kcal (w tym przekąski: 300 kcal)')).toBeVisible();
  });

  it('shows the usual amount for each person', async () => {
    await addMember({ ...annaProfile, snackKcal: 300 });
    await addMember(bartekProfile);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    const snacks = within(await screen.findByRole('region', { name: 'Przekąski na ten dzień' }));

    expect(snacks.getByLabelText('Anna')).toHaveValue(300);
    expect(snacks.getByLabelText('Bartek')).toHaveValue(0);
  });

  it('lets one day have its own amount and goes back on request', async () => {
    const user = userEvent.setup();
    const { anna, bartek } = await seedHousehold();
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id, bartek.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);
    const snacks = within(await screen.findByRole('region', { name: 'Przekąski na ten dzień' }));

    const input = snacks.getByLabelText('Anna');
    await user.clear(input);
    await user.type(input, '300');
    await user.tab();

    expect(await screen.findByText('Anna: 1,65 porcji, 600 kcal')).toBeVisible();
    expect(screen.getByText('Bartek: 2,35 porcji, 854 kcal')).toBeVisible();
    expect(await listSnackOverrides(WEDNESDAY, WEDNESDAY)).toEqual([
      { date: WEDNESDAY, memberId: anna.id, kcal: 300 },
    ]);

    await user.click(snacks.getByRole('button', { name: 'Przywróć domyślne przekąski: Anna' }));

    expect(await screen.findByText('Anna: 2 porcje, 727 kcal')).toBeVisible();
    expect(await listSnackOverrides(WEDNESDAY, WEDNESDAY)).toEqual([]);
  });

  it('does not store an amount that equals the usual one', async () => {
    const user = userEvent.setup();
    await addMember({ ...annaProfile, snackKcal: 300 });
    renderAt(`/kalendarz/${WEDNESDAY}`);
    const input = within(
      await screen.findByRole('region', { name: 'Przekąski na ten dzień' }),
    ).getByLabelText('Anna');

    await user.clear(input);
    await user.type(input, '300');
    await user.tab();

    expect(await listSnackOverrides(WEDNESDAY, WEDNESDAY)).toEqual([]);
  });

  it('keeps a zero as a day without snacks', async () => {
    const user = userEvent.setup();
    await addMember({ ...annaProfile, snackKcal: 300 });
    renderAt(`/kalendarz/${WEDNESDAY}`);
    const input = within(
      await screen.findByRole('region', { name: 'Przekąski na ten dzień' }),
    ).getByLabelText('Anna');

    await user.clear(input);
    await user.type(input, '0');
    await user.tab();

    expect(await listSnackOverrides(WEDNESDAY, WEDNESDAY)).toHaveLength(1);
    expect(
      await screen.findByRole('button', { name: 'Przywróć domyślne przekąski: Anna' }),
    ).toBeVisible();
  });

  it('shows the saved amount again when the input is not usable', async () => {
    const user = userEvent.setup();
    await addMember({ ...annaProfile, snackKcal: 300 });
    renderAt(`/kalendarz/${WEDNESDAY}`);
    const input = within(
      await screen.findByRole('region', { name: 'Przekąski na ten dzień' }),
    ).getByLabelText('Anna');

    await user.clear(input);
    await user.type(input, '5000');
    await user.tab();

    expect(input).toHaveValue(300);
    expect(await listSnackOverrides(WEDNESDAY, WEDNESDAY)).toEqual([]);
  });

  it('applies only to the chosen day', async () => {
    const user = userEvent.setup();
    await addMember(annaProfile);
    renderAt(`/kalendarz/${WEDNESDAY}`);
    const input = within(
      await screen.findByRole('region', { name: 'Przekąski na ten dzień' }),
    ).getByLabelText('Anna');
    await user.clear(input);
    await user.type(input, '300');
    await user.tab();

    await user.click(await screen.findByRole('link', { name: /^czw\. 22/ }));

    const nextDay = within(await screen.findByRole('region', { name: 'Przekąski na ten dzień' }));
    expect(nextDay.getByLabelText('Anna')).toHaveValue(0);
  });
});

describe('cooking for several days', () => {
  const THURSDAY = '2026-10-22';
  const FRIDAY = '2026-10-23';

  async function seedLunch(...extra: [string, string][]) {
    const { anna, bartek } = await seedHousehold();
    const eaters = [anna.id, bartek.id];
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', eaters);
    for (const [date, recipeId] of extra) await assignRecipe(date, 'lunch', recipeId, eaters);
    return { anna, bartek };
  }

  it('offers to cook a dish for one to four days', async () => {
    await seedLunch();
    renderAt(`/kalendarz/${WEDNESDAY}`);

    const picker = await screen.findByLabelText('Gotuj na');
    const lunch = slot('Obiad');

    expect(picker).toHaveValue('1');
    expect(
      within(picker)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['1 dzień', '2 dni', '3 dni', '4 dni']);
    expect(lunch.queryByText(/Resztki zjecie do/)).not.toBeInTheDocument();
  });

  it('fills the next days with leftovers and says how much to cook for all of them', async () => {
    const user = userEvent.setup();
    await seedLunch();
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await user.selectOptions(await screen.findByLabelText('Gotuj na'), '3 dni');

    // Two days of 4.35 servings become three
    expect(await screen.findByText('Do ugotowania: 13,05 porcji (na 3 dni)')).toBeVisible();
    expect(screen.getByText('Resztki zjecie do: piątek, 23 października.')).toBeVisible();

    await user.click(screen.getByRole('link', { name: /^czw\. 22/ }));

    expect(await screen.findByText(/Resztki z: środa, 21 października/)).toBeVisible();
    expect(slot('Obiad').getByRole('link', { name: 'Chili sin carne' })).toBeVisible();
    expect(slot('Obiad').getByText('Anna: 2 porcje, 727 kcal')).toBeVisible();
    expect(
      slot('Obiad').getByRole('link', { name: 'Przejdź do ugotowanego dania' }),
    ).toHaveAttribute('href', `/kalendarz/${WEDNESDAY}`);
  });

  it('does not offer to cook, swap or remove on a leftover day', async () => {
    const user = userEvent.setup();
    await seedLunch();
    renderAt(`/kalendarz/${WEDNESDAY}`);
    await user.selectOptions(await screen.findByLabelText('Gotuj na'), '2 dni');

    await user.click(await screen.findByRole('link', { name: /^czw\. 22/ }));

    await screen.findByText(/Resztki z:/);
    expect(slot('Obiad').queryByLabelText('Gotuj na')).not.toBeInTheDocument();
    expect(slot('Obiad').queryByRole('link', { name: /^Wymień/ })).not.toBeInTheDocument();
    expect(slot('Obiad').queryByRole('button', { name: /^Usuń/ })).not.toBeInTheDocument();
    expect(slot('Obiad').queryByText(/Do ugotowania/)).not.toBeInTheDocument();
  });

  it('lets each day of the batch have its own eaters', async () => {
    const user = userEvent.setup();
    const { bartek } = await seedLunch();
    renderAt(`/kalendarz/${WEDNESDAY}`);
    await user.selectOptions(await screen.findByLabelText('Gotuj na'), '2 dni');

    await user.click(await screen.findByRole('link', { name: /^czw\. 22/ }));
    await user.click(await slot('Obiad').findByRole('checkbox', { name: 'Anna' }));

    await waitFor(async () => {
      expect((await listPlanEntries(THURSDAY, THURSDAY))[0]?.memberIds).toEqual([bartek.id]);
    });
    expect((await listPlanEntries(WEDNESDAY, WEDNESDAY))[0]?.memberIds).toHaveLength(2);
  });

  it('pushes the dishes planned for those days to later days', async () => {
    const user = userEvent.setup();
    await seedLunch([THURSDAY, 'curry-z-ciecierzycy-i-szpinaku'], [FRIDAY, 'spaghetti-bolognese']);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await user.selectOptions(await screen.findByLabelText('Gotuj na'), '2 dni');

    await waitFor(async () => {
      const lunches = (await listPlanEntries(WEDNESDAY, '2026-10-24')).map(
        (entry) => `${entry.date.slice(8)} ${entry.recipeId}`,
      );
      expect(lunches).toEqual([
        '21 chili-sin-carne',
        '22 chili-sin-carne',
        '23 curry-z-ciecierzycy-i-szpinaku',
        '24 spaghetti-bolognese',
      ]);
    });
  });

  it('can be undone: the later dishes come back to their days', async () => {
    const user = userEvent.setup();
    await seedLunch([THURSDAY, 'curry-z-ciecierzycy-i-szpinaku']);
    renderAt(`/kalendarz/${WEDNESDAY}`);
    const picker = await screen.findByLabelText('Gotuj na');
    await user.selectOptions(picker, '2 dni');
    await screen.findByText(/na 2 dni/);

    await user.selectOptions(screen.getByLabelText('Gotuj na'), '1 dzień');

    await waitFor(async () => {
      const lunches = (await listPlanEntries(WEDNESDAY, '2026-10-24')).map(
        (entry) => `${entry.date.slice(8)} ${entry.recipeId}`,
      );
      expect(lunches).toEqual(['21 chili-sin-carne', '22 curry-z-ciecierzycy-i-szpinaku']);
    });
  });

  it('swaps the dish on all days of the batch', async () => {
    const user = userEvent.setup();
    await seedLunch();
    renderAt(`/kalendarz/${WEDNESDAY}`);
    await user.selectOptions(await screen.findByLabelText('Gotuj na'), '2 dni');

    await user.click(await screen.findByRole('link', { name: 'Wymień: Chili sin carne' }));
    await user.click(
      await screen.findByRole('button', { name: 'Wybierz: Curry z ciecierzycy i szpinaku' }),
    );

    await screen.findByRole('link', { name: 'Curry z ciecierzycy i szpinaku' });
    await user.click(screen.getByRole('link', { name: /^czw\. 22/ }));
    expect(
      await slot('Obiad').findByRole('link', { name: 'Curry z ciecierzycy i szpinaku' }),
    ).toBeVisible();
  });

  it('removes all days of the batch together', async () => {
    const user = userEvent.setup();
    await seedLunch();
    renderAt(`/kalendarz/${WEDNESDAY}`);
    await user.selectOptions(await screen.findByLabelText('Gotuj na'), '3 dni');
    await screen.findByText(/na 3 dni/);

    await user.click(screen.getByRole('button', { name: 'Usuń: Obiad' }));

    expect(await screen.findByRole('link', { name: 'Dodaj danie: Obiad' })).toBeVisible();
    expect(await listPlanEntries(WEDNESDAY, '2026-10-25')).toEqual([]);
  });

  it('explains that leftovers cannot be swapped when the address is opened directly', async () => {
    await seedLunch();
    const { setBatchDays } = await import('../../data/planRepository');
    await setBatchDays(WEDNESDAY, 'lunch', 2);
    renderAt(`/kalendarz/${THURSDAY}/lunch/wybierz`);

    expect(await screen.findByRole('heading', { name: 'To są resztki' })).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Przejdź do dnia, w którym je gotujesz' }),
    ).toHaveAttribute('href', `/kalendarz/${WEDNESDAY}`);
  });
});

describe('swapping a dish', () => {
  it('replaces the dish for the same people', async () => {
    const user = userEvent.setup();
    const { anna, bartek } = await seedHousehold();
    await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', [anna.id, bartek.id]);
    await setEaters(WEDNESDAY, 'lunch', [bartek.id]);
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await user.click(await screen.findByRole('link', { name: 'Wymień: Chili sin carne' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Wymień danie' })).toBeVisible();
    expect(screen.getByText(/obecnie wybrane/)).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Wybierz: Curry z ciecierzycy i szpinaku' }),
    );

    expect(
      await screen.findByRole('link', { name: 'Curry z ciecierzycy i szpinaku' }),
    ).toBeVisible();
    expect(slot('Obiad').getByRole('checkbox', { name: 'Bartek' })).toBeChecked();
    expect(slot('Obiad').getByRole('checkbox', { name: 'Anna' })).not.toBeChecked();
  });
});

describe('choosing a dish', () => {
  it('shows only dishes for the meal and puts favorites first', async () => {
    await seedHousehold();
    await setFavorite('chili-sin-carne', true);
    renderAt(`/kalendarz/${WEDNESDAY}/lunch/wybierz`);

    await screen.findByText('Spaghetti bolognese');
    const items = within(screen.getByRole('main')).getAllByRole('listitem');

    expect(items[0]).toHaveTextContent('Chili sin carne');
    expect(items[0]).toHaveTextContent('ulubione');
    expect(screen.getByText('Spaghetti bolognese')).toBeVisible();
    expect(screen.queryByText('Szakszuka')).not.toBeInTheDocument();
  });

  it('searches by name or ingredient', async () => {
    const user = userEvent.setup();
    await seedHousehold();
    renderAt(`/kalendarz/${WEDNESDAY}/lunch/wybierz`);

    await user.type(await screen.findByLabelText('Szukaj przepisu lub składnika'), 'losos');

    expect(screen.getByText('Pieczony łosoś z batatami i brokułem')).toBeVisible();
    expect(screen.queryByText('Spaghetti bolognese')).not.toBeInTheDocument();
  });

  it('can be cancelled', async () => {
    const user = userEvent.setup();
    await seedHousehold();
    renderAt(`/kalendarz/${WEDNESDAY}/lunch/wybierz`);

    await user.click(await screen.findByRole('link', { name: 'Anuluj' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'środa, 21 października' }),
    ).toBeVisible();
  });

  it('needs household members to size the portions', async () => {
    renderAt(`/kalendarz/${WEDNESDAY}/lunch/wybierz`);

    expect(await screen.findByText(/Najpierw dodaj domowników/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Wybierz:/ })).not.toBeInTheDocument();
  });

  it('rejects an unknown meal', async () => {
    renderAt(`/kalendarz/${WEDNESDAY}/podwieczorek/wybierz`);

    expect(await screen.findByRole('heading', { name: 'Nie ma takiego posiłku' })).toBeVisible();
  });
});
