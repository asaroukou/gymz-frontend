'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const DESIGN_ROUTES = [
  { href: '/design', label: 'Index' },
  { href: '/design/foundations', label: 'Fondations' },
  { href: '/design/primitives', label: 'Primitives' },
  { href: '/design/compositions', label: 'Compositions' },
  { href: '/design/shell', label: 'Coque' },
] as const;

export function RouteBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections du système de design"
      className="sticky top-0 z-30 border-b border-border bg-backdrop"
    >
      <ul className="mx-auto flex max-w-[1600px] items-stretch px-4 sm:px-8">
        {DESIGN_ROUTES.map((route) => {
          const isActive =
            route.href === '/design' ? pathname === '/design' : pathname.startsWith(route.href);

          return (
            <li key={route.href}>
              <Link
                href={route.href}
                aria-current={isActive ? 'page' : undefined}
                className={`-mb-px inline-flex h-11 items-center rounded-sm border-b px-3 font-mono text-xs tracking-wider uppercase outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15 ${
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'border-transparent hover:text-foreground'
                }`}
              >
                {route.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
