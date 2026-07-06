'use client';

import { Menu } from 'lucide-react';
import { useState, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from 'react';

import { Button } from '@iziwellpass/ui/components/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@iziwellpass/ui/components/sheet';
import { cn } from '@iziwellpass/ui/lib/utils';

export interface NavItem {
  title: string;
  href: string;
  icon?: ReactNode;
}

export interface AppShellProps {
  /** App name shown in the sidebar header and mobile topbar. */
  title: string;
  nav: NavItem[];
  /** Right-hand topbar slot (e.g. user menu / sign-out). */
  actions?: ReactNode;
  /** Current pathname for active-item highlighting (pass from usePathname()). */
  currentPath?: string;
  /**
   * Component used to render nav links (e.g. pass next/link's Link).
   * Defaults to a plain <a>, which causes full page reloads — fine for
   * static shells, pass a client-side Link for SPA navigation.
   */
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  /** Called after any nav link is clicked (AppShell also closes the mobile drawer). */
  onNavigate?: () => void;
  children: ReactNode;
}

function DefaultLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}

function NavLinks({
  nav,
  currentPath,
  linkComponent: LinkComponent = DefaultLink,
  onNavigate,
}: {
  nav: NavItem[];
  currentPath?: string;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {nav.map((item) => (
        <LinkComponent
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
            currentPath === item.href
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          {item.icon}
          {item.title}
        </LinkComponent>
      ))}
    </nav>
  );
}

export function AppShell({
  title,
  nav,
  actions,
  currentPath,
  linkComponent,
  onNavigate,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = () => {
    setMobileOpen(false);
    onNavigate?.();
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-card md:block">
        <div className="flex h-14 items-center border-b px-4 text-sm font-semibold">{title}</div>
        <NavLinks
          nav={nav}
          currentPath={currentPath}
          linkComponent={linkComponent}
          onNavigate={handleNavigate}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0" aria-describedby={undefined}>
              <SheetTitle className="flex h-14 items-center border-b px-4 text-sm font-semibold">
                {title}
              </SheetTitle>
              <NavLinks
                nav={nav}
                currentPath={currentPath}
                linkComponent={linkComponent}
                onNavigate={handleNavigate}
              />
            </SheetContent>
          </Sheet>
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
