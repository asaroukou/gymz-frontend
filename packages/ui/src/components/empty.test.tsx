import { render, screen } from '@testing-library/react';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from './empty';

describe('Empty', () => {
  it('renders its title, description and content slots', () => {
    render(
      <Empty>
        <EmptyMedia>
          <svg aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Aucun membre</EmptyTitle>
        <EmptyDescription>Ajoutez votre premier membre.</EmptyDescription>
        <EmptyContent>
          <button>Ajouter</button>
        </EmptyContent>
      </Empty>,
    );

    expect(screen.getByText('Aucun membre')).toBeTruthy();
    expect(screen.getByText('Ajoutez votre premier membre.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeTruthy();
    expect(document.querySelector('[data-slot="empty-media"]')).toBeTruthy();
  });
});
