import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

describe('Table (comptoir clair geometry)', () => {
  it('draws a 36px atténué header and 15px cells with 14px vertical padding', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membre</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>Awa Ndiaye</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const head = screen.getByText('Membre');
    expect(head.className).toContain('h-9');
    expect(head.className).toContain('text-sm');
    expect(head.className).toContain('text-muted-foreground');
    const cell = screen.getByText('Awa Ndiaye');
    expect(cell.className).toContain('py-[14px]');
    expect(cell.className).toContain('text-base');
    expect(cell.className).toContain('leading-tight');
    const row = cell.closest('tr') as HTMLElement;
    expect(row.className).toContain('data-[state=selected]:bg-secondary');
    expect(row.className).toContain('border-b');
  });
});
