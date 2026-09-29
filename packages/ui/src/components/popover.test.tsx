import { render, screen } from '@testing-library/react';

import { Popover, PopoverContent, PopoverTrigger } from './popover';

describe('PopoverContent', () => {
  it('draws the same white hairline panel as the canvas menu', () => {
    render(
      <Popover open>
        <PopoverTrigger>open</PopoverTrigger>
        <PopoverContent>body</PopoverContent>
      </Popover>,
    );
    const panel = screen.getByText('body');
    for (const c of ['bg-popover', 'border', 'border-border', 'rounded-[16px]']) {
      expect(panel.className).toContain(c);
    }
    expect(panel.className).not.toContain('bg-side');
  });
});
