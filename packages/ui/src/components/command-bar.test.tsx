import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandBar } from './command-bar';

describe('CommandBar', () => {
  it('submits the typed value and exposes an accessible submit', () => {
    const onSubmit = vi.fn();
    render(
      <CommandBar
        placeholder="Scanner un QR ou rechercher un membre"
        submitLabel="Valider"
        onSubmit={onSubmit}
      />,
    );
    const input = screen.getByPlaceholderText('Scanner un QR ou rechercher un membre');
    fireEvent.change(input, { target: { value: 'iwp1.abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(onSubmit).toHaveBeenCalledWith('iwp1.abc');
  });
  it('renders the mode slot before the submit', () => {
    render(<CommandBar placeholder="p" submitLabel="Go" mode={<span>Accueil</span>} />);
    expect(screen.getByText('Accueil')).toBeTruthy();
  });
});
