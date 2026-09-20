'use client';

import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@iziwellpass/ui/components/button';
import { cn } from '@iziwellpass/ui/lib/utils';

export type PageItem = number | 'ellipsis';

/**
 * Which pills to show: always the first and last page, the current page and
 * its two neighbours, with an ellipsis wherever numbers are skipped. Empty when
 * there is only one page, so the component renders nothing.
 */
export function pageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 1) return [];
  const wanted = new Set<number>([1, pageCount]);
  for (let n = page - 1; n <= page + 1; n += 1) {
    if (n >= 1 && n <= pageCount) wanted.add(n);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const items: PageItem[] = [];
  let previous = 0;
  for (const n of sorted) {
    if (previous > 0 && n - previous > 1) items.push('ellipsis');
    items.push(n);
    previous = n;
  }
  return items;
}

export interface PaginationLabels {
  /** `aria-label` of the nav landmark, e.g. « Pagination ». */
  label: string;
  previous: string;
  next: string;
  page: (n: number) => string;
}

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  labels: PaginationLabels;
  className?: string;
}

/** 36px prev/next icon buttons around 36px page pills; the current page is a grey pill. */
export function Pagination({ page, pageCount, onPageChange, labels, className }: PaginationProps) {
  const items = pageItems(page, pageCount);
  if (items.length === 0) return null;
  return (
    <nav data-slot="pagination" aria-label={labels.label} className={className}>
      <ul className="flex items-center gap-1">
        <li>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={labels.previous}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon />
          </Button>
        </li>
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <li
              key={`ellipsis-${index}`}
              aria-hidden
              className="w-9 text-center text-md text-muted-foreground"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={labels.page(item)}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'h-9 min-w-9 rounded-full px-2 font-numeric text-md text-muted-foreground transition-colors hover:bg-secondary/60',
                  item === page && 'bg-secondary font-semibold text-foreground hover:bg-secondary',
                )}
                onClick={() => {
                  if (item !== page) onPageChange(item);
                }}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={labels.next}
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </li>
      </ul>
    </nav>
  );
}
