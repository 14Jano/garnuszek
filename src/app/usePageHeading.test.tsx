import { act, render, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TITLE, usePageHeading, viewOf } from './usePageHeading';

describe('viewOf', () => {
  it.each([
    ['/kalendarz', '/kalendarz'],
    ['/kalendarz/2026-10-21', '/kalendarz'],
    ['/zakupy/2026-10-19', '/zakupy'],
    ['/kalendarz/2026-10-21/lunch/wybierz', '/kalendarz/lunch/wybierz'],
    ['/przepisy/szakszuka', '/przepisy/szakszuka'],
    ['/domownicy/abc/pomiary', '/domownicy/abc/pomiary'],
  ])('maps %s to %s', (path, expected) => {
    expect(viewOf(path)).toBe(expected);
  });
});

/** A stand-in for the layout: shows what the test says it should. */
function Screen({ view, children }: { view: string; children?: React.ReactNode }) {
  const container = useRef<HTMLElement>(null);
  usePageHeading(container, view);
  return <main ref={container}>{children}</main>;
}

describe('usePageHeading', () => {
  it('titles the tab after the heading and leaves focus alone on the first screen', () => {
    render(
      <Screen view="/domownicy">
        <h1>Domownicy</h1>
      </Screen>,
    );

    expect(document.title).toBe('Domownicy – Garnuszek');
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();
  });

  it('falls back to the title of the app while a screen has no heading yet', () => {
    render(<Screen view="/przepisy">Wczytywanie…</Screen>);

    expect(document.title).toBe(DEFAULT_TITLE);
  });

  it('follows the heading when it changes or appears later', async () => {
    const { rerender } = render(<Screen view="/przepisy">Wczytywanie…</Screen>);

    rerender(
      <Screen view="/przepisy">
        <h1>Szakszuka</h1>
      </Screen>,
    );

    await waitFor(() => expect(document.title).toBe('Szakszuka – Garnuszek'));
  });

  it('moves focus to the heading of the screen the user moves to', async () => {
    const { rerender } = render(
      <Screen view="/kalendarz">
        <h1>Kalendarz posiłków</h1>
      </Screen>,
    );

    rerender(
      <Screen view="/zakupy">
        <h1>Lista zakupów</h1>
      </Screen>,
    );

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Lista zakupów' })).toHaveFocus(),
    );
    expect(document.title).toBe('Lista zakupów – Garnuszek');
  });

  it('waits for the heading when the new screen is still loading', async () => {
    const { rerender } = render(
      <Screen view="/kalendarz">
        <h1>Kalendarz posiłków</h1>
      </Screen>,
    );

    rerender(<Screen view="/przepisy/szakszuka">Wczytywanie…</Screen>);
    await act(async () => undefined);
    rerender(
      <Screen view="/przepisy/szakszuka">
        <h1>Szakszuka</h1>
      </Screen>,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Szakszuka' })).toHaveFocus());
  });

  it('does not take focus away when only the day changes', async () => {
    const { rerender } = render(
      <Screen view={viewOf('/kalendarz/2026-10-21')}>
        <h1>Kalendarz posiłków</h1>
        <button type="button">Następny dzień</button>
      </Screen>,
    );
    screen.getByRole('button', { name: 'Następny dzień' }).focus();

    rerender(
      <Screen view={viewOf('/kalendarz/2026-10-22')}>
        <h1>Kalendarz posiłków</h1>
        <button type="button">Następny dzień</button>
      </Screen>,
    );
    await act(async () => undefined);

    expect(screen.getByRole('button', { name: 'Następny dzień' })).toHaveFocus();
  });
});
