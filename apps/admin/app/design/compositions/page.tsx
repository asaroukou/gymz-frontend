'use client';

import { useId } from 'react';
import { PlusIcon, SearchIcon, TriangleAlertIcon, UsersIcon } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertReference,
  AlertTitle,
} from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Capacity, capacityLevel, type CapacityLevel } from '@iziwellpass/ui/components/capacity';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Stat, StatPanel } from '@iziwellpass/ui/components/stat';
import { Switch } from '@iziwellpass/ui/components/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';

import { PageFrame, sectionNumber, type TocEntry } from '../_chrome/page-frame';
import { Section } from '../_chrome/section';
import { Specimen } from '../_chrome/specimen';

const SECTIONS: readonly TocEntry[] = [
  { id: 'entete', label: 'En-tête de page' },
  { id: 'chiffres', label: 'Bande de chiffres' },
  { id: 'ligne-membre', label: 'Ligne de membre' },
  { id: 'creneau', label: 'Créneau et capacité' },
  { id: 'formulaire', label: 'Section de formulaire' },
  { id: 'liste', label: 'États d’une liste' },
];

const MEMBERS = [
  {
    name: 'Aminata Diallo',
    initials: 'AD',
    status: 'success',
    label: 'Payé',
    plan: 'Mensuel illimité',
    due: '0',
  },
  {
    name: 'Koffi N’Guessan',
    initials: 'KN',
    status: 'warning',
    label: 'En attente',
    plan: '10 séances',
    due: '25 000',
  },
  {
    name: 'Fatou Traoré',
    initials: 'FT',
    status: 'destructive',
    label: 'Suspendu',
    plan: 'Mensuel illimité',
    due: '110 000',
  },
] as const;

// Deliberately spans all three `capacityLevel` outcomes (ok, tight, over) so the
// "badge and bar agree at every level" claim in the section note below is
// actually checkable: 09:00 is roomy, 06:30 and 18:45 are tight (18/18 included
// on purpose, see the section note), and 20:00 is a genuine overbook.
const SLOTS = [
  { time: '06:30', name: 'CrossFit', booked: 16, capacity: 18 },
  { time: '09:00', name: 'Pilates', booked: 9, capacity: 18 },
  { time: '18:45', name: 'Yoga', booked: 18, capacity: 18 },
  { time: '20:00', name: 'Zumba', booked: 20, capacity: 18 },
] as const;

const LEVEL_BADGE_VARIANT: Record<CapacityLevel, 'secondary' | 'warning' | 'destructive'> = {
  ok: 'secondary',
  tight: 'warning',
  over: 'destructive',
};

/**
 * `Specimen` renders its children twice (light pane, dark pane) from the same
 * element, so literal `id` strings on the name/amount/renew fields would
 * collide across the two mounts, and `label[for]`/`getElementById` would
 * resolve to the first match only: a label in the dark pane would silently
 * operate the control in the light pane. `useId` returns a distinct value per
 * mount, so this has to be a component, not inlined JSX.
 */
function FormSpecimen() {
  const nameId = useId();
  const amountId = useId();
  const renewId = useId();

  return (
    <form className="w-full max-w-md space-y-4" onSubmit={(event) => event.preventDefault()}>
      <div className="grid gap-1.5">
        <Label htmlFor={nameId}>Nom du membre</Label>
        <Input id={nameId} defaultValue="Aminata Diallo" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={amountId}>Montant (FCFA)</Label>
        <Input id={amountId} type="number" defaultValue={25000} />
        <p className="text-xs text-muted-foreground">Réglable par Wave, Orange Money ou espèces.</p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={renewId}>Renouvellement automatique</Label>
        <Switch id={renewId} defaultChecked />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Enregistrer</Button>
        <Button type="button" variant="ghost">
          Annuler
        </Button>
      </div>
    </form>
  );
}

export default function CompositionsPage() {
  const number = (id: string) => sectionNumber(SECTIONS, id);

  return (
    <PageFrame
      title="Compositions"
      intro="Des fragments réels, assemblés à partir des primitives. Une primitive peut être correcte isolément et fausse en contexte : c’est ce que cette page cherche."
      entries={SECTIONS}
    >
      <Section
        id="entete"
        number={number('entete')}
        title="En-tête de page"
        note="Titre, compte en mono, action principale. Un seul titre display par écran."
      >
        <Specimen name="En-tête de liste" signature="titre + compte + action">
          <div className="flex w-full flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-[750] tracking-[-0.035em] text-foreground">Membres</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-numeric">248</span> membres, dont{' '}
                <span className="font-numeric">3</span> en attente de paiement
              </p>
            </div>
            <Button>
              <PlusIcon />
              Ajouter un membre
            </Button>
          </div>
        </Specimen>
      </Section>

      <Section
        id="chiffres"
        number={number('chiffres')}
        title="Bande de chiffres"
        note="Une surface unique découpée par des filets. Ce n’est pas une grille de cartes métriques, et la différence est le sujet."
      >
        <Specimen name="StatPanel" signature="4 colonnes, chargées et en chargement">
          <div className="grid w-full gap-4">
            <StatPanel className="grid-cols-2 xl:grid-cols-4">
              <Stat label="Membres actifs" value="248" />
              <Stat label="Présents aujourd’hui" value="41" />
              <Stat label="Paiements en attente" value="3" />
              <Stat label="Revenus du mois" value="1 240 000" />
            </StatPanel>
            <StatPanel className="grid-cols-2 xl:grid-cols-4">
              {[
                'Membres actifs',
                'Présents aujourd’hui',
                'Paiements en attente',
                'Revenus du mois',
              ].map((label) => (
                <Stat key={label} label={label} value={null} isLoading />
              ))}
            </StatPanel>
          </div>
        </Specimen>
      </Section>

      <Section
        id="ligne-membre"
        number={number('ligne-membre')}
        title="Ligne de membre"
        note="La même donnée en tableau et en carte. Le tableau est la vue bureau ; en dessous de sm, la liste doit se replier en cartes plutôt que défiler latéralement."
      >
        <Specimen name="Tableau" signature="avatar, badge de statut, montant numeric">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead numeric>Solde (FCFA)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MEMBERS.map((member) => (
                <TableRow key={member.name}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback>{member.initials}</AvatarFallback>
                      </Avatar>
                      {member.name}
                    </span>
                  </TableCell>
                  <TableCell>{member.plan}</TableCell>
                  <TableCell>
                    <Badge variant={member.status}>{member.label}</Badge>
                  </TableCell>
                  <TableCell numeric>{member.due}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Specimen>

        <Specimen name="Carte" signature="repli mobile de la même ligne">
          <div className="grid w-full gap-px bg-border">
            {MEMBERS.map((member) => (
              <div key={member.name} className="flex items-center gap-3 bg-background py-3">
                <Avatar className="size-9">
                  <AvatarFallback>{member.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.plan}</p>
                </div>
                <div className="text-right">
                  <Badge variant={member.status}>{member.label}</Badge>
                  <p className="mt-1 font-numeric text-xs text-muted-foreground">
                    {member.due} FCFA
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Specimen>
      </Section>

      <Section
        id="creneau"
        number={number('creneau')}
        title="Créneau et capacité"
        note="Heure en mono, capacité au seuil. Le badge et la barre doivent toujours dire la même chose à chaque niveau : ambré dès qu’une salle est pleine (ce n’est pas une erreur), rouge seulement en cas de surbooking."
      >
        <Specimen name="Liste de créneaux" signature="badge de niveau + Capacity par ligne">
          <div className="grid w-full gap-px bg-border">
            {SLOTS.map((slot) => {
              const level = capacityLevel(slot.booked, slot.capacity);
              return (
                <div key={slot.time} className="bg-background py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="flex items-baseline gap-2 text-sm text-foreground">
                      <span className="font-numeric">{slot.time}</span>
                      {slot.name}
                    </p>
                    <Badge variant={LEVEL_BADGE_VARIANT[level]} className="font-numeric">
                      {slot.booked}/{slot.capacity}
                    </Badge>
                  </div>
                  <Capacity
                    className="mt-2"
                    booked={slot.booked}
                    capacity={slot.capacity}
                    label={`${slot.time} ${slot.name}`}
                    hideCount
                  />
                </div>
              );
            })}
          </div>
        </Specimen>
      </Section>

      <Section
        id="formulaire"
        number={number('formulaire')}
        title="Section de formulaire"
        note="Étiquette au-dessus, aide en dessous, un seul bouton principal. Les cibles font 44px sur téléphone."
      >
        <Specimen name="Formulaire" signature="Label + Input + Switch + actions">
          <FormSpecimen />
        </Specimen>
      </Section>

      <Section
        id="liste"
        number={number('liste')}
        title="États d’une liste"
        note="Les quatre états qu’une liste doit savoir montrer. L’état d’erreur porte une référence support et une action de reprise ; il ne laisse jamais l’utilisateur sans issue."
      >
        <Specimen name="Liste" signature="chargement">
          <div className="grid w-full gap-px bg-border">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 bg-background py-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen name="Liste" signature="vide">
          <Empty className="w-full">
            <EmptyMedia>
              <UsersIcon className="size-6" aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Aucun membre pour l’instant</EmptyTitle>
            <EmptyDescription>
              Ajoutez un premier membre pour commencer à enregistrer les passages.
            </EmptyDescription>
            <Button className="mt-4">
              <PlusIcon />
              Ajouter un membre
            </Button>
          </Empty>
        </Specimen>

        <Specimen name="Liste" signature="aucun résultat de recherche">
          <div className="w-full">
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input className="pl-9" defaultValue="zzz" aria-label="Rechercher un membre" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Aucun membre ne correspond à « zzz ».
            </p>
          </div>
        </Specimen>

        <Specimen name="Liste" signature="erreur avec reprise">
          <Alert variant="destructive" className="w-full">
            <TriangleAlertIcon />
            <AlertTitle>Impossible de charger les membres</AlertTitle>
            <AlertDescription>Vérifiez la connexion, puis réessayez.</AlertDescription>
            <AlertReference>REQ-4F2A91</AlertReference>
            <Button variant="outline" size="sm" className="mt-3 w-fit">
              Réessayer
            </Button>
          </Alert>
        </Specimen>
      </Section>
    </PageFrame>
  );
}
