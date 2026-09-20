import { describe, expect, it } from 'vitest';
import { paginate } from './paginate';

const items = Array.from({ length: 45 }, (_, i) => i + 1);

describe('paginate', () => {
  it('slices the requested page and reports exact counts', () => {
    const page = paginate(items, 2, 20);
    expect(page.items).toEqual(items.slice(20, 40));
    expect(page.page).toBe(2);
    expect(page.pageCount).toBe(3);
    expect(page.total).toBe(45);
  });
  it('clamps the page into range', () => {
    expect(paginate(items, 0, 20).page).toBe(1);
    expect(paginate(items, 99, 20).page).toBe(3);
    expect(paginate(items, 99, 20).items).toEqual(items.slice(40));
  });
  it('has one empty page for no items', () => {
    const page = paginate([], 1, 20);
    expect(page).toEqual({ items: [], page: 1, pageCount: 1, total: 0 });
  });
  it('never divides by a zero page size', () => {
    expect(paginate(items, 1, 0).pageCount).toBe(45);
  });
});
