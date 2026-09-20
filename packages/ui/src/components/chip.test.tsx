import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './chip';

describe('Chip', () => {
  it('renders a dismiss button only when onRemove is given', () => {
    const { rerender } = render(<Chip>Yoga</Chip>);
    expect(screen.queryByRole('button')).toBeNull();
    const onRemove = vi.fn();
    rerender(
      <Chip onRemove={onRemove} removeLabel="Retirer Yoga">
        Yoga
      </Chip>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retirer Yoga' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
