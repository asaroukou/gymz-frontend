import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  BackLink,
  KeyValueList,
  KeyValueRow,
  SectionHeading,
  WorkingHeader,
  WorkingPage,
} from './working-page';

describe('WorkingPage', () => {
  it('is a vertical stack with a 32px rhythm', () => {
    const { container } = render(<WorkingPage>x</WorkingPage>);
    const el = container.querySelector('[data-slot="working-page"]') as HTMLElement;
    expect(el.className).toContain('gap-8');
    expect(el.className).toContain('flex-col');
  });

  it('header renders the 32px title, the subtitle, one action and badges', () => {
    render(
      <WorkingHeader
        title="Membres"
        subtitle="128 membres"
        action={<button>Ajouter un membre</button>}
        badges={<span>Actif</span>}
      />,
    );
    const h1 = screen.getByRole('heading', { level: 1, name: 'Membres' });
    expect(h1.className).toContain('text-2xl');
    expect(h1.className).toContain('font-normal');
    expect(screen.getByText('128 membres').className).toContain('text-muted-foreground');
    expect(screen.getByRole('button', { name: 'Ajouter un membre' })).toBeTruthy();
    expect(screen.getByText('Actif').parentElement?.dataset.slot).toBe('working-header-badges');
  });

  it('header omits the subtitle node when none is given', () => {
    const { container } = render(<WorkingHeader title="Planning" />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('BackLink renders a plain anchor by default and the given link component otherwise', () => {
    const { rerender } = render(<BackLink href="/members">Retour aux membres</BackLink>);
    const anchor = screen.getByRole('link', { name: 'Retour aux membres' });
    expect(anchor.getAttribute('href')).toBe('/members');
    expect(anchor.className).toContain('text-muted-foreground');
    expect(anchor.querySelector('svg')).not.toBeNull();

    const Fake = ({
      href,
      className,
      children,
    }: {
      href: string;
      className?: string;
      children: React.ReactNode;
    }) => (
      <a data-fake href={href} className={className}>
        {children}
      </a>
    );
    rerender(
      <BackLink href="/venues" linkComponent={Fake}>
        Retour
      </BackLink>,
    );
    expect(screen.getByRole('link', { name: 'Retour' }).hasAttribute('data-fake')).toBe(true);
  });

  it('SectionHeading renders an h2 at 22px with an optional description and action', () => {
    render(
      <SectionHeading
        title="Abonnements"
        description="Les formules achetées par ce membre."
        action={<button>Attribuer</button>}
      />,
    );
    const h2 = screen.getByRole('heading', { level: 2, name: 'Abonnements' });
    expect(h2.className).toContain('text-xl');
    expect(h2.className).toContain('font-medium');
    expect(screen.getByText('Les formules achetées par ce membre.').className).toContain('text-md');
    expect(screen.getByRole('button', { name: 'Attribuer' })).toBeTruthy();
  });

  it('KeyValueList draws hairlines between rows only and right-aligns values', () => {
    const { container } = render(
      <KeyValueList>
        <KeyValueRow label="Type">Mensuel</KeyValueRow>
        <KeyValueRow label="Début">1 sept. 2026</KeyValueRow>
      </KeyValueList>,
    );
    const list = container.querySelector('dl') as HTMLElement;
    expect(list.className).toContain('[&>*+*]:border-t');
    expect(list.className).not.toContain('rounded');
    const rows = container.querySelectorAll('[data-slot="key-value-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.className).toContain('min-h-[42px]');
    const dd = screen.getByText('Mensuel');
    expect(dd.tagName).toBe('DD');
    expect(dd.className).toContain('text-right');
    expect(dd.className).toContain('font-medium');
    expect(screen.getByText('Type').tagName).toBe('DT');
  });
});
