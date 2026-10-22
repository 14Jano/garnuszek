import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { addMember } from '../../data/memberRepository';
import { assignRecipe, setBatchDays } from '../../data/planRepository';
import { listCheckedIngredients } from '../../data/shoppingRepository';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const WEDNESDAY = '2026-10-21';

/**
 * Anna and Bartek eat chili sin carne for lunch and a Greek salad for dinner.
 * Together that is 11 different ingredients; onion, red pepper and olive oil
 * are needed by both dishes.
 */
async function seedHousehold(annaSnackKcal = 0) {
  const anna = await addMember({
    name: 'Anna',
    sex: 'female',
    age: 30,
    heightCm: 165,
    weightKg: 60,
    activity: 'light',
    goal: 'maintain',
    snackKcal: annaSnackKcal,
  });
  const bartek = await addMember({
    name: 'Bartek',
    sex: 'male',
    age: 30,
    heightCm: 180,
    weightKg: 80,
    activity: 'sedentary',
    goal: 'maintain',
    snackKcal: 0,
  });
  return { anna, bartek };
}

async function seedWeek(annaSnackKcal = 0) {
  const { anna, bartek } = await seedHousehold(annaSnackKcal);
  const eaters = [anna.id, bartek.id];
  await assignRecipe(WEDNESDAY, 'lunch', 'chili-sin-carne', eaters);
  await assignRecipe(WEDNESDAY, 'dinner', 'salatka-grecka', eaters);
}

function section(name: string) {
  return within(screen.getByRole('region', { name }));
}

beforeEach(async () => {
  await db.planEntries.clear();
  await db.members.clear();
  await db.customRecipes.clear();
  await db.favorites.clear();
  await db.shoppingChecks.clear();
  await db.snackOverrides.clear();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'share');
});

describe('shopping list without anything to buy', () => {
  it('asks for household members first', async () => {
    renderAt(`/zakupy/${WEDNESDAY}`);

    expect(await screen.findByText(/najpierw dodaj domowników/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Przejdź do domowników' })).toBeVisible();
  });

  it('points to the calendar when no meals are planned', async () => {
    await addMember({
      name: 'Anna',
      sex: 'female',
      age: 30,
      heightCm: 165,
      weightKg: 60,
      activity: 'light',
      goal: 'maintain',
      snackKcal: 0,
    });
    renderAt(`/zakupy/${WEDNESDAY}`);

    expect(await screen.findByText(/nie zaplanowano jeszcze posiłków/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Przejdź do kalendarza' })).toHaveAttribute(
      'href',
      `/kalendarz/${WEDNESDAY}`,
    );
  });
});

describe('the week list', () => {
  it('adds up the planned meals and groups the items by food group', async () => {
    await seedWeek();
    renderAt(`/zakupy/${WEDNESDAY}`);

    expect(await screen.findByRole('heading', { level: 2, name: 'Warzywa' })).toBeVisible();
    expect(screen.getByText('19–25 października')).toBeVisible();

    // Shared by the chili (163 g) and the salad (222.5 g): 385 g of peppers of 150 g each
    expect(
      section('Warzywa').getByRole('checkbox', { name: 'Papryka czerwona 3 szt.' }),
    ).toBeVisible();
    // Weighed, not counted
    expect(section('Warzywa').getByRole('checkbox', { name: 'Cebula 200 g' })).toBeVisible();
    // A liquid, bought by volume
    expect(
      section('Tłuszcze').getByRole('checkbox', { name: 'Oliwa z oliwek 50 ml' }),
    ).toBeVisible();
    // Cans, with the weight that is really needed
    expect(
      section('Rośliny strączkowe').getByRole('checkbox', {
        name: 'Fasola czerwona z puszki (odsączona) 2 puszki potrzeba ok. 435 g',
      }),
    ).toBeVisible();
  });

  it('buys less when a person keeps calories for snacks', async () => {
    // Anna now eats 1.65 servings of the chili and 1.7 of the salad instead of 2 and 2.05.
    await seedWeek(300);
    renderAt(`/zakupy/${WEDNESDAY}`);

    expect(
      await screen.findByRole('checkbox', {
        name: 'Fasola czerwona z puszki (odsączona) 2 puszki potrzeba ok. 400 g',
      }),
    ).toBeVisible();
  });

  it('starts with nothing bought', async () => {
    await seedWeek();
    renderAt(`/zakupy/${WEDNESDAY}`);

    expect(await screen.findByText('Kupione: 0 z 11')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Odznacz wszystko' })).not.toBeInTheDocument();
  });

  it('ticks items off, counts them and remembers them', async () => {
    const user = userEvent.setup();
    await seedWeek();
    renderAt(`/zakupy/${WEDNESDAY}`);

    await user.click(await screen.findByRole('checkbox', { name: 'Cebula 200 g' }));

    expect(await screen.findByText('Kupione: 1 z 11')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Cebula 200 g' })).toBeChecked();
    expect(await listCheckedIngredients(WEDNESDAY)).toEqual(new Set(['onion']));
  });

  it('unticks everything at once', async () => {
    const user = userEvent.setup();
    await seedWeek();
    renderAt(`/zakupy/${WEDNESDAY}`);

    await user.click(await screen.findByRole('checkbox', { name: 'Cebula 200 g' }));
    await user.click(screen.getByRole('checkbox', { name: 'Oliwa z oliwek 50 ml' }));
    await user.click(await screen.findByRole('button', { name: 'Odznacz wszystko' }));

    expect(await screen.findByText('Kupione: 0 z 11')).toBeVisible();
    expect(await listCheckedIngredients(WEDNESDAY)).toEqual(new Set());
  });

  it('keeps each week separate and moves between weeks', async () => {
    const user = userEvent.setup();
    await seedWeek();
    renderAt(`/zakupy/${WEDNESDAY}`);
    await user.click(await screen.findByRole('checkbox', { name: 'Cebula 200 g' }));

    await user.click(screen.getByRole('link', { name: 'Następny tydzień' }));

    expect(await screen.findByText('26 października – 1 listopada')).toBeVisible();
    expect(screen.getByText(/nie zaplanowano jeszcze posiłków/)).toBeVisible();
  });

  it('opens this week when the address has no day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
    renderAt('/zakupy');

    expect(await screen.findByText('19–25 października')).toBeVisible();
  });

  it('replaces an invalid day in the address with today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
    renderAt('/zakupy/2026-02-31');

    expect(await screen.findByText('19–25 października')).toBeVisible();
  });

  it('is reachable from the calendar', async () => {
    const user = userEvent.setup();
    await seedWeek();
    renderAt(`/kalendarz/${WEDNESDAY}`);

    await user.click(await screen.findByRole('link', { name: 'Lista zakupów na ten tydzień' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Lista zakupów' })).toBeVisible();
    expect(await screen.findByText('Kupione: 0 z 11')).toBeVisible();
  });
});

describe('dishes cooked for several days', () => {
  /** Chili cooked on Sunday 25 October for two days, so Monday 26 is leftovers. */
  async function seedSundayBatch() {
    const { anna, bartek } = await seedHousehold();
    await assignRecipe('2026-10-25', 'lunch', 'chili-sin-carne', [anna.id, bartek.id]);
    await setBatchDays('2026-10-25', 'lunch', 2);
  }

  it('is bought in the week it is cooked, even when it is eaten in the next one', async () => {
    await seedSundayBatch();
    renderAt(`/zakupy/${WEDNESDAY}`);

    // Two days of 4.35 servings: 400 g of beans shared by 4 servings, times 8.7, which is
    // 870 g, or four cans of 240 g
    expect(
      await screen.findByRole('checkbox', {
        name: 'Fasola czerwona z puszki (odsączona) 4 puszki potrzeba ok. 870 g',
      }),
    ).toBeVisible();
  });

  it('is not bought again in the week of the leftovers', async () => {
    await seedSundayBatch();
    renderAt('/zakupy/2026-10-27');

    expect(await screen.findByText(/nie zaplanowano jeszcze posiłków/)).toBeVisible();
  });
});

describe('passing the list on', () => {
  it('copies what is still to be bought', async () => {
    const user = userEvent.setup();
    await seedWeek();
    renderAt(`/zakupy/${WEDNESDAY}`);

    await user.click(await screen.findByRole('checkbox', { name: 'Cebula 200 g' }));
    await user.click(screen.getByRole('button', { name: 'Kopiuj listę' }));

    expect(await screen.findByText('Skopiowano listę do schowka.')).toBeVisible();
    const copied = await navigator.clipboard.readText();
    expect(copied).toContain('Lista zakupów, 19–25 października');
    expect(copied).toContain('- Papryka czerwona: 3 szt.');
    expect(copied).toContain(
      '- Fasola czerwona z puszki (odsączona): 2 puszki (potrzeba ok. 435 g)',
    );
    expect(copied).not.toContain('Cebula');
  });

  it('offers a WhatsApp link with the list as the message', async () => {
    await seedWeek();
    renderAt(`/zakupy/${WEDNESDAY}`);

    const link = await screen.findByRole('link', { name: 'Wyślij przez WhatsApp' });
    const url = new URL(link.getAttribute('href') ?? '');

    expect(url.origin + url.pathname).toBe('https://wa.me/');
    expect(url.searchParams.get('text')).toContain('- Cebula: 200 g');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('hides the share button where the browser cannot share', async () => {
    await seedWeek();
    renderAt(`/zakupy/${WEDNESDAY}`);

    await screen.findByRole('button', { name: 'Kopiuj listę' });

    expect(screen.queryByRole('button', { name: 'Udostępnij listę' })).not.toBeInTheDocument();
  });

  it('uses the share sheet where the browser has one', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    await seedWeek();
    renderAt(`/zakupy/${WEDNESDAY}`);

    await user.click(await screen.findByRole('button', { name: 'Udostępnij listę' }));

    expect(share).toHaveBeenCalledOnce();
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Lista zakupów',
        text: expect.stringContaining('Lista zakupów, 19–25 października'),
      }),
    );
  });
});
