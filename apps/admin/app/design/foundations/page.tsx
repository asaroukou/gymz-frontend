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

/** Fond, côté, encre, atténué, atténué fort, pilule, pilule survol, filet. */
const NEUTRAL_TOKENS = [
  '--background',
  '--side',
  '--foreground',
  '--muted-foreground',
  '--muted-strong',
  '--secondary',
  '--accent',
  '--border',
];

/** The scrim (an alpha colour, not an opaque surface) and the invalid-field outline. */
const OVERLAY_TOKENS = ['--overlay', '--danger'];

const STATUS_TOKENS = ['--destructive', '--success', '--warning', '--info'];

/** The five pastels plus lavis, the one wash allowed behind a hub heading. */
const TINT_TOKENS = [
  '--tint-bleu',
  '--tint-vert',
  '--tint-sable',
  '--tint-rose',
  '--tint-lavande',
  '--wash',
];

const CHART_TOKENS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--chart-grid',
  '--chart-track',
];

const TYPE_STEPS = [
  {
    name: 'display',
    spec: '44px / 400 / 1.1 / −0.03em',
    className: 'text-3xl font-normal',
    sample: 'Bonjour, Awa',
  },
  {
    name: 'page title',
    spec: '32px / 400 / 1.1 / −0.03em',
    className: 'text-2xl font-normal',
    sample: 'Locataires',
  },
  {
    name: 'section',
    spec: '22px / 500 / 1.2 / −0.02em',
    className: 'text-xl font-medium',
    sample: 'Planning du jour',
  },
  {
    name: 'title',
    spec: '16px / 600 / 1.3',
    className: 'text-lg font-semibold',
    sample: 'Abonnements actifs',
  },
  {
    name: 'body',
    spec: '15px / 400 / 1.5',
    className: 'text-base',
    sample: 'Le membre a été enregistré. Sa carte est active jusqu’au 31 décembre.',
  },
  {
    name: 'label',
    spec: '13px / 500 / 1.3',
    className: 'text-sm font-medium',
    sample: 'Moyen de paiement',
  },
  {
    name: 'numeric',
    spec: '32px / 500 / tnum',
    className: 'font-numeric text-2xl font-medium',
    sample: '06:30 · 14/18',
  },
];

const SPACING_STEPS = ['1', '2', '3', '4', '6', '8', '12', '16'];

/**
 * `2xl` has no dedicated Tailwind utility literal in this file (the sweep
 * greps the source for the bare class name), so its swatch is painted with
 * the token directly via `style` instead of a class.
 */
const RADII: Array<{
  name: string;
  spec: string;
  className: string;
  style?: { borderRadius: string };
}> = [
  { name: '--radius-sm', spec: '6px', className: 'rounded-sm' },
  { name: '--radius-md', spec: '8px', className: 'rounded-md' },
  { name: '--radius-lg', spec: '20px', className: 'rounded-lg' },
  { name: '--radius-xl', spec: '24px', className: 'rounded-xl' },
  {
    name: '--radius-2xl',
    spec: '28px',
    className: '',
    style: { borderRadius: 'var(--radius-2xl)' },
  },
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
      intro="Les jetons avant les composants. Chaque nuancier affiche l’hexadécimal réellement peint, chaque paire texte/fond affiche son ratio de contraste mesuré en direct."
      entries={SECTIONS}
    >
      <Section
        id="couleur"
        number={number('couleur')}
        title="Couleur"
        note="Trois neutres pour la structure, cinq teintes pour le contenu, quatre paires de statut pour le sens. Tout est mesuré en WCAG contre la surface qui le porte."
      >
        <Specimen
          name="Neutres"
          signature="fond, côté, encre, atténué, atténué fort, pilule, pilule survol, filet"
        >
          <div className="flex w-full flex-wrap gap-2">
            {NEUTRAL_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Recouvrement"
          signature="--overlay (scrim), --danger"
          note="Le scrim est de l’encre à 25%, réservé aux dialogues et aux panneaux. Danger n’habille jamais une surface : c’est le filet d’un champ invalide."
        >
          <div className="flex w-full flex-wrap gap-2">
            {OVERLAY_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Statuts"
          signature="--destructive, --success, --warning, --info"
          note="Une teinte pâle sous un texte foncé, jamais un aplat. Elles n’apparaissent que sur un badge ou une alerte."
        >
          <div className="flex w-full flex-wrap gap-2">
            {STATUS_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Teintes"
          signature="bleu, vert, sable, rose, lavande, lavis"
          note="Cinq pastels à la même clarté pour qu’aucune tuile ne parle plus fort qu’une autre. Lavis est le seul voile radial du système, réservé au fond d’un titre de hub."
        >
          <div className="flex w-full flex-wrap gap-2">
            {TINT_TOKENS.map((token) => (
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
              label="encre sur fond"
            />
            <ContrastRow
              foreground="var(--foreground)"
              background="var(--side)"
              label="encre sur côté"
            />
            <ContrastRow
              foreground="var(--foreground)"
              background="var(--secondary)"
              label="encre sur pilule"
            />
            <ContrastRow
              foreground="var(--muted-foreground)"
              background="var(--background)"
              label="atténué sur fond"
            />
            <ContrastRow
              foreground="var(--muted-foreground)"
              background="var(--side)"
              label="atténué sur côté"
            />
            <ContrastRow
              foreground="var(--muted-strong)"
              background="var(--tint-bleu)"
              label="atténué fort sur bleu"
            />
            <ContrastRow
              foreground="var(--muted-strong)"
              background="var(--tint-vert)"
              label="atténué fort sur vert"
            />
            <ContrastRow
              foreground="var(--muted-strong)"
              background="var(--tint-sable)"
              label="atténué fort sur sable"
            />
            <ContrastRow
              foreground="var(--muted-strong)"
              background="var(--tint-rose)"
              label="atténué fort sur rose"
            />
            <ContrastRow
              foreground="var(--muted-strong)"
              background="var(--tint-lavande)"
              label="atténué fort sur lavande"
            />
            <ContrastRow
              foreground="var(--muted-strong)"
              background="var(--secondary)"
              label="atténué fort sur pilule"
            />
            <ContrastRow
              foreground="var(--success-foreground)"
              background="var(--success)"
              label="texte succès sur sa teinte"
              sample="Payé"
            />
            <ContrastRow
              foreground="var(--warning-foreground)"
              background="var(--warning)"
              label="texte attention sur sa teinte"
              sample="En attente"
            />
            <ContrastRow
              foreground="var(--destructive-foreground)"
              background="var(--destructive)"
              label="texte erreur sur sa teinte"
              sample="Suspendu"
            />
            <ContrastRow
              foreground="var(--info-foreground)"
              background="var(--info)"
              label="texte info sur sa teinte"
              sample="Invité"
            />
            <ContrastRow
              foreground="var(--primary-foreground)"
              background="var(--primary)"
              label="fond sur encre"
              sample="Valider"
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

        <Specimen name="Rayons" signature="sm 6px · md 8px · lg 20px · xl 24px · 2xl 28px · pilule">
          <div className="flex w-full flex-wrap gap-4">
            {RADII.map((radius) => (
              <div key={radius.name} className="text-center">
                <div
                  className={`size-16 border border-border bg-muted ${radius.className}`}
                  style={radius.style}
                />
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
        note="Aucune élévation : tons, espace, filet entre les lignes, scrim pour les overlays."
      />

      <Section
        id="focus"
        number={number('focus')}
        title="Focus et états"
        note="Un seul contour de focus dans toute l’application, en encre. Le survol et le focus clavier ne peuvent pas être simulés honnêtement : tabulez jusqu’au champ pour les voir."
      >
        <Specimen
          name="Contour de focus"
          signature=":focus-visible { outline: 3px solid var(--ring); outline-offset: 0.25rem }"
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
          signature="outline: 3px solid var(--ring); outline-offset: 0.25rem"
          note="Le même contour d’encre, appliqué en permanence, pour l’observer sans avoir à tabuler jusqu’au champ."
        >
          <div
            className="h-11 w-56 rounded-full border border-input bg-background px-4 text-sm leading-11 text-muted-foreground lg:h-9 lg:leading-9"
            style={{ outline: '3px solid var(--ring)', outlineOffset: '0.25rem' }}
          >
            Rechercher un membre
          </div>
        </Specimen>

        <Specimen name="Désactivé" signature="disabled:opacity-50 disabled:pointer-events-none">
          <button
            type="button"
            disabled
            className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:pointer-events-none disabled:opacity-50 lg:h-9"
          >
            Valider
          </button>
        </Specimen>
      </Section>

      <Section
        id="mouvement"
        number={number('mouvement')}
        title="Mouvement"
        note="Une seule durée, 200ms ease-out. Le mouvement est fonctionnel, jamais décoratif, et prefers-reduced-motion le neutralise dans toute l’application."
      >
        <Specimen
          name="state-change"
          signature="200ms ease-out"
          note="Changements de couleur et de fond au survol ou au basculement. Survolez le bloc."
        >
          <div className="size-24 rounded-xl border border-border bg-card transition-colors duration-200 ease-out hover:bg-accent" />
        </Specimen>

        <Specimen
          name="progress"
          signature="200ms ease-out"
          note="Largeur de la barre de capacité, chevrons d’accordéon. Survolez la piste."
        >
          <div className="group h-2 w-full rounded-full bg-chart-track">
            <div className="h-2 w-1/4 rounded-full bg-chart-1 transition-[width] duration-200 ease-out group-hover:w-3/4" />
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
