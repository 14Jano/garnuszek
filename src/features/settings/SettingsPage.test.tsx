import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../data/db';
import { listMeasurements } from '../../data/measurementRepository';
import { addMember, listMembers } from '../../data/memberRepository';
import { assignRecipe, listPlanEntries } from '../../data/planRepository';
import { createBackup } from '../../domain/backup/backup';
import type { BackupData } from '../../domain/backup/backup';
import { SettingsPage } from './SettingsPage';

const anna = {
  id: 'anna-id',
  name: 'Anna',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activity: 'light',
  goal: 'maintain',
  snackKcal: 100,
} as const;

const backupData: BackupData = {
  members: [anna],
  customRecipes: [],
  favoriteRecipeIds: ['szakszuka'],
  planEntries: [
    { date: '2026-10-21', mealType: 'lunch', recipeId: 'chili-sin-carne', memberIds: ['anna-id'] },
    { date: '2026-10-22', mealType: 'lunch', recipeId: 'szakszuka', memberIds: ['anna-id'] },
  ],
  shoppingChecks: [],
  snackOverrides: [],
  measurements: [],
};

function backupFile(data: BackupData = backupData, name = 'kopia.json'): File {
  return new File([JSON.stringify(createBackup(data, new Date('2026-10-21T12:00:00Z')))], name, {
    type: 'application/json',
  });
}

async function seedAnna() {
  return addMember({
    name: 'Anna',
    sex: 'female',
    age: 30,
    heightCm: 165,
    weightKg: 60,
    activity: 'light',
    goal: 'maintain',
    snackKcal: 0,
  });
}

/** Files the page offers for download during a test. */
const downloads: { fileName: string; blob: Blob | undefined }[] = [];

beforeEach(async () => {
  await Promise.all([
    db.members.clear(),
    db.customRecipes.clear(),
    db.favorites.clear(),
    db.planEntries.clear(),
    db.shoppingChecks.clear(),
    db.snackOverrides.clear(),
    db.measurements.clear(),
  ]);

  // jsdom cannot download files, so catch what the page would have saved.
  downloads.length = 0;
  const blobs = new Map<string, Blob>();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob) => {
      const url = `blob:test-${blobs.size}`;
      blobs.set(url, blob);
      return url;
    },
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ fileName: this.download, blob: blobs.get(this.href) });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

describe('downloading a backup', () => {
  it('saves everything the user entered as a dated JSON file', async () => {
    const user = userEvent.setup();
    await seedAnna();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Pobierz kopię zapasową' }));

    await vi.waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]?.fileName).toMatch(/^garnuszek-kopia-\d{4}-\d{2}-\d{2}\.json$/);
    const saved = JSON.parse((await downloads[0]?.blob?.text()) ?? '');
    expect(saved).toMatchObject({ format: 'garnuszek-backup', version: 3 });
    expect(saved.members.map((member: { name: string }) => member.name)).toEqual(['Anna']);
  });
});

describe('restoring a backup', () => {
  it('shows what the file contains and asks before replacing anything', async () => {
    const user = userEvent.setup();
    await seedAnna();
    render(<SettingsPage />);

    await user.upload(screen.getByLabelText('Wczytaj kopię zapasową'), backupFile());

    const review = await screen.findByRole('group', { name: 'Wczytywanie kopii zapasowej' });
    expect(review).toHaveTextContent(/Domownicy: 1, własne przepisy: 0, zaplanowane posiłki: 2/);
    expect(review).toHaveTextContent('zastąpi wszystkie dane na tym urządzeniu');
    // Nothing has changed yet.
    expect((await listMembers()).map((member) => member.name)).toEqual(['Anna']);
    expect(await listPlanEntries('2000-01-01', '2100-12-31')).toEqual([]);
  });

  it('counts the measurements in the file and restores them', async () => {
    const user = userEvent.setup();
    const data: BackupData = {
      ...backupData,
      measurements: [
        { memberId: 'anna-id', kind: 'weight', date: '2026-10-14', value: 61 },
        { memberId: 'anna-id', kind: 'waist', date: '2026-10-14', value: 78.5 },
        { memberId: 'someone-gone', kind: 'weight', date: '2026-10-14', value: 80 },
      ],
    };
    render(<SettingsPage />);

    await user.upload(screen.getByLabelText('Wczytaj kopię zapasową'), backupFile(data));

    const review = await screen.findByRole('group', { name: 'Wczytywanie kopii zapasowej' });
    expect(review).toHaveTextContent('pomiary: 2.');
    expect(review).toHaveTextContent('Pominiemy to, czego ta wersja aplikacji już nie zna');
    expect(review).toHaveTextContent('pomiary: 1)');

    await user.click(screen.getByRole('button', { name: 'Zastąp dane na tym urządzeniu' }));

    expect(await screen.findByText('Wczytano kopię zapasową.')).toBeVisible();
    expect(await listMeasurements('anna-id')).toHaveLength(2);
  });

  it('says what it leaves out when a member avoids an ingredient the app no longer has', async () => {
    const user = userEvent.setup();
    const data: BackupData = {
      ...backupData,
      members: [
        {
          ...anna,
          restrictions: { allergens: [], avoidedIngredientIds: ['onion', 'removed-from-the-app'] },
        },
      ],
    };
    render(<SettingsPage />);

    await user.upload(screen.getByLabelText('Wczytaj kopię zapasową'), backupFile(data));

    expect(await screen.findByText(/składniki, których ktoś unika: 1\)/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Zastąp dane na tym urządzeniu' }));
    expect(await screen.findByText('Wczytano kopię zapasową.')).toBeVisible();
    expect((await listMembers())[0]?.restrictions?.avoidedIngredientIds).toEqual(['onion']);
  });

  it('replaces the data on the device once the user confirms', async () => {
    const user = userEvent.setup();
    await seedAnna();
    await assignRecipe('2026-11-02', 'dinner', 'salatka-grecka', ['someone']);
    render(<SettingsPage />);
    await user.upload(screen.getByLabelText('Wczytaj kopię zapasową'), backupFile());

    await user.click(await screen.findByRole('button', { name: 'Zastąp dane na tym urządzeniu' }));

    expect(await screen.findByText('Wczytano kopię zapasową.')).toBeVisible();
    expect((await listMembers()).map((member) => [member.id, member.name])).toEqual([
      ['anna-id', 'Anna'],
    ]);
    expect((await listPlanEntries('2000-01-01', '2100-12-31')).map((entry) => entry.date)).toEqual([
      '2026-10-21',
      '2026-10-22',
    ]);
  });

  it('changes nothing when the user cancels', async () => {
    const user = userEvent.setup();
    await seedAnna();
    render(<SettingsPage />);
    await user.upload(screen.getByLabelText('Wczytaj kopię zapasową'), backupFile());

    await user.click(await screen.findByRole('button', { name: 'Anuluj' }));

    expect(
      screen.queryByRole('group', { name: 'Wczytywanie kopii zapasowej' }),
    ).not.toBeInTheDocument();
    expect((await listMembers()).map((member) => member.id)).not.toContain('anna-id');
  });

  it('says what it leaves out when the app no longer knows a recipe', async () => {
    const user = userEvent.setup();
    const data: BackupData = {
      ...backupData,
      planEntries: [
        {
          date: '2026-10-21',
          mealType: 'lunch',
          recipeId: 'removed-from-the-app',
          memberIds: ['anna-id'],
        },
      ],
    };
    render(<SettingsPage />);

    await user.upload(screen.getByLabelText('Wczytaj kopię zapasową'), backupFile(data));

    expect(
      await screen.findByText(/Pominiemy to, czego ta wersja aplikacji już nie zna/),
    ).toBeVisible();
    expect(screen.getByText(/zaplanowane posiłki: 1\)/)).toBeVisible();
  });

  it.each([
    ['text that is not JSON', 'to nie jest json', /nie da się odczytać/],
    [
      'a JSON file of something else',
      '{"nazwa": "coś innego"}',
      /To nie jest kopia zapasowa Garnuszka/,
    ],
    [
      'a backup from a newer version',
      JSON.stringify({ ...createBackup(backupData), version: 99 }),
      /nowszej wersji Garnuszka/,
    ],
    [
      'a damaged backup',
      JSON.stringify({ ...createBackup(backupData), members: [{ ...anna, age: 500 }] }),
      /problem w: members\[0\]\.age/,
    ],
  ])('rejects %s and leaves the data alone', async (_name, content, message) => {
    const user = userEvent.setup();
    await seedAnna();
    render(<SettingsPage />);

    await user.upload(
      screen.getByLabelText('Wczytaj kopię zapasową'),
      new File([content], 'kopia.json', { type: 'application/json' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(
      screen.queryByRole('button', { name: 'Zastąp dane na tym urządzeniu' }),
    ).not.toBeInTheDocument();
    expect((await listMembers()).map((member) => member.name)).toEqual(['Anna']);
  });

  it('rejects a file that is far too big to be a backup', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.upload(
      screen.getByLabelText('Wczytaj kopię zapasową'),
      new File([new ArrayBuffer(11 * 1024 * 1024)], 'film.json', { type: 'application/json' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/za duży/);
  });
});

describe('deleting all data', () => {
  it('asks first, and keeps everything when the user backs out', async () => {
    const user = userEvent.setup();
    await seedAnna();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Usuń wszystkie dane' }));
    await user.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(screen.getByRole('button', { name: 'Usuń wszystkie dane' })).toBeVisible();
    expect(await listMembers()).toHaveLength(1);
  });

  it('removes everything once confirmed', async () => {
    const user = userEvent.setup();
    await seedAnna();
    await assignRecipe('2026-10-21', 'lunch', 'chili-sin-carne', ['x']);
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Usuń wszystkie dane' }));
    await user.click(screen.getByRole('button', { name: 'Tak, usuń wszystko' }));

    expect(await screen.findByText('Usunięto wszystkie dane z tego urządzenia.')).toBeVisible();
    expect(await listMembers()).toEqual([]);
    expect(await listPlanEntries('2000-01-01', '2100-12-31')).toEqual([]);
  });
});

describe('about the app', () => {
  it('shows the version, the licence and a link to the source', () => {
    render(<SettingsPage />);

    expect(screen.getByText(/Garnuszek \d+\.\d+\.\d+/)).toBeVisible();
    expect(screen.getByText(/licencji MIT/)).toBeVisible();
    const link = screen.getByRole('link', { name: 'na GitHubie' });
    expect(link).toHaveAttribute('href', 'https://github.com/14Jano/garnuszek');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText(/Wyliczenia są orientacyjne/)).toBeVisible();
  });
});
