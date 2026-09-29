import { render, screen } from '@testing-library/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

// Canvas « IziWellPass · Plat » › Menu: a white panel with a #dcdcdc hairline,
// 16 px radius and 6 px padding; rows are 40 px, 10 px radius, 12 px padding,
// ink icons. The grey side tone (#fafafa) vanished against the sidebar.
function renderMenu() {
  render(
    <DropdownMenu open>
      <DropdownMenuTrigger>open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Voir la fiche</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Suspendre</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}

describe('DropdownMenuContent', () => {
  it('draws the canvas menu panel', () => {
    renderMenu();
    const panel = screen.getByRole('menu');
    for (const c of [
      'bg-popover',
      'border',
      'border-border',
      'rounded-[16px]',
      'p-1.5',
      'min-w-[236px]',
    ]) {
      expect(panel.className).toContain(c);
    }
    expect(panel.className).not.toContain('bg-side');
  });
});

describe('DropdownMenuItem', () => {
  it('draws the canvas menu row with ink icons', () => {
    renderMenu();
    const item = screen.getByRole('menuitem', { name: 'Voir la fiche' });
    for (const c of ['h-10', 'rounded-[10px]', 'px-3', 'gap-2.5']) {
      expect(item.className).toContain(c);
    }
    expect(item.className).not.toContain('rounded-full');
    expect(item.className).not.toContain('text-muted-foreground');
  });

  it('keeps the danger colour on the destructive row', () => {
    renderMenu();
    const item = screen.getByRole('menuitem', { name: 'Suspendre' });
    expect(item.className).toContain('data-[variant=destructive]:text-destructive-foreground');
  });
});

describe('DropdownMenuRadioItem', () => {
  // Canvas › Menu Item/Selected: pilule fill, label at 500, a check on the right.
  it('marks the selected row with the pill fill, weight 500 and a right check', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">Studio Dakar Plateau</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">Almadies</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const selected = screen.getByRole('menuitemradio', { name: 'Studio Dakar Plateau' });
    expect(selected.getAttribute('data-state')).toBe('checked');
    for (const c of [
      'data-[state=checked]:bg-secondary',
      'data-[state=checked]:font-medium',
      'rounded-[10px]',
      'pr-9',
    ]) {
      expect(selected.className).toContain(c);
    }
    expect(
      selected.querySelector('[data-slot="dropdown-menu-item-indicator"]')?.className,
    ).toContain('right-3');
  });
});
