import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wash } from './wash';

describe('Wash', () => {
  it('is decorative, absolute and desktop-only', () => {
    const { container } = render(<Wash />);
    const el = container.querySelector('[data-slot="wash"]') as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.className).toContain('absolute');
    expect(el.className).toContain('hidden');
    expect(el.className).toContain('md:block');
    expect(el.className).toContain('pointer-events-none');
    expect(el.className).toContain('radial-gradient');
  });
});
