import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('opens the meal calendar by default', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: 'Kalendarz posiłków' })).toBeVisible();
  });

  it('highlights the current section in the navigation', () => {
    renderAt('/zakupy');

    expect(screen.getByRole('link', { name: 'Zakupy' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Kalendarz' })).not.toHaveAttribute('aria-current');
  });

  it('navigates between sections', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.click(screen.getByRole('link', { name: 'Przepisy' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Przepisy' })).toBeVisible();
  });

  it('shows a way back for unknown addresses', () => {
    renderAt('/nie-ma-takiej-strony');

    expect(screen.getByRole('heading', { name: 'Nie ma takiej strony' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Przejdź do kalendarza' })).toBeVisible();
  });
});
