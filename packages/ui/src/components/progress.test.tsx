import { render, screen } from '@testing-library/react';
import { Progress } from './progress';

describe('Progress', () => {
  it('renders a progressbar exposing its value', () => {
    render(<Progress value={42} aria-label="Loading" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeTruthy();
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
  });

  it('accepts an indicatorClassName on the fill element', () => {
    render(<Progress value={10} indicatorClassName="bg-success" aria-label="p" />);
    const indicator = document.querySelector('[data-slot="progress-indicator"]');
    expect(indicator?.className).toContain('bg-success');
  });
});
