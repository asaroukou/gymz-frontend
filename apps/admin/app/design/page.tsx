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
  'Une seule encre solide par écran : la règle de l’encre unique. Une deuxième commande sombre est une erreur.',
  'L’état actif se pose sur une pilule, jamais sur un soulignement ou du gras : la règle de la pilule.',
  'Les teintes accueillent ce qu’on survole du regard (sessions, forfaits, salles), jamais un formulaire, un tableau ou une boîte de dialogue : la règle de la tuile.',
  'Les titres restent en 400 ou 500 ; s’ils ont besoin de plus de poids pour se voir, ils ont besoin de plus d’espace : la règle du titre léger.',
  'Casse phrase partout, jamais de majuscules : la règle de la casse phrase.',
  'Toute valeur qu’on compare ou qu’on relit s’affiche en chiffres tabulaires : la règle du tabulaire.',
  'Ni ombre portée, ni flou, ni bordure de conteneur : l’espace, le ton ou un filet séparent les zones : la règle du zéro-élévation.',
  'Aucun contenu n’est encadré ni ombré ; un tableau, ce sont des lignes et des filets : la règle du non-encadrement.',
];

export default function DesignIndexPage() {
  const sections = DESIGN_ROUTES.filter((route) => route.href !== '/design');

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8">
      <header className="max-w-[70ch]">
        <p className="text-sm font-medium">Le comptoir clair</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-foreground">
          Système de design
        </h1>
        <p className="mt-3 text-sm">
          Chaque spécimen est rendu une seule fois. La page elle-même n’utilise aucune couleur :
          toute couleur visible ici sort d’un spécimen. Les états pilotés par props sont réels ; le
          survol et le focus clavier sont annotés, pas simulés.
        </p>
      </header>

      <nav aria-label="Sections" className="mt-12 border-t border-border">
        <ul>
          {sections.map((section) => (
            <li key={section.href} className="border-b border-border">
              <Link
                href={section.href}
                className="grid gap-1 rounded-sm py-5 sm:grid-cols-[14rem_1fr] sm:gap-8"
              >
                <span className="text-sm font-medium text-foreground">{section.label}</span>
                <span className="max-w-[70ch] text-xs">{SECTION_SUMMARIES[section.href]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-16 max-w-[70ch]">
        <h2 className="text-sm font-medium text-foreground">Règles non négociables</h2>
        <ul className="mt-4 space-y-2">
          {HARD_RULES.map((rule, index) => (
            <li key={rule} className="flex gap-3 text-xs">
              <span className="font-numeric text-[10px] leading-5">
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
