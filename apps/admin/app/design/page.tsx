import Link from 'next/link';

import { DESIGN_ROUTES } from './routes';

const SECTION_SUMMARIES: Record<string, string> = {
  '/design/foundations':
    'Jetons de couleur avec leur ratio de contraste mesuré, échelle typographique, espacement, rayons, élévation, focus, mouvement, icônes.',
  '/design/primitives':
    'Chaque composant de packages/ui, avec toutes ses variantes, ses tailles et ses états pilotés par props.',
  '/design/compositions':
    'Fragments réalistes assemblés à partir des primitives : ligne de membre, bande de capacité, section de formulaire, liste vide, en chargement, en erreur.',
  '/design/shell':
    'La coque applicative : navigation, en-tête, comportement aux points de rupture.',
};

const HARD_RULES = [
  'Une seule encre comme accent.',
  'La couleur ne sert qu’au sens : badges de statut, capacité.',
  'Ni dégradé, ni glassmorphisme, ni emoji.',
  'Chiffres en Geist Mono : 06:30, 14/18.',
  'Filets de 1px avant toute ombre.',
  'Cibles tactiles d’au moins 44px sur les écrans d’accueil.',
  'Contraste AA dans les deux thèmes.',
];

export default function DesignIndexPage() {
  const sections = DESIGN_ROUTES.filter((route) => route.href !== '/design');

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8">
      <header className="max-w-[70ch]">
        <p className="font-mono text-xs tracking-wider uppercase">Le comptoir calme</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-foreground">
          Système de design
        </h1>
        <p className="mt-3 text-sm">
          Chaque spécimen est rendu deux fois, en clair et en sombre, côte à côte. La page elle-même
          reste en clair et n’utilise aucune couleur : toute couleur visible ici sort d’un spécimen.
          Les états pilotés par props sont réels ; le survol et le focus clavier sont annotés, pas
          simulés.
        </p>
      </header>

      <nav aria-label="Sections" className="mt-12 border-t border-border">
        <ul>
          {sections.map((section) => (
            <li key={section.href} className="border-b border-border">
              <Link
                href={section.href}
                className="grid gap-1 rounded-sm py-5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15 sm:grid-cols-[14rem_1fr] sm:gap-8"
              >
                <span className="font-mono text-xs tracking-wider text-foreground uppercase">
                  {section.label}
                </span>
                <span className="max-w-[70ch] text-xs">{SECTION_SUMMARIES[section.href]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-16 max-w-[70ch]">
        <h2 className="text-sm font-medium tracking-wide text-foreground uppercase">
          Règles non négociables
        </h2>
        <ul className="mt-4 space-y-2">
          {HARD_RULES.map((rule, index) => (
            <li key={rule} className="flex gap-3 text-xs">
              <span className="font-mono text-[10px] leading-5">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="leading-5">{rule}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
