import { act } from 'react';
import { render, screen, within } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { AppShell, type NavItem } from './app-shell';

const nav: NavItem[] = [
  { title: 'Dashboard', href: '/' },
  { title: 'Members', href: '/members' },
];

describe('AppShell', () => {
  it('renders nav items as links', () => {
    render(
      <AppShell nav={nav} title="IziWellPass">
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveProperty('pathname', '/');
    expect(screen.getByRole('link', { name: 'Members' })).toHaveProperty('pathname', '/members');
  });

  it('renders children in the main region', () => {
    render(
      <AppShell nav={nav} title="IziWellPass">
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getByRole('main').textContent).toContain('content');
  });

  it('marks the active nav item via aria-current (prefix match)', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" currentPath="/members/42">
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Members' }).getAttribute('aria-current')).toBe('page');
    // exact-match rule: `/` is not active on a members sub-route
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')).toBeNull();
  });

  it('renders the actions slot in the mobile top bar', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" actions={<button>Sign out</button>}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  });

  it('renders the leading slot in the mobile top bar', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" leading={<span>venue-switcher</span>}>
        <p>content</p>
      </AppShell>,
    );
    // getByText throws if the slot content is missing — that is the assertion.
    expect(screen.getByText('venue-switcher')).toHaveProperty('tagName', 'SPAN');
  });

  it('renders links through a custom linkComponent when provided', () => {
    function FakeLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
      return <a data-testid="custom-link" {...props} />;
    }
    render(
      <AppShell nav={nav} title="IziWellPass" linkComponent={FakeLink}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getAllByTestId('custom-link').length).toBeGreaterThanOrEqual(2);
  });

  it('opens the mobile drawer when the menu trigger is clicked', () => {
    render(
      <AppShell nav={nav} title="IziWellPass">
        <p>x</p>
      </AppShell>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      screen.getByRole('button', { name: 'Open menu' }).click();
    });
    const dialog = screen.getByRole('dialog');
    // the drawer renders its own copy of the nav (the desktop sidebar is
    // aria-hidden behind the modal, so scope the query to the dialog)
    expect(within(dialog).getByRole('link', { name: 'Members' })).toBeTruthy();
  });

  it('calls onNavigate when a nav link is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <AppShell nav={nav} title="IziWellPass" onNavigate={onNavigate}>
        <p>x</p>
      </AppShell>,
    );
    screen.getAllByRole('link', { name: 'Members' })[0]?.click();
    expect(onNavigate).toHaveBeenCalled();
  });

  it('renders the navHeader slot in the sidebar', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" navHeader={<span>venue-switcher</span>}>
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getAllByText('venue-switcher').length).toBeGreaterThan(0);
  });

  it('renders grouped nav with a group label', () => {
    render(
      <AppShell
        title="IziWellPass"
        navGroups={[
          { items: [{ title: 'Dashboard', href: '/' }] },
          { label: 'Organisation', items: [{ title: 'Members', href: '/members' }] },
        ]}
      >
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getAllByText('Organisation').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Members' }).length).toBeGreaterThan(0);
  });

  it('renders the navFooter slot in the sidebar column', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" navFooter={<span>venue-and-user</span>}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByText('venue-and-user')).toBeTruthy();
  });

  it('marks the active item with the pill classes and keeps the rest bare', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" currentPath="/members">
        <p>x</p>
      </AppShell>,
    );
    const active = screen.getByRole('link', { name: 'Members' });
    const idle = screen.getByRole('link', { name: 'Dashboard' });
    expect(active.className).toContain('bg-secondary');
    expect(active.className).toContain('font-semibold');
    expect(idle.className).not.toContain('bg-secondary');
  });
});

describe('AppShell collapse', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('collapses the column to a rail, swaps the footer and remembers it', () => {
    render(
      <AppShell
        nav={nav}
        title="IziWellPass"
        navFooter={<p>full footer</p>}
        navFooterCollapsed={<p>rail footer</p>}
        collapseLabel="Réduire le menu"
        expandLabel="Déplier le menu"
        storageKey="test.collapsed"
      >
        <p>content</p>
      </AppShell>,
    );
    const aside = document.querySelector('aside') as HTMLElement;
    expect(aside.className).toContain('w-[260px]');
    expect(within(aside).getByText('full footer')).toBeTruthy();

    act(() => {
      within(aside).getByRole('button', { name: 'Réduire le menu' }).click();
    });
    expect(aside.className).toContain('w-[72px]');
    expect(aside.getAttribute('data-collapsed')).toBe('true');
    expect(within(aside).getByText('rail footer')).toBeTruthy();
    expect(within(aside).queryByText('full footer')).toBeNull();
    // Links keep their accessible name on the rail (sr-only label).
    expect(within(aside).getByRole('link', { name: 'Members' })).toBeTruthy();
    expect(window.localStorage.getItem('test.collapsed')).toBe('1');

    act(() => {
      within(aside).getByRole('button', { name: 'Déplier le menu' }).click();
    });
    expect(aside.className).toContain('w-[260px]');
    expect(window.localStorage.getItem('test.collapsed')).toBe('0');
  });

  it('restores the remembered rail on mount', () => {
    window.localStorage.setItem('test.collapsed', '1');
    render(
      <AppShell nav={nav} title="IziWellPass" storageKey="test.collapsed">
        <p>content</p>
      </AppShell>,
    );
    const aside = document.querySelector('aside') as HTMLElement;
    expect(aside.getAttribute('data-collapsed')).toBe('true');
  });

  it('never collapses the mobile drawer column', () => {
    window.localStorage.setItem('test.collapsed', '1');
    render(
      <AppShell nav={nav} title="IziWellPass" storageKey="test.collapsed" openMenuLabel="Menu">
        <p>content</p>
      </AppShell>,
    );
    act(() => {
      screen.getByRole('button', { name: 'Menu' }).click();
    });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: /menu/i })).toBeNull();
    expect(within(dialog).getByText('Dashboard').className).not.toContain('sr-only');
  });
});
