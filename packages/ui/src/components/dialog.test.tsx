import { render, waitFor } from '@testing-library/react';
import { Dialog, DialogContent, DialogTitle } from './dialog';

describe('DialogContent', () => {
  it('restores focus to restoreFocusTo() on close', async () => {
    const backButton = document.createElement('button');
    backButton.textContent = 'back';
    document.body.appendChild(backButton);

    const { rerender } = render(
      <Dialog open>
        <DialogContent restoreFocusTo={() => backButton} aria-describedby={undefined}>
          <DialogTitle>t</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    rerender(
      <Dialog open={false}>
        <DialogContent restoreFocusTo={() => backButton} aria-describedby={undefined}>
          <DialogTitle>t</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => expect(document.activeElement).toBe(backButton));

    document.body.removeChild(backButton);
  });

  it('does not restore focus without restoreFocusTo', async () => {
    const backButton = document.createElement('button');
    backButton.textContent = 'back';
    document.body.appendChild(backButton);

    const { rerender } = render(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>t</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    rerender(
      <Dialog open={false}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>t</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => expect(document.activeElement).not.toBe(backButton));

    document.body.removeChild(backButton);
  });

  it('disables the close button with closeDisabled', () => {
    const { getByRole } = render(
      <Dialog open>
        <DialogContent closeDisabled aria-describedby={undefined}>
          <DialogTitle>t</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect((getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
