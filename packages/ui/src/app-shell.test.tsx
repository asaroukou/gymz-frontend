import { render, screen } from '@testing-library/react';
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

  it('renders topbar actions slot', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" actions={<button>Sign out</button>}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  });
});
