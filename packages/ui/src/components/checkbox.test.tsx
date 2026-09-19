import { render, screen } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders a checkbox role, unchecked by default', () => {
    render(<Checkbox aria-label="pick" />);
    const box = screen.getByRole('checkbox', { name: 'pick' });
    expect(box.getAttribute('data-state')).toBe('unchecked');
  });

  it('reflects the checked prop', () => {
    render(<Checkbox aria-label="pick" checked />);
    expect(screen.getByRole('checkbox', { name: 'pick' }).getAttribute('data-state')).toBe(
      'checked',
    );
  });
});
