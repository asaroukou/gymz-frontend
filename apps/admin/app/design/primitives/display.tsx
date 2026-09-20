'use client';

import type { ReactNode } from 'react';
import { CalendarClockIcon, PlusIcon, QrCode, TriangleAlertIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Alert,
  AlertDescription,
  AlertReference,
  AlertTitle,
} from '@iziwellpass/ui/components/alert';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
} from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Capacity } from '@iziwellpass/ui/components/capacity';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@iziwellpass/ui/components/card';
import { Chip } from '@iziwellpass/ui/components/chip';
import { CommandBar } from '@iziwellpass/ui/components/command-bar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
import {
  HubEyebrow,
  HubHero,
  HubLead,
  HubPage,
  HubTitle,
} from '@iziwellpass/ui/components/hub-page';
import {
  BackLink,
  KeyValueList,
  KeyValueRow,
  SectionHeading,
  WorkingHeader,
  WorkingPage,
} from '@iziwellpass/ui/components/working-page';
import { Popover, PopoverContent, PopoverTrigger } from '@iziwellpass/ui/components/popover';
import { Progress } from '@iziwellpass/ui/components/progress';
import { Separator } from '@iziwellpass/ui/components/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@iziwellpass/ui/components/sheet';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Stat, StatPanel } from '@iziwellpass/ui/components/stat';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import {
  Tile,
  TileCount,
  TileMeta,
  TileTime,
  TileTitle,
  TileTop,
} from '@iziwellpass/ui/components/tile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@iziwellpass/ui/components/tooltip';
import { Wash } from '@iziwellpass/ui/components/wash';
import { Wordmark } from '@iziwellpass/ui/components/wordmark';

import { sectionNumber, type TocEntry } from '../_chrome/page-frame';
import { Section } from '../_chrome/section';
import { Specimen } from '../_chrome/specimen';

const BADGE_VARIANTS = [
  'default',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'outline',
  'ghost',
  'link',
] as const;

const BADGE_LABELS: Record<string, string> = {
  default: 'Actif',
  secondary: 'Brouillon',
  destructive: 'Suspendu',
  success: 'Payé',
  warning: 'En attente',
  info: 'Invité',
  outline: 'Archivé',
  ghost: 'Aucun',
  link: 'Voir la fiche',
};

const ALERT_VARIANTS = ['default', 'destructive', 'success', 'warning', 'info'] as const;

/** The inline box that stands in for a portalled surface. See the portal note. */
function OffPortal({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      <p className="mb-2 text-xs text-muted-foreground">contenu, hors portail</p>
      <div className="grid gap-4 border border-border p-4">{children}</div>
    </div>
  );
}

export function DisplaySpecimens({ entries }: { entries: readonly TocEntry[] }) {
  const number = (id: string) => sectionNumber(entries, id);

  return (
    <>
      <Section
        id="badge"
        number={number('badge')}
        title="Badge"
        note="La couleur porte le sens, jamais la décoration. Les variantes de statut posent un texte foncé sur leur teinte pâle ; leurs ratios sont mesurés dans la page Fondations."
      >
        <Specimen name="Badge" signature="variant">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {BADGE_LABELS[variant]}
            </Badge>
          ))}
        </Specimen>
      </Section>

      <Section
        id="alert"
        number={number('alert')}
        title="Alerte"
        note="Factuelle, jamais alarmante. AlertReference porte une référence support en mono."
      >
        <Specimen name="Alert" signature="variant">
          <div className="grid w-full gap-3">
            {ALERT_VARIANTS.map((variant) => (
              <Alert key={variant} variant={variant}>
                <TriangleAlertIcon />
                <AlertTitle>Trois paiements en attente</AlertTitle>
                <AlertDescription>
                  Les abonnements concernés restent actifs jusqu’au 30 septembre.
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </Specimen>

        <Specimen name="Alert" signature="avec AlertReference">
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Impossible de charger les membres</AlertTitle>
            <AlertDescription>Vérifiez la connexion, puis réessayez.</AlertDescription>
            <AlertReference>REQ-4F2A91</AlertReference>
          </Alert>
        </Specimen>
      </Section>

      <Section
        id="capacity"
        number={number('capacity')}
        title="Capacité"
        note="L’instrument expressif du système. Le compte est en mono, le seuil colore la barre à partir de 85% et au complet, et le badge et la barre disent toujours la même chose."
      >
        <Specimen name="Capacity" signature="booked / capacity, des trois niveaux">
          <div className="grid w-full gap-4">
            <Capacity booked={9} capacity={18} label="09:00 Pilates" />
            <Capacity booked={16} capacity={18} label="06:30 CrossFit" />
            <Capacity booked={18} capacity={18} label="18:45 Yoga" />
            <Capacity booked={20} capacity={18} label="19:00 Boxe" />
            <Capacity booked={0} capacity={18} label="12:00 Aquagym" />
          </div>
        </Specimen>

        <Specimen name="Capacity" signature="hideCount">
          <Capacity booked={16} capacity={18} label="06:30 CrossFit" hideCount />
        </Specimen>
      </Section>

      <Section
        id="progress"
        number={number('progress')}
        title="Barre de progression"
        note="La primitive brute. Pour une jauge de salle, préférer Capacity, qui encode les seuils."
      >
        <Specimen name="Progress" signature="value">
          <div className="grid w-full gap-3">
            {[0, 35, 85, 100].map((value) => (
              <Progress key={value} value={value} />
            ))}
          </div>
        </Specimen>
      </Section>

      <Section
        id="stat"
        number={number('stat')}
        title="Chiffres clés"
        note="Une seule surface découpée par des filets, à la place d’une grille de cartes métriques identiques (le gabarit interdit)."
      >
        <Specimen name="StatPanel + Stat" signature="label, value">
          <StatPanel className="w-full grid-cols-2 xl:grid-cols-4">
            <Stat label="Membres actifs" value="248" />
            <Stat label="Présents aujourd’hui" value="41" />
            <Stat label="Paiements en attente" value="3" />
            <Stat label="Revenus du mois" value="1 240 000" />
          </StatPanel>
        </Specimen>

        <Specimen name="StatPanel + Stat" signature="isLoading, valeur nulle">
          <StatPanel className="w-full grid-cols-2">
            <Stat label="Membres actifs" value={null} isLoading />
            <Stat label="Présents aujourd’hui" value={null} />
          </StatPanel>
        </Specimen>
      </Section>

      <Section
        id="table"
        number={number('table')}
        title="Tableau"
        note="Les cellules numériques passent en mono tabulaire via la variante numeric, pour que les colonnes de chiffres s’alignent."
      >
        <Specimen name="Table" signature="TableHead/TableCell numeric">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead numeric>Séances</TableHead>
                <TableHead numeric>Solde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ['Aminata Diallo', 'success', 'Payé', '12', '0'],
                ['Koffi N’Guessan', 'warning', 'En attente', '3', '25 000'],
                ['Fatou Traoré', 'destructive', 'Suspendu', '0', '110 000'],
              ].map(([name, variant, status, sessions, balance]) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell>
                    <Badge variant={variant as (typeof BADGE_VARIANTS)[number]}>{status}</Badge>
                  </TableCell>
                  <TableCell numeric>{sessions}</TableCell>
                  <TableCell numeric>{balance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Specimen>
      </Section>

      <Section
        id="card"
        number={number('card')}
        title="Carte"
        note="À réserver aux cas où la carte est vraiment la bonne affordance. Jamais imbriquée."
      >
        <Specimen name="Card" signature="Header, Title, Description, Content">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Salle du Plateau</CardTitle>
              <CardDescription>Ouverte de 06:00 à 21:00, du lundi au samedi.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">18 places, 4 encadrants.</CardContent>
          </Card>
        </Specimen>
      </Section>

      <Section
        id="empty"
        number={number('empty')}
        title="État vide"
        note="Jamais un cul-de-sac : l’état vide dit toujours quoi faire ensuite."
      >
        <Specimen name="Empty" signature="Media, Title, Description, Content">
          <Empty className="w-full">
            <EmptyMedia>
              <UsersIcon className="size-6" aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Aucun membre pour l’instant</EmptyTitle>
            <EmptyDescription>
              Ajoutez un premier membre pour commencer à enregistrer les passages.
            </EmptyDescription>
            <EmptyContent>
              <Button>
                <PlusIcon />
                Ajouter un membre
              </Button>
            </EmptyContent>
          </Empty>
        </Specimen>
      </Section>

      <Section
        id="skeleton"
        number={number('skeleton')}
        title="Squelette de chargement"
        note="Même rayon que la surface qu’il remplace. L’animation s’arrête si prefers-reduced-motion est actif."
      >
        <Specimen name="Skeleton" signature="tailles usuelles">
          <div className="grid w-full gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Specimen>
      </Section>

      <Section id="avatar" number={number('avatar')} title="Avatar">
        <Specimen name="Avatar" signature="Fallback, AvatarGroup">
          <Avatar>
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>KN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>FT</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        </Specimen>

        <Specimen name="Avatar" signature="size=sm | default | lg">
          <Avatar size="sm">
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
        </Specimen>

        <Specimen
          name="Avatar"
          signature="AvatarBadge, aux trois tailles"
          note="La pastille se dimensionne d’après la taille de l’avatar qui la contient."
        >
          {(['sm', 'default', 'lg'] as const).map((size) => (
            <Avatar key={size} size={size}>
              <AvatarFallback>AD</AvatarFallback>
              <AvatarBadge />
            </Avatar>
          ))}
        </Specimen>
      </Section>

      <Section id="separator" number={number('separator')} title="Séparateur">
        <Specimen name="Separator" signature="horizontal, vertical">
          <div className="grid w-full gap-3">
            <Separator />
            <div className="flex h-8 items-center gap-3 text-sm">
              <span>06:30</span>
              <Separator orientation="vertical" />
              <span>Salle du Plateau</span>
            </div>
          </div>
        </Specimen>
      </Section>

      <Section
        id="dialog"
        number={number('dialog')}
        title="Boîte de dialogue"
        note="Le déclencheur ouvre la vraie boîte, dans un portail. La boîte ci-dessous montre le même contenu hors portail, sans revendiquer le rayon réel."
      >
        <Specimen name="Dialog" signature="déclencheur réel">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Supprimer le membre</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer ce membre ?</DialogTitle>
                <DialogDescription>
                  Son historique de passages sera conservé, mais son accès sera révoqué
                  immédiatement.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost">Annuler</Button>
                <Button variant="destructive">Supprimer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Specimen>

        <Specimen name="Dialog" signature="Header, Title, Description, Footer">
          {/* DialogTitle/DialogDescription read Radix's Dialog context for their
              id wiring, so the mockup needs a (closed, trigger-less) Dialog root
              even though it never opens the portalled DialogContent. */}
          <Dialog>
            <OffPortal>
              <DialogHeader>
                <DialogTitle>Supprimer ce membre ?</DialogTitle>
                <DialogDescription>
                  Son historique de passages sera conservé, mais son accès sera révoqué
                  immédiatement.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost">Annuler</Button>
                <Button variant="destructive">Supprimer</Button>
              </DialogFooter>
            </OffPortal>
          </Dialog>
        </Specimen>
      </Section>

      <Section
        id="sheet"
        number={number('sheet')}
        title="Panneau latéral"
        note="Même limite de portail que la boîte de dialogue."
      >
        <Specimen name="Sheet" signature="déclencheur réel">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Ouvrir la fiche</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Aminata Diallo</SheetTitle>
                <SheetDescription>
                  Abonnement mensuel illimité, actif jusqu’au 31 décembre.
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </Specimen>

        <Specimen name="Sheet" signature="Header, Title, Description">
          {/* Same context requirement as the Dialog mockup above: SheetTitle and
              SheetDescription read Radix's Dialog context (Sheet shares the
              Dialog primitive) even outside the portalled SheetContent. */}
          <Sheet>
            <OffPortal>
              <SheetHeader>
                <SheetTitle>Aminata Diallo</SheetTitle>
                <SheetDescription>
                  Abonnement mensuel illimité, actif jusqu’au 31 décembre.
                </SheetDescription>
              </SheetHeader>
            </OffPortal>
          </Sheet>
        </Specimen>
      </Section>

      <Section
        id="popover"
        number={number('popover')}
        title="Popover"
        note="Ouvre dans un portail, au même niveau que la page."
      >
        <Specimen name="Popover" signature="Trigger, Content">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarClockIcon />
                Choisir une date
              </Button>
            </PopoverTrigger>
            <PopoverContent className="text-sm">
              Les créneaux du 6 septembre sont complets.
            </PopoverContent>
          </Popover>
        </Specimen>
      </Section>

      <Section
        id="tooltip"
        number={number('tooltip')}
        title="Infobulle"
        note="Ouvre dans un portail, comme les autres calques flottants."
      >
        <Specimen name="Tooltip" signature="Provider, Trigger, Content">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Capacité">
                  <UsersIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>14 présents sur 18 places</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Specimen>
      </Section>

      <Section
        id="sonner"
        number={number('sonner')}
        title="Notification"
        note="Le déclencheur fonctionne ici : le Toaster est monté dans les providers de l’application, qui enveloppent aussi cette page. La notification se rend au niveau du document, comme les autres calques portés."
      >
        <Specimen name="toast" signature="déclencheur">
          <Button variant="outline" onClick={() => toast('Passage enregistré à 06:32.')}>
            Déclencher une notification
          </Button>
        </Specimen>
      </Section>

      <Section
        id="tile"
        number={number('tile')}
        title="Tuile"
        note="Le contenu qu’on survole du regard : sessions, forfaits, salles. 24px de rayon, une des cinq teintes, jamais de filet ni d’ombre (la règle de la tuile)."
      >
        <Specimen name="Tile" signature="tint (les cinq teintes), Top/Time/Count/Title/Meta">
          <div className="flex w-full flex-wrap gap-3">
            {[0, 1, 2, 3, 4].map((index) => (
              <Tile key={index} tint={index} className="w-36">
                <TileTop>
                  <TileTime>06:30</TileTime>
                  <TileCount>14/18</TileCount>
                </TileTop>
                <div>
                  <TileTitle>CrossFit</TileTitle>
                  <TileMeta>Salle du Plateau</TileMeta>
                </div>
              </Tile>
            ))}
          </div>
        </Specimen>
      </Section>

      <Section
        id="command-bar"
        number={number('command-bar')}
        title="Barre de commande"
        note="Le contrôle central du comptoir : une pilule blanche filetée avec une icône, un placeholder et le seul rond d’encre plein de l’écran."
      >
        <Specimen name="CommandBar" signature="icon, placeholder, submitLabel">
          <CommandBar
            icon={<QrCode />}
            placeholder="Scanner un QR ou rechercher un membre"
            submitLabel="Valider"
          />
        </Specimen>
      </Section>

      <Section
        id="chip"
        number={number('chip')}
        title="Puce"
        note="Une pilule de filtre ou de valeur choisie, avec un retrait optionnel."
      >
        <Specimen name="Chip" signature="avec et sans onRemove">
          <Chip>Adhésion mensuelle</Chip>
          <Chip onRemove={() => undefined} removeLabel="Retirer le filtre">
            Salle du Plateau
          </Chip>
        </Specimen>
      </Section>

      <Section id="wordmark" number={number('wordmark')} title="Marque">
        <Specimen name="Wordmark" signature="name, size=sm | md">
          <Wordmark name="IziWellPass" />
          <Wordmark name="IziWellPass" size="sm" />
        </Specimen>
      </Section>

      <Section
        id="hub-page"
        number={number('hub-page')}
        title="Page de hub"
        note="La colonne 940px de l’accueil et du tableau de bord : Hero, puis les sections empilées. Sans lavis ici, pour isoler la hiérarchie du titre."
      >
        <Specimen name="HubPage" signature="HubHero, HubEyebrow, HubTitle, HubLead">
          <HubPage className="max-w-none">
            <HubHero>
              <HubEyebrow>Samedi 20 septembre · Studio Dakar Plateau</HubEyebrow>
              <HubTitle>Bonjour, Moussa</HubTitle>
              <HubLead>Un titre léger, une seule action, rien qui rivalise.</HubLead>
            </HubHero>
          </HubPage>
        </Specimen>
      </Section>

      <Section
        id="wash"
        number={number('wash')}
        title="Lavis"
        note="Le seul dégradé du système (DESIGN.md §4) : un radial derrière un titre de hub, cadré 800×640, masqué sous md."
      >
        <Specimen name="Wash" signature="derrière un titre de hub">
          <div className="relative h-[320px] w-full max-w-[640px] overflow-hidden">
            <Wash className="md:block" />
            <HubTitle className="relative text-center">Le lavis</HubTitle>
          </div>
        </Specimen>
      </Section>

      <Section
        id="working-page"
        number={number('working-page')}
        title="Page de travail"
        note="Les écrans de travail (planning, membres, équipe, établissements) : un titre 32 léger, une action sombre, un lien de retour 14, des titres de section 22 et des lignes clé/valeur entre filets."
      >
        <Specimen
          name="WorkingPage"
          signature="WorkingHeader, BackLink, SectionHeading, KeyValueList, KeyValueRow"
        >
          <WorkingPage className="max-w-[640px]">
            <BackLink href="#working-page">Retour aux membres</BackLink>
            <WorkingHeader
              title="Awa Ndiaye"
              subtitle="Membre depuis le 3 mars 2026"
              badges={
                <>
                  <Badge variant="success">Actif</Badge>
                  <Badge>Mensuel</Badge>
                </>
              }
            />
            <div className="flex flex-col gap-4">
              <SectionHeading
                title="Adhésion"
                description="Ce que le membre a acheté et jusqu'à quand."
                action={
                  <Button variant="secondary" size="sm">
                    <PlusIcon />
                    Attribuer une formule
                  </Button>
                }
              />
              <KeyValueList>
                <KeyValueRow label="Type">Mensuel</KeyValueRow>
                <KeyValueRow label="Début">1 sept. 2026</KeyValueRow>
                <KeyValueRow label="Statut">
                  <Badge variant="success">Actif</Badge>
                </KeyValueRow>
              </KeyValueList>
            </div>
          </WorkingPage>
        </Specimen>
      </Section>
    </>
  );
}
