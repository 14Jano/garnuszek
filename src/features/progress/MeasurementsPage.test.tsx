import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { listMeasurements, saveMeasurement } from '../../data/measurementRepository';
import { addMember, listMembers } from '../../data/memberRepository';
import type { Member, NewMember } from '../../domain/household/member';
import type { MeasurementKind } from '../../domain/progress/measurement';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const anna: NewMember = {
  name: 'Anna',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 70,
  activity: 'light',
  goal: 'maintain',
  snackKcal: 0,
};

const annaLosingWeight: NewMember = { ...anna, goal: 'lose', targetWeightKg: 62 };

async function seedMember(profile: NewMember = anna): Promise<Member> {
  return addMember(profile);
}

async function measure(member: Member, kind: MeasurementKind, date: string, value: number) {
  await saveMeasurement({ memberId: member.id, kind, date, value });
}

function openPageOf(member: Member) {
  return renderAt(`/domownicy/${member.id}/pomiary`);
}

beforeEach(async () => {
  await db.measurements.clear();
  await db.members.clear();
  // Only the date is faked, so IndexedDB keeps working normally.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MeasurementsPage', () => {
  it('says so when the person does not exist', async () => {
    renderAt('/domownicy/nikt/pomiary');

    expect(await screen.findByRole('heading', { name: 'Nie znaleziono domownika' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Wróć do domowników' })).toHaveAttribute(
      'href',
      '/domownicy',
    );
  });

  it('invites to the first measurement and proposes today', async () => {
    openPageOf(await seedMember());

    expect(await screen.findByRole('heading', { name: 'Pomiary: Anna' })).toBeVisible();
    expect(screen.getByText(/Nie ma tu jeszcze żadnego pomiaru: waga/)).toBeVisible();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-10-21');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('stores a weighing and brings the weight of the person up to date', async () => {
    const user = userEvent.setup();
    const member = await seedMember();
    openPageOf(member);

    await user.type(await screen.findByLabelText('Waga (kg)'), '68.5');
    await user.click(screen.getByRole('button', { name: 'Zapisz pomiar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Zapisano pomiar z 21.10.2026.');
    expect(screen.getByLabelText('Waga (kg)')).toHaveValue(null);
    expect(await listMeasurements(member.id)).toEqual([
      { memberId: member.id, kind: 'weight', date: '2026-10-21', value: 68.5 },
    ]);
    expect((await listMembers())[0]?.weightKg).toBe(68.5);
    // A single reading cannot show a change yet.
    expect(screen.getByText('Jedyny pomiar')).toBeVisible();
    expect(screen.getByText('Dodaj kolejny pomiar, a pokażemy zmianę i wykres.')).toBeVisible();
  });

  it('stores a reading of another day', async () => {
    const user = userEvent.setup();
    const member = await seedMember();
    openPageOf(member);

    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: '2026-10-14' } });
    await user.type(screen.getByLabelText('Waga (kg)'), '71');
    await user.click(screen.getByRole('button', { name: 'Zapisz pomiar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Zapisano pomiar z 14.10.2026.');
    expect((await listMeasurements(member.id))[0]).toMatchObject({ date: '2026-10-14', value: 71 });
  });

  it('explains what is wrong and stores nothing', async () => {
    const user = userEvent.setup();
    const member = await seedMember();
    openPageOf(member);

    await user.click(await screen.findByRole('button', { name: 'Zapisz pomiar' }));
    expect(screen.getByText('Wpisz, ile wynosi waga.')).toBeVisible();
    expect(screen.getByLabelText('Waga (kg)')).toHaveFocus();
    expect(screen.getByLabelText('Waga (kg)')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('Waga (kg)'), '5');
    expect(screen.queryByText('Wpisz, ile wynosi waga.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zapisz pomiar' }));
    expect(screen.getByText('Podaj wartość w kilogramach, od 10 do 300.')).toBeVisible();

    expect(await listMeasurements(member.id)).toEqual([]);
  });

  it('does not accept a day in the future', async () => {
    const user = userEvent.setup();
    const member = await seedMember();
    openPageOf(member);

    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: '2026-10-22' } });
    await user.type(screen.getByLabelText('Waga (kg)'), '70');
    await user.click(screen.getByRole('button', { name: 'Zapisz pomiar' }));

    expect(screen.getByText('Podaj datę z dzisiaj albo z przeszłości.')).toBeVisible();
    expect(screen.getByLabelText('Data')).toHaveFocus();
    expect(await listMeasurements(member.id)).toEqual([]);
  });

  it('warns that a second reading on the same day replaces the first', async () => {
    const user = userEvent.setup();
    const member = await seedMember();
    await measure(member, 'weight', '2026-10-21', 70);
    openPageOf(member);

    expect(await screen.findByText(/Z tego dnia masz już ten pomiar/)).toBeVisible();
    await user.type(screen.getByLabelText('Waga (kg)'), '69.2');
    await user.click(screen.getByRole('button', { name: 'Zapisz pomiar' }));

    await waitFor(async () => {
      expect(await listMeasurements(member.id)).toEqual([
        { memberId: member.id, kind: 'weight', date: '2026-10-21', value: 69.2 },
      ]);
    });
  });

  it('shows the change and a chart once there are two readings', async () => {
    const member = await seedMember();
    await measure(member, 'weight', '2026-10-14', 70);
    await measure(member, 'weight', '2026-10-21', 68.5);
    openPageOf(member);

    expect(await screen.findByText('Pierwszy pomiar')).toBeVisible();
    expect(screen.getByText('−1,5 kg')).toBeVisible();
    const chart = screen.getByRole('img');
    expect(chart).toHaveAccessibleName(
      'Wykres: waga. Pierwszy pomiar 70 kg (14.10.2026), ostatni 68,5 kg (21.10.2026).',
    );
  });

  it('lists the readings with the newest first', async () => {
    const member = await seedMember();
    await measure(member, 'weight', '2026-10-14', 70);
    await measure(member, 'weight', '2026-10-21', 68.5);
    openPageOf(member);

    const list = await screen.findByRole('list', { name: 'Zapisane pomiary' });
    const rows = within(list).getAllByRole('listitem');

    expect(rows[0]).toHaveTextContent('21.10.2026');
    expect(rows[0]).toHaveTextContent('68,5 kg');
    expect(rows[1]).toHaveTextContent('14.10.2026');
  });

  it('shows the progress to the target and when it will be reached', async () => {
    const member = await seedMember(annaLosingWeight);
    await measure(member, 'weight', '2026-10-14', 70);
    await measure(member, 'weight', '2026-10-21', 69);
    openPageOf(member);

    // Once in the summary and once on the chart.
    expect(await screen.findAllByText('Cel: 62 kg')).toHaveLength(2);
    expect(screen.getByText(/Do celu zostało 7 kg\./)).toHaveTextContent(
      'Cel: 62 kg. Do celu zostało 7 kg.',
    );
    expect(screen.getByRole('progressbar', { name: 'Postęp do celu' })).toHaveAttribute('max', '8');
    expect(
      screen.getByText(
        'Jeśli tempo się utrzyma (−1 kg na tydzień), cel osiągniesz około 9 grudnia 2026.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('img')).toHaveAccessibleName(/Cel: 62 kg\.$/);
  });

  it('congratulates when the target is reached', async () => {
    const member = await seedMember(annaLosingWeight);
    await measure(member, 'weight', '2026-10-14', 70);
    await measure(member, 'weight', '2026-10-21', 61.5);
    openPageOf(member);

    expect(await screen.findByText('Cel osiągnięty. Gratulacje!')).toBeVisible();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('says a forecast needs more readings', async () => {
    const member = await seedMember(annaLosingWeight);
    await measure(member, 'weight', '2026-10-21', 69);
    openPageOf(member);

    expect(
      await screen.findByText(/Do prognozy potrzebne są co najmniej dwa pomiary/),
    ).toBeVisible();
  });

  it('suggests entering a target weight when there is none', async () => {
    const member = await seedMember({ ...anna, goal: 'lose' });
    openPageOf(member);

    expect(await screen.findByText(/wpisz docelową wagę w danych domownika/)).toBeVisible();
  });

  it('ignores a target when the person only keeps their weight', async () => {
    const member = await seedMember({ ...anna, targetWeightKg: 62 });
    await measure(member, 'weight', '2026-10-21', 69);
    openPageOf(member);

    await screen.findByText('Jedyny pomiar');
    expect(screen.queryByText(/Cel:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/wpisz docelową wagę/)).not.toBeInTheDocument();
  });

  it('keeps circumferences apart from weight and leaves the weight alone', async () => {
    const user = userEvent.setup();
    const member = await seedMember();
    await measure(member, 'weight', '2026-10-21', 69);
    openPageOf(member);

    await user.click(await screen.findByRole('radio', { name: 'Talia' }));
    expect(screen.getByText(/Nie ma tu jeszcze żadnego pomiaru: talia/)).toBeVisible();
    expect(screen.queryByText(/Najnowsza waga trafia też/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Talia (cm)'), '78.5');
    await user.click(screen.getByRole('button', { name: 'Zapisz pomiar' }));

    const list = await screen.findByRole('list', { name: 'Zapisane pomiary' });
    expect(within(list).getByText('78,5 cm')).toBeVisible();
    expect(within(list).queryByText('69 kg')).not.toBeInTheDocument();
    expect((await listMembers())[0]?.weightKg).toBe(69);
    expect(await listMeasurements(member.id)).toHaveLength(2);
  });

  it('removes a reading only after confirmation', async () => {
    const user = userEvent.setup();
    const member = await seedMember();
    await measure(member, 'weight', '2026-10-14', 70);
    await measure(member, 'weight', '2026-10-21', 68.5);
    openPageOf(member);

    await user.click(await screen.findByRole('button', { name: 'Usuń pomiar: 21.10.2026' }));
    await user.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(await listMeasurements(member.id)).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Usuń pomiar: 21.10.2026' }));
    await user.click(screen.getByRole('button', { name: 'Tak, usuń' }));

    await waitFor(async () => {
      expect(await listMeasurements(member.id)).toEqual([
        { memberId: member.id, kind: 'weight', date: '2026-10-14', value: 70 },
      ]);
    });
    // The weight goes back to the latest weighing that is left.
    expect((await listMembers())[0]?.weightKg).toBe(70);
  });
});
