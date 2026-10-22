import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { db } from '../data/db';

beforeEach(() => {
  // React and the boundary log what they catch; the tests expect it, so keep the output clean.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Broken({ broken }: { broken: boolean }) {
  if (broken) throw new Error('boom');
  return <p>Wszystko działa</p>;
}

function renderBoundary(resetKey: string, broken: boolean) {
  return (
    <MemoryRouter>
      <ErrorBoundary resetKey={resetKey}>
        <Broken broken={broken} />
      </ErrorBoundary>
    </MemoryRouter>
  );
}

describe('ErrorBoundary', () => {
  it('shows what children render when nothing goes wrong', () => {
    render(renderBoundary('/a', false));

    expect(screen.getByText('Wszystko działa')).toBeVisible();
  });

  it('replaces a screen that fails with an explanation and a way out', () => {
    render(renderBoundary('/a', true));

    expect(screen.getByRole('heading', { level: 1, name: 'Coś poszło nie tak' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Garnuszek natrafił na nieoczekiwany błąd.',
    );
    expect(screen.getByRole('link', { name: 'Ustawieniach' })).toHaveAttribute(
      'href',
      '/ustawienia',
    );
    expect(screen.getByRole('link', { name: 'zgłoś problem na GitHubie' })).toHaveAttribute(
      'href',
      'https://github.com/14Jano/garnuszek/issues',
    );
    expect(screen.getByRole('button', { name: 'Odśwież stronę' })).toBeVisible();
  });

  it('writes the error to the console for whoever reports the problem', () => {
    render(renderBoundary('/a', true));

    expect(console.error).toHaveBeenCalledWith(
      'A screen failed to show',
      expect.objectContaining({ message: 'boom' }),
      expect.any(String),
    );
  });

  it('stays on the explanation while the screen is the same', () => {
    const { rerender } = render(renderBoundary('/a', true));

    rerender(renderBoundary('/a', false));

    expect(screen.getByRole('heading', { name: 'Coś poszło nie tak' })).toBeVisible();
  });

  it('tries again when the user moves to another screen', () => {
    const { rerender } = render(renderBoundary('/a', true));

    rerender(renderBoundary('/b', false));

    expect(screen.getByText('Wszystko działa')).toBeVisible();
  });
});

describe('a refusal of the browser storage', () => {
  it('is explained, and the rest of the app keeps working', async () => {
    const user = userEvent.setup();
    const refused = Object.assign(new Error('The operation is insecure.'), {
      name: 'SecurityError',
    });
    vi.spyOn(db.members, 'orderBy').mockImplementation(() => {
      throw refused;
    });

    render(
      <MemoryRouter initialEntries={['/domownicy']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Przeglądarka nie pozwala Garnuszkowi zapisywać danych na tym urządzeniu.',
    );

    await user.click(screen.getByRole('link', { name: 'Ustawienia' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Ustawienia' })).toBeVisible();
  });
});
