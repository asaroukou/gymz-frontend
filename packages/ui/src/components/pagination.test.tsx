import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pagination, pageItems } from './pagination';

const labels = {
  label: 'Pagination',
  previous: 'Page précédente',
  next: 'Page suivante',
  page: (n: number) => `Page ${n}`,
};

describe('pageItems', () => {
  it('is empty for a single page', () => {
    expect(pageItems(1, 1)).toEqual([]);
    expect(pageItems(1, 0)).toEqual([]);
  });
  it('keeps first, last and the current neighbourhood with ellipses in the gaps', () => {
    expect(pageItems(1, 13)).toEqual([1, 2, 'ellipsis', 13]);
    expect(pageItems(7, 13)).toEqual([1, 'ellipsis', 6, 7, 8, 'ellipsis', 13]);
    expect(pageItems(13, 13)).toEqual([1, 'ellipsis', 12, 13]);
    expect(pageItems(2, 3)).toEqual([1, 2, 3]);
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} onPageChange={() => {}} labels={labels} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('marks the current page, disables prev at the start and reports clicks', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageCount={13} onPageChange={onPageChange} labels={labels} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy();
    const current = screen.getByRole('button', { name: 'Page 1' });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(current.className).toContain('bg-secondary');
    expect(
      (screen.getByRole('button', { name: 'Page précédente' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Page suivante' }) as HTMLButtonElement).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Page 13' }));
    expect(onPageChange).toHaveBeenCalledWith(13);
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables next on the last page', () => {
    render(<Pagination page={3} pageCount={3} onPageChange={() => {}} labels={labels} />);
    expect(
      (screen.getByRole('button', { name: 'Page suivante' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
