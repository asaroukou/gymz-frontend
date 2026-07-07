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

  it('renders topbar actions slot', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" actions={<button>Sign out</button>}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
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
});
