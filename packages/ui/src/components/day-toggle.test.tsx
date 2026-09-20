import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DayToggle } from './day-toggle';

const DAYS = [
  { value: 'MO', short: 'L', long: 'Lundi' },
  { value: 'TU', short: 'M', long: 'Mardi' },
  { value: 'WE', short: 'M', long: 'Mercredi' },
] as const;

describe('DayToggle', () => {
  it('renders one 44px round pressed/unpressed button per day', () => {
    render(<DayToggle days={DAYS} value={['TU']} onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Mardi' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Lundi' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'Mardi' }).className).toContain('bg-primary');
    expect(screen.getByRole('button', { name: 'Lundi' }).className).toContain('size-11');
  });

  it('toggles and reports the next value in day order', () => {
    const onChange = vi.fn();
    render(<DayToggle days={DAYS} value={['WE']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lundi' }));
    expect(onChange).toHaveBeenCalledWith(['MO', 'WE']);
    fireEvent.click(screen.getByRole('button', { name: 'Mercredi' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('disables every day when disabled', () => {
    render(<DayToggle days={DAYS} value={[]} onChange={() => {}} disabled />);
    for (const button of screen.getAllByRole<HTMLButtonElement>('button'))
      expect(button.disabled).toBe(true);
  });
});
