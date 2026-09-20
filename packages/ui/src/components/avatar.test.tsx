import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, AvatarFallback } from './avatar';

describe('AvatarFallback', () => {
  it('rotates the tint by index', () => {
    render(
      <Avatar>
        <AvatarFallback tint={2} data-testid="fallback">
          AB
        </AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByTestId('fallback').className).toContain('bg-tint-sable');
  });

  it('falls back to the first tint', () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="fallback">AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByTestId('fallback').className).toContain('bg-tint-bleu');
  });
});
