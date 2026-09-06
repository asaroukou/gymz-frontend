'use client';

import type { AnchorHTMLAttributes } from 'react';
import { Building2Icon, CalendarClockIcon, UsersIcon } from 'lucide-react';

import { AppShell, type NavItem } from '@iziwellpass/ui/app-shell';
import { Button } from '@iziwellpass/ui/components/button';

import { PageFrame, sectionNumber, type TocEntry } from '../_chrome/page-frame';
import { Section } from '../_chrome/section';
import { Specimen } from '../_chrome/specimen';

const SECTIONS: readonly TocEntry[] = [
  { id: 'coque', label: 'Coque complète' },
  { id: 'navigation', label: 'États de navigation' },
];

const NAV: NavItem[] = [
  { title: 'Membres', href: '/members', icon: <UsersIcon className="size-4" /> },
  { title: 'Planning', href: '/schedules', icon: <CalendarClockIcon className="size-4" /> },
  { title: 'Salles', href: '/venues', icon: <Building2Icon className="size-4" /> },
];

/** AppShell's linkComponent takes an optional href; anchors here go nowhere. */
function InertLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href="#" onClick={(event) => event.preventDefault()} />;
}

/**
 * `AppShell`'s root is `flex min-h-screen`: it assumes it owns the viewport, so a
 * capped-height wrapper would just add a second scroll container rather than clip it.
 * `w-full` is kept, not for height, but so the shell claims a full row inside the
 * `Specimen` pane's flex-wrap container instead of shrinking to content width.
 */
function ShellFrame({ currentPath }: { currentPath: string }) {
  return (
    <div className="w-full">
      <AppShell
        title="IziWellPass"
        nav={NAV}
        currentPath={currentPath}
        linkComponent={InertLink}
        openMenuLabel="Ouvrir le menu"
        actions={
          <Button variant="ghost" size="sm">
            Se déconnecter
          </Button>
        }
      >
        <div className="p-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Membres</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">248</span> membres
          </p>
        </div>
      </AppShell>
    </div>
  );
}

export default function ShellPage() {
  const number = (id: string) => sectionNumber(SECTIONS, id);

  return (
    <PageFrame
      title="Coque"
      intro="La coque applicative dans les deux thèmes. Les liens sont inertes. Les points de rupture réels se vérifient en redimensionnant la fenêtre : les volets côte à côte montrent le thème, pas la largeur."
      entries={SECTIONS}
    >
      <Section
        id="coque"
        number={number('coque')}
        title="Coque complète"
        note="En dessous de md, la navigation passe derrière un déclencheur de menu de 44px."
      >
        <Specimen name="AppShell" signature="title, nav, actions, currentPath, linkComponent">
          <ShellFrame currentPath="/members" />
        </Specimen>
      </Section>

      <Section
        id="navigation"
        number={number('navigation')}
        title="États de navigation"
        note="L’élément courant porte aria-current. Tabulez dans la navigation pour voir l’anneau de focus : la coque avait un manquement AA sur ce point, corrigé en lot A."
      >
        <Specimen name="AppShell" signature="currentPath=/schedules">
          <ShellFrame currentPath="/schedules" />
        </Specimen>
      </Section>
    </PageFrame>
  );
}
