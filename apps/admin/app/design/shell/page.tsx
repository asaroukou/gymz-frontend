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
  { title: 'Membres', href: '/members', icon: <UsersIcon aria-hidden /> },
  { title: 'Planning', href: '/schedules', icon: <CalendarClockIcon aria-hidden /> },
  { title: 'Salles', href: '/venues', icon: <Building2Icon aria-hidden /> },
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
        navFooter={
          <Button variant="ghost" size="sm" className="justify-start px-2">
            Se déconnecter
          </Button>
        }
        actions={
          <Button variant="ghost" size="sm">
            Se déconnecter
          </Button>
        }
      >
        <div className="p-4">
          <h2 className="text-2xl font-normal text-foreground">Membres</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-numeric">248</span> membres
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
      intro="Colonne côté 260 px, pilule active, pied de colonne. Les liens sont inertes. Il n’y a pas de barre du haut sur desktop ; les points de rupture réels se vérifient en redimensionnant la fenêtre."
      entries={SECTIONS}
    >
      <Section
        id="coque"
        number={number('coque')}
        title="Coque complète"
        note="En dessous de md, la navigation passe derrière un déclencheur de menu de 36px et la colonne devient un tiroir sur scrim."
      >
        <Specimen
          name="AppShell"
          signature="title, nav, navFooter, actions, currentPath, linkComponent"
        >
          <ShellFrame currentPath="/members" />
        </Specimen>
      </Section>

      <Section
        id="navigation"
        number={number('navigation')}
        title="États de navigation"
        note="L’élément courant porte aria-current et prend la pilule à 600. Tabulez dans la navigation pour voir l’anneau de focus d’encre."
      >
        <Specimen name="AppShell" signature="currentPath=/schedules">
          <ShellFrame currentPath="/schedules" />
        </Specimen>
      </Section>
    </PageFrame>
  );
}
