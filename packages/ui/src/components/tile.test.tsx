import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tile, TileCount, TileMeta, TileTime, TileTitle, TileTop } from './tile';

describe('Tile', () => {
  it('renders the tint by index and the slots', () => {
    render(
      <Tile tint={2} data-testid="tile">
        <TileTop>
          <TileTime>06:30</TileTime>
          <TileCount>14/18</TileCount>
        </TileTop>
        <TileTitle>Yoga du matin</TileTitle>
        <TileMeta>Salle A · Aïssatou Ba</TileMeta>
      </Tile>,
    );
    expect(screen.getByTestId('tile').className).toContain('bg-tint-sable');
    expect(screen.getByText('14/18').className).toContain('font-numeric');
    expect(screen.getByText('Yoga du matin').tagName).toBe('H3');
  });
  it('accepts a named tint and the tall aspect', () => {
    render(<Tile tint="rose" aspect="tall" data-testid="tile" />);
    const el = screen.getByTestId('tile');
    expect(el.className).toContain('bg-tint-rose');
    expect(el.className).not.toContain('aspect-square');
  });
});
