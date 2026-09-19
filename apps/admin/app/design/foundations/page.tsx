import { CalendarClockIcon, UsersIcon } from 'lucide-react';

import { PageFrame, sectionNumber, type TocEntry } from '../_chrome/page-frame';
import { Section } from '../_chrome/section';
import { Specimen } from '../_chrome/specimen';
import { ContrastRow, Swatch } from '../_chrome/swatch';

const SECTIONS: readonly TocEntry[] = [
  { id: 'couleur', label: 'Couleur' },
  { id: 'typographie', label: 'Typographie' },
  { id: 'espacement', label: 'Espacement et rayons' },
  { id: 'elevation', label: 'Élévation' },
  { id: 'focus', label: 'Focus et états' },
  { id: 'mouvement', label: 'Mouvement' },
  { id: 'icones', label: 'Icônes' },
];

const SURFACE_TOKENS = [
  '--background',
  '--card',
  '--popover',
  '--muted',
  '--secondary',
  '--accent',
];

const INK_TOKENS = ['--foreground', '--muted-foreground', '--primary', '--primary-foreground'];

const LINE_TOKENS = ['--border', '--input', '--ring'];

const STATUS_TOKENS = ['--destructive', '--success', '--warning', '--info'];

const CHART_TOKENS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--chart-grid',
  '--chart-track',
];

/** A Tailwind `/18` opacity modifier, as Tailwind v4 actually compiles it. */
const tint = (token: string) => `color-mix(in oklab, var(${token}) 18%, transparent)`;

const TYPE_STEPS = [
  {
    name: 'display',
    spec: '24px / 750 / 1.2 / -0.035em',
    className: 'text-2xl font-[750] tracking-[-0.035em] leading-[1.2]',
    sample: 'Planning de la semaine',
  },
  {
    name: 'title',
    spec: '16px / 600 / 1.4',
    className: 'text-base font-[650] leading-[1.4]',
    sample: 'Abonnements actifs',
  },
  {
    name: 'body',
    spec: '14px / 400 / 1.5',
    className: 'text-sm leading-[1.5]',
    sample: 'Le membre a été enregistré. Sa carte est active jusqu’au 31 décembre.',
  },
  {
    name: 'label',
    spec: '14px / 500 / 1.3',
    className: 'text-sm font-medium leading-[1.3]',
    sample: 'Moyen de paiement',
  },
  {
    name: 'numeric',
    spec: '14px / 650 / 1.4, tabular-nums',
    className: 'font-numeric text-sm leading-[1.4]',
    sample: '06:30 · 14/18 · 25 000 FCFA',
  },
];

const SPACING_STEPS = ['1', '2', '3', '4', '6', '8', '12', '16'];

const RADII = [
  { name: '--radius-sm', spec: '6px', className: 'rounded-sm' },
  { name: '--radius-md', spec: '8px', className: 'rounded-md' },
  { name: '--radius-lg', spec: '10px', className: 'rounded-lg' },
  { name: '--radius-xl', spec: '16px', className: 'rounded-xl' },
  { name: '--radius-pill', spec: '9999px', className: 'rounded-full' },
];

const ICONS = [
  'ArrowLeftIcon',
  'ArrowRightIcon',
  'BanIcon',
  'Building2Icon',
  'CalendarClockIcon',
  'CalendarPlusIcon',
  'CameraIcon',
  'CheckIcon',
  'ChevronDownIcon',
  'ChevronRightIcon',
  'ChevronUpIcon',
  'ChevronsUpDownIcon',
  'CircleIcon',
  'CompassIcon',
  'EyeIcon',
  'EyeOffIcon',
  'LockIcon',
  'MapPinIcon',
  'Menu',
  'MinusIcon',
  'MoreHorizontalIcon',
  'PlusIcon',
  'QrCodeIcon',
  'RepeatIcon',
  'ScanLineIcon',
  'SearchIcon',
  'TriangleAlertIcon',
  'UserPlusIcon',
  'UsersIcon',
  'XIcon',
];

export default function FoundationsPage() {
  const number = (id: string) => sectionNumber(SECTIONS, id);

  return (
    <PageFrame
      title="Fondations"
      intro="Les jetons avant les composants. Chaque nuancier affiche l’hexadécimal réellement peint, chaque paire texte/fond affiche son ratio de contraste mesuré dans le thème du volet."
      entries={SECTIONS}
    >
      <Section
        id="couleur"
        number={number('couleur')}
        title="Couleur"
        note="Une seule encre, une échelle de gris chaude, quatre couleurs de statut réservées au sens. Les ratios sont mesurés après composition de l’alpha, pas déduits de la source."
      >
        <Specimen
          name="Surfaces"
          signature="--background, --card, --popover, --muted, --secondary, --accent"
        >
          <div className="flex w-full flex-wrap gap-2">
            {SURFACE_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Encres"
          signature="--foreground, --muted-foreground, --primary, --primary-foreground"
        >
          <div className="flex w-full flex-wrap gap-2">
            {INK_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen name="Filets" signature="--border, --input, --ring">
          <div className="flex w-full flex-wrap gap-2">
            {LINE_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Statuts"
          signature="--destructive, --success, --warning, --info"
          note="Jamais décoratives : elles n’apparaissent que sur un badge, une alerte ou une barre de capacité."
        >
          <div className="flex w-full flex-wrap gap-2">
            {STATUS_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen name="Données" signature="--chart-1 → --chart-5, --chart-grid, --chart-track">
          <div className="flex w-full flex-wrap gap-2">
            {CHART_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Contraste du texte"
          signature="ratio mesuré, niveau WCAG"
          note="Un niveau « fail » est souligné en ondulé, sans couleur : le chrome n’ajoute aucune couleur à ce qu’il mesure."
        >
          <div className="w-full">
            <ContrastRow
              foreground="var(--foreground)"
              background="var(--background)"
              label="--foreground sur --background"
            />
            <ContrastRow
              foreground="var(--muted-foreground)"
              background="var(--background)"
              label="--muted-foreground sur --background"
            />
            <ContrastRow
              foreground="var(--primary-foreground)"
              background="var(--primary)"
              label="--primary-foreground sur --primary"
            />
            <ContrastRow
              foreground="var(--secondary-foreground)"
              background="var(--secondary)"
              label="--secondary-foreground sur --secondary"
            />
            <ContrastRow
              foreground="var(--success-foreground)"
              background={tint('--success')}
              label="--success-foreground sur --success/18"
              sample="Payé"
            />
            <ContrastRow
              foreground="var(--warning-foreground)"
              background={tint('--warning')}
              label="--warning-foreground sur --warning/18"
              sample="En attente"
            />
            <ContrastRow
              foreground="var(--info-foreground)"
              background={tint('--info')}
              label="--info-foreground sur --info/18"
              sample="Invité"
            />
            <ContrastRow
              foreground="var(--destructive-foreground)"
              background="var(--destructive)"
              label="--destructive-foreground sur --destructive"
              sample="Annulé"
            />
          </div>
        </Specimen>
      </Section>

      <Section
        id="typographie"
        number={number('typographie')}
        title="Typographie"
        note="Inter pour le texte, font-numeric pour tout ce qui se compte. Prose limitée à 65–75 caractères par ligne."
      >
        {TYPE_STEPS.map((step) => (
          <Specimen key={step.name} name={step.name} signature={step.spec}>
            <p className={`${step.className} text-foreground`}>{step.sample}</p>
          </Specimen>
        ))}

        <Specimen
          name="Chiffres tabulaires"
          signature="font-numeric"
          note="Les colonnes de chiffres doivent s’aligner verticalement. Si les unités dansent d’une ligne à l’autre, font-numeric manque quelque part."
        >
          <table className="w-full text-sm">
            <tbody className="text-foreground">
              {[
                ['06:30', '14/18', '25 000'],
                ['11:00', '9/18', '110 000'],
                ['18:45', '18/18', '7 500'],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => (
                    <td key={cell} className="py-0.5 pr-6 text-right font-numeric">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Specimen>
      </Section>

      <Section
        id="espacement"
        number={number('espacement')}
        title="Espacement et rayons"
        note="Le rythme vient de la variation : un espacement identique partout est de la monotonie, pas un système."
      >
        <Specimen name="Échelle d’espacement" signature="0.25rem par pas">
          <div className="flex w-full flex-col gap-1.5">
            {SPACING_STEPS.map((step) => (
              <div key={step} className="flex items-center gap-3">
                <span className="w-8 font-numeric text-[10px] text-muted-foreground">{step}</span>
                <div className="h-2 bg-foreground" style={{ width: `${Number(step) * 0.25}rem` }} />
                <span className="font-numeric text-[10px] text-muted-foreground">
                  {Number(step) * 4}px
                </span>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Rayons"
          signature="--radius: 10px, --radius-xl: 16px, --radius-pill: 9999px"
        >
          <div className="flex w-full flex-wrap gap-4">
            {RADII.map((radius) => (
              <div key={radius.name} className="text-center">
                <div className={`size-16 border border-border bg-muted ${radius.className}`} />
                <p className="mt-1.5 font-numeric text-[10px] text-muted-foreground">
                  {radius.spec}
                </p>
              </div>
            ))}
          </div>
        </Specimen>
      </Section>

      <Section
        id="elevation"
        number={number('elevation')}
        title="Élévation"
        note="Règle du zéro-ombre : box-shadow est interdit. Le filet de 1px est l’unique niveau de profondeur ; un palier de surface ou un voile séparent les calques qui en ont vraiment besoin."
      >
        <Specimen
          name="Filet seul"
          signature="border border-border"
          note="Le niveau par défaut. La plupart des séparations s’arrêtent ici."
        >
          <div className="size-24 rounded-xl border border-border bg-card" />
        </Specimen>
      </Section>

      <Section
        id="focus"
        number={number('focus')}
        title="Focus et états"
        note="Un seul contour de focus dans toute l’application. Le survol et le focus clavier ne peuvent pas être simulés honnêtement : tabulez dans les volets ci-dessous pour les voir."
      >
        <Specimen
          name="Contour de focus"
          signature=":focus-visible { outline: 3px solid currentColor; outline-offset: 0.25rem }"
          note="Tabulez jusqu’au champ pour déclencher l’état réel."
        >
          <input
            className="h-11 rounded-lg border border-input bg-background px-4 text-sm text-foreground lg:h-9"
            placeholder="Rechercher un membre"
            aria-label="Rechercher un membre"
          />
        </Specimen>

        <Specimen
          name="Contour, forcé"
          signature="outline: 3px solid currentColor; outline-offset: 0.25rem"
          note="Le même contour, appliqué en permanence, pour le comparer entre les deux thèmes sans avoir à tabuler dans chaque volet."
        >
          <div
            className="h-11 w-56 rounded-full border border-input bg-background px-4 text-sm leading-11 text-muted-foreground lg:h-9 lg:leading-9"
            style={{ outline: '3px solid currentColor', outlineOffset: '0.25rem' }}
          >
            Rechercher un membre
          </div>
        </Specimen>

        <Specimen name="Désactivé" signature="disabled:opacity-50 disabled:pointer-events-none">
          <button
            type="button"
            disabled
            className="h-11 rounded-full bg-primary px-4 text-sm font-[800] text-primary-foreground disabled:pointer-events-none disabled:opacity-50 lg:h-9"
          >
            Valider
          </button>
        </Specimen>
      </Section>

      <Section
        id="mouvement"
        number={number('mouvement')}
        title="Mouvement"
        note="Deux durées, toutes deux en ease-out. Le mouvement est fonctionnel, jamais décoratif, et prefers-reduced-motion le neutralise dans toute l’application."
      >
        <Specimen
          name="state-change"
          signature="120ms ease-out"
          note="Changements de couleur, de fond et d’ombre au survol ou au basculement. Survolez le bloc."
        >
          <div className="size-24 rounded-xl border border-border bg-card transition-colors duration-[120ms] ease-out hover:bg-accent" />
        </Specimen>

        <Specimen
          name="progress"
          signature="250ms ease-out"
          note="Largeur de la barre de capacité, chevrons d’accordéon. Survolez la piste."
        >
          <div className="group h-2 w-full rounded-full bg-chart-track">
            <div className="h-2 w-1/4 rounded-full bg-chart-1 transition-[width] duration-[250ms] ease-out group-hover:w-3/4" />
          </div>
        </Specimen>
      </Section>

      <Section
        id="icones"
        number={number('icones')}
        title="Icônes"
        note="Lucide uniquement, trait de 2px, taille 4 (16px) par défaut. Le sens est porté par l’icône et la couleur du badge, jamais par un emoji."
      >
        <Specimen
          name="Jeu en usage"
          signature={`${ICONS.length} icônes`}
          note="Liste régénérée depuis les imports lucide-react du dépôt."
        >
          <ul className="flex w-full flex-wrap gap-x-4 gap-y-3">
            {ICONS.map((name) => (
              <li key={name} className="w-28 text-center">
                <span className="font-numeric text-[10px] break-words text-muted-foreground">
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </Specimen>

        <Specimen name="Taille et alignement" signature="size-4 avec un texte 14px">
          <p className="inline-flex items-center gap-2 text-sm text-foreground">
            <CalendarClockIcon className="size-4" aria-hidden />
            06:30
          </p>
          <p className="inline-flex items-center gap-2 text-sm text-foreground">
            <UsersIcon className="size-4" aria-hidden />
            14/18
          </p>
        </Specimen>
      </Section>
    </PageFrame>
  );
}
