import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HubEyebrow, HubHero, HubLead, HubPage, HubSection, HubTitle } from './hub-page';

describe('HubPage', () => {
  it('renders no wash by default and one when asked', () => {
    const { container, rerender } = render(<HubPage>x</HubPage>);
    expect(container.querySelector('[data-slot="wash"]')).toBeNull();
    rerender(<HubPage wash>x</HubPage>);
    expect(container.querySelectorAll('[data-slot="wash"]')).toHaveLength(1);
  });
  it('is a centred 940px column', () => {
    const { container } = render(<HubPage>x</HubPage>);
    const el = container.querySelector('[data-slot="hub-page"]') as HTMLElement;
    expect(el.className).toContain('max-w-[940px]');
    expect(el.className).toContain('mx-auto');
    expect(el.className).toContain('relative');
  });
  it('clips horizontal overflow from the wash without clipping the hero vertically', () => {
    const { container } = render(<HubPage>x</HubPage>);
    const el = container.querySelector('[data-slot="hub-page"]') as HTMLElement;
    expect(el.className).toContain('overflow-x-clip');
  });
  it('hero pieces render the right elements', () => {
    render(
      <HubHero>
        <HubEyebrow>Samedi 20 septembre</HubEyebrow>
        <HubTitle>Bonjour, Moussa</HubTitle>
        <HubLead>Trois étapes pour démarrer.</HubLead>
      </HubHero>,
    );
    expect(screen.getByText('Bonjour, Moussa').tagName).toBe('H1');
    expect(screen.getByText('Bonjour, Moussa').className).toContain('md:text-3xl');
    expect(screen.getByText('Samedi 20 septembre').tagName).toBe('P');
    expect(screen.getByText('Trois étapes pour démarrer.').className).toContain(
      'text-muted-foreground',
    );
  });
  it('HubSection centres its children', () => {
    const { container } = render(<HubSection>x</HubSection>);
    expect((container.firstChild as HTMLElement).className).toContain('items-center');
  });
});
