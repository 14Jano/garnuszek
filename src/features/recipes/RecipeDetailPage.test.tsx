import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../app/App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the source of a recipe', () => {
  it('is named, with the credit its source asks for and a link to the original', async () => {
    renderAt('/przepisy/zapiekany-makaron-z-serem');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Zapiekany makaron z serem' }),
    ).toBeVisible();
    const note = screen.getByText(/Przepis na podstawie materiałów/);
    expect(note).toHaveTextContent('National Heart, Lung, and Blood Institute (NHLBI)');
    expect(note).toHaveTextContent('Source: MedlinePlus, National Library of Medicine');
    expect(note).toHaveTextContent('dopasowaliśmy do Garnuszka');

    const link = screen.getByRole('link', { name: 'Oryginał (po angielsku)' });
    expect(link).toHaveAttribute(
      'href',
      'https://medlineplus.gov/recipes/classic-macaroni-and-cheese/',
    );
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('is left out of a recipe that was written for Garnuszek', async () => {
    renderAt('/przepisy/szakszuka');

    await screen.findByRole('heading', { level: 1, name: 'Szakszuka' });

    expect(screen.queryByText(/Przepis na podstawie materiałów/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Oryginał (po angielsku)' })).not.toBeInTheDocument();
  });
});
