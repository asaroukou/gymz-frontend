'use client';

import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ReactNode,
} from 'react';

import { Button } from '@iziwellpass/ui/components/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@iziwellpass/ui/components/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';
import { Wordmark } from '@iziwellpass/ui/components/wordmark';
import { cn } from '@iziwellpass/ui/lib/utils';

export interface NavItem {
  title: string;
  href: string;
  icon?: ReactNode;
  /** Rendered after the title (e.g. a plan lock); hidden on the collapsed rail. */
  trailing?: ReactNode;
}

export interface NavGroup {
  /** Optional section label (13/500 atténué, sentence case). */
  label?: string;
  items: NavItem[];
}

export interface AppShellProps {
  /** App name shown in the wordmark (side column and drawer). */
  title: string;
  nav?: NavItem[];
  /** Grouped nav; takes precedence over `nav`. */
  navGroups?: NavGroup[];
  /** Column slot rendered under the brand row, above the nav. Hidden on the rail. */
  navHeader?: ReactNode;
  /** Column slot pinned at the bottom (venue switcher, user menu). */
  navFooter?: ReactNode;
  /**
   * Footer for the collapsed 72px rail (icon-only switcher, avatar). When
   * omitted, the rail shows no footer.
   */
  navFooterCollapsed?: ReactNode;
  /** Mobile top bar, left of the actions (e.g. the compact venue switcher). Desktop has no top bar. */
  leading?: ReactNode;
  /** Mobile top bar, right-aligned (e.g. the avatar menu). Desktop has no top bar. */
  actions?: ReactNode;
  /** Current pathname for active-item highlighting (pass from usePathname()). */
  currentPath?: string;
  /**
   * Component used to render nav links (e.g. pass next/link's Link).
   * Defaults to a plain <a>, which causes full page reloads.
   */
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  /** Called after any nav link is clicked (AppShell also closes the drawer). */
  onNavigate?: () => void;
  /** Accessible label for the mobile menu trigger. Defaults to "Open menu". */
  openMenuLabel?: string;
  /** Accessible label for the brand-row toggle when the column is expanded. */
  collapseLabel?: string;
  /** Accessible label for the brand-row toggle when the column is a rail. */
  expandLabel?: string;
  /** localStorage key remembering the collapsed state. */
  storageKey?: string;
  children: ReactNode;
}

const DEFAULT_STORAGE_KEY = 'iziwellpass.shell.collapsed';

// Reads the remembered rail before the first paint on the client; a plain
// effect would paint the 260px column and then animate it shut on every load.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function DefaultLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}

/** Active when the path exactly matches `/`, or is a prefix match for any other href. */
function isActivePath(href: string, currentPath?: string): boolean {
  if (!currentPath) return false;
  if (href === '/') return currentPath === '/';
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function NavGroupList({
  groups,
  collapsed,
  currentPath,
  linkComponent: LinkComponent = DefaultLink,
  onNavigate,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  currentPath?: string;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {groups.map((group, i) => (
        <div key={group.label ?? `group-${i}`} className="flex flex-col gap-0.5">
          {group.label ? (
            <p
              className={cn(
                'text-sm font-medium text-muted-foreground',
                collapsed ? 'sr-only' : 'px-3.5 pt-5 pb-1.5',
              )}
            >
              {group.label}
            </p>
          ) : null}
          {collapsed && group.label ? <div aria-hidden="true" className="h-5" /> : null}
          {group.items.map((item) => {
            const active = isActivePath(item.href, currentPath);
            const link = (
              <LinkComponent
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                data-active={active || undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-[42px] items-center rounded-full text-base text-foreground transition-colors duration-200 [&_svg]:size-[18px] [&_svg]:shrink-0',
                  collapsed ? 'w-11 justify-center' : 'gap-3 px-3.5',
                  active ? 'bg-secondary font-semibold' : 'font-normal hover:bg-accent/60',
                )}
              >
                {item.icon}
                <span className={collapsed ? 'sr-only' : undefined}>{item.title}</span>
                {!collapsed && item.trailing ? (
                  <span className="ml-auto flex items-center text-muted-foreground">
                    {item.trailing}
                  </span>
                ) : null}
              </LinkComponent>
            );
            if (!collapsed) return link;
            // On the rail the label lives in a tooltip; the sr-only span keeps
            // the accessible name for screen readers.
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function toGroups(navGroups?: NavGroup[], nav?: NavItem[]): NavGroup[] {
  if (navGroups && navGroups.length > 0) return navGroups;
  return nav ? [{ items: nav }] : [];
}

function CollapseToggle({
  collapsed,
  label,
  onToggle,
}: {
  collapsed: boolean;
  label: string;
  onToggle: () => void;
}) {
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-expanded={!collapsed}
      onClick={onToggle}
      className="-my-1.5 text-muted-foreground hover:text-foreground"
    >
      {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
    </Button>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function Column({
  title,
  navHeader,
  navFooter,
  navFooterCollapsed,
  groups,
  collapsed,
  onToggleCollapsed,
  collapseLabel,
  expandLabel,
  currentPath,
  linkComponent,
  onNavigate,
}: {
  title: string;
  navHeader?: ReactNode;
  navFooter?: ReactNode;
  navFooterCollapsed?: ReactNode;
  groups: NavGroup[];
  collapsed: boolean;
  /** Undefined in the mobile drawer, which never collapses. */
  onToggleCollapsed?: () => void;
  collapseLabel: string;
  expandLabel: string;
  currentPath?: string;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  onNavigate?: () => void;
}) {
  const footer = collapsed ? navFooterCollapsed : navFooter;
  return (
    <div
      className={cn(
        'flex h-full flex-col gap-0.5 overflow-y-auto py-4',
        collapsed ? 'items-center px-3.5' : 'px-3',
      )}
    >
      {/* Brand row: 52px (the 36px toggle carries -my-1.5 so the row keeps the wordmark's
          24px content height), wordmark left, the panel toggle right (18px atténué), as drawn */}
      <div
        className={cn(
          'flex items-center pt-2 pb-5',
          collapsed ? 'justify-center' : 'justify-between pl-2.5',
        )}
      >
        {collapsed ? null : <Wordmark name={title} />}
        {onToggleCollapsed ? (
          <CollapseToggle
            collapsed={collapsed}
            label={collapsed ? expandLabel : collapseLabel}
            onToggle={onToggleCollapsed}
          />
        ) : null}
      </div>
      {navHeader && !collapsed ? <div className="pb-2">{navHeader}</div> : null}
      <NavGroupList
        groups={groups}
        collapsed={collapsed}
        currentPath={currentPath}
        linkComponent={linkComponent}
        onNavigate={onNavigate}
      />
      <div className="flex-1" />
      {footer ? (
        <div className={cn('flex flex-col gap-0.5', collapsed && 'items-center gap-1')}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({
  title,
  nav,
  navGroups,
  navHeader,
  navFooter,
  navFooterCollapsed,
  actions,
  leading,
  currentPath,
  linkComponent,
  onNavigate,
  openMenuLabel = 'Open menu',
  collapseLabel = 'Collapse menu',
  expandLabel = 'Expand menu',
  storageKey = DEFAULT_STORAGE_KEY,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Starts expanded on the server and the first client render (no hydration
  // mismatch), then follows the remembered preference.
  const [collapsed, setCollapsed] = useState(false);
  // The width transition is enabled only after the remembered state is
  // applied, so a returning user never sees the column slide shut on load.
  const [animate, setAnimate] = useState(false);
  const groups = toGroups(navGroups, nav);

  useIsomorphicLayoutEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === '1') setCollapsed(true);
    } catch {
      // Storage unavailable (private mode, quota): stay expanded.
    }
    setAnimate(true);
  }, [storageKey]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        // Not persisted; the session still toggles.
      }
      return next;
    });
  }, [storageKey]);

  const handleNavigate = () => {
    setMobileOpen(false);
    onNavigate?.();
  };

  const columnProps = {
    title,
    navHeader,
    navFooter,
    navFooterCollapsed,
    groups,
    collapseLabel,
    expandLabel,
    currentPath,
    linkComponent,
    onNavigate: handleNavigate,
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop: the côté column is the only frame — a tone, not a border */}
      <aside
        data-collapsed={collapsed || undefined}
        className={cn(
          'hidden shrink-0 bg-side md:sticky md:top-0 md:block md:h-screen',
          animate && 'transition-[width] duration-200 ease-out',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        )}
      >
        <Column {...columnProps} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar; there is no desktop header */}
        <header className="flex h-14 shrink-0 items-center gap-2.5 px-3 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={openMenuLabel}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[300px] bg-side p-0"
              aria-describedby={undefined}
            >
              <SheetTitle className="sr-only">{title}</SheetTitle>
              <Column {...columnProps} collapsed={false} />
            </SheetContent>
          </Sheet>
          {leading}
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-14 md:pt-10 md:pb-12">{children}</main>
      </div>
    </div>
  );
}
