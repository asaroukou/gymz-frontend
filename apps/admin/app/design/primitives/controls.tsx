'use client';

import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from 'lucide-react';

import { Button } from '@iziwellpass/ui/components/button';
import { Checkbox } from '@iziwellpass/ui/components/checkbox';
import { Combobox } from '@iziwellpass/ui/components/combobox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@iziwellpass/ui/components/input-otp';
import { Label } from '@iziwellpass/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';
import { Switch } from '@iziwellpass/ui/components/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { Matrix } from '../_chrome/matrix';
import { sectionNumber, type TocEntry } from '../_chrome/page-frame';
import { Section } from '../_chrome/section';
import { Specimen } from '../_chrome/specimen';

const BUTTON_VARIANTS = [
  'default',
  'destructive',
  'outline',
  'secondary',
  'ghost',
  'link',
] as const;
const BUTTON_SIZES = ['default', 'xs', 'sm', 'lg'] as const;

const VENUE_OPTIONS = [
  { value: 'plateau', label: 'Salle du Plateau' },
  { value: 'cocody', label: 'Studio Cocody' },
  { value: 'marcory', label: 'Piscine Marcory', disabled: true, hint: 'Fermée pour travaux' },
];

/** A form specimen needs a live react-hook-form instance to show a real error. */
function FormSpecimen() {
  const form = useForm<{ email: string }>({
    defaultValues: { email: 'pas-une-adresse' },
    mode: 'onChange',
  });

  return (
    <Form {...form}>
      <form className="w-full space-y-3" onSubmit={(event) => event.preventDefault()}>
        <FormField
          control={form.control}
          name="email"
          rules={{ pattern: { value: /.+@.+\..+/, message: 'Adresse e-mail invalide.' } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse e-mail</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Utilisée pour l’invitation du membre.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" size="sm" onClick={() => void form.trigger()}>
          Vérifier
        </Button>
      </form>
    </Form>
  );
}

function ComboboxSpecimen() {
  const [value, setValue] = useState('plateau');
  return (
    <Combobox
      options={VENUE_OPTIONS}
      value={value}
      onValueChange={setValue}
      placeholder="Choisir une salle"
      searchPlaceholder="Rechercher une salle"
      emptyText="Aucune salle."
    />
  );
}

/**
 * `Specimen` renders its children twice (light pane, dark pane) from the same
 * element, so a literal `id` string would collide across the two mounts and
 * `label[for]`/`getElementById` would resolve to the first match only. `useId`
 * returns a distinct value per mount, so this must be a component, not raw JSX.
 */
function LabelSpecimen() {
  const id = useId();
  return (
    <div className="grid w-full gap-1.5">
      <Label htmlFor={id}>Salle de rattachement</Label>
      <Input id={id} defaultValue="Salle du Plateau" />
    </div>
  );
}

function CheckboxSpecimen() {
  const invitationId = useId();
  const renewalId = useId();
  const multiVenueId = useId();

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id={invitationId} />
        <Label htmlFor={invitationId}>Envoyer l’invitation par e-mail</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={renewalId} defaultChecked />
        <Label htmlFor={renewalId}>Renouvellement automatique</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={multiVenueId} disabled />
        <Label htmlFor={multiVenueId}>Accès multi-salles</Label>
      </div>
    </div>
  );
}

export function ControlSpecimens({ entries }: { entries: readonly TocEntry[] }) {
  const number = (id: string) => sectionNumber(entries, id);

  return (
    <>
      <Section
        id="button"
        number={number('button')}
        title="Bouton"
        note="Pilule pleine. La taille par défaut fait 44px sur téléphone et redescend à 36px à partir de lg : la règle « comptoir d’abord » est encodée dans la primitive, pas laissée aux appelants."
      >
        <Specimen
          name="Button"
          signature="variant x size"
          note="Le survol et le focus clavier ne sont pas simulés : survolez et tabulez dans chaque volet."
        >
          <Matrix
            rows={BUTTON_VARIANTS}
            columns={BUTTON_SIZES}
            rowAxis="variant"
            columnAxis="size"
            render={(variant, size) => (
              <Button variant={variant} size={size}>
                Valider
              </Button>
            )}
          />
        </Specimen>

        <Specimen name="Button" signature="size=icon | icon-xs | icon-sm | icon-lg">
          {(['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const).map((size) => (
            <Button key={size} size={size} variant="outline" aria-label="Ajouter">
              <PlusIcon />
            </Button>
          ))}
        </Specimen>

        <Specimen name="Button" signature="disabled">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} disabled>
              Valider
            </Button>
          ))}
        </Specimen>
      </Section>

      <Section
        id="input"
        number={number('input')}
        title="Champ de saisie"
        note="Les champs numériques passent en font-numeric automatiquement (règle des chiffres mono)."
      >
        <Specimen name="Input" signature="défaut, avec valeur, désactivé, aria-invalid">
          <div className="grid w-full gap-3">
            <Input placeholder="Nom du membre" aria-label="Nom du membre" />
            <Input defaultValue="Aminata Diallo" aria-label="Nom renseigné" />
            <Input placeholder="Non modifiable" disabled aria-label="Champ désactivé" />
            <Input defaultValue="pas-une-adresse" aria-invalid aria-label="Champ en erreur" />
          </div>
        </Specimen>

        <Specimen
          name="Input"
          signature="type=number"
          note="Doit s’afficher en mono tabulaire : les colonnes de chiffres s’alignent."
        >
          <Input type="number" defaultValue={25000} aria-label="Montant en FCFA" />
        </Specimen>
      </Section>

      <Section id="textarea" number={number('textarea')} title="Zone de texte">
        <Specimen name="Textarea" signature="défaut, avec valeur, désactivé">
          <div className="grid w-full gap-3">
            <Textarea placeholder="Note interne sur le membre" aria-label="Note vide" />
            <Textarea
              defaultValue="Préfère les cours du matin. A réglé en espèces le 3 septembre."
              aria-label="Note remplie"
            />
            <Textarea placeholder="Non modifiable" disabled aria-label="Note désactivée" />
          </div>
        </Specimen>
      </Section>

      <Section
        id="label"
        number={number('label')}
        title="Étiquette"
        note="14px, poids 500, casse phrase. Jamais en majuscules dans le produit ; les majuscules de cette page appartiennent au chrome."
      >
        <Specimen name="Label" signature="associé à un champ">
          <LabelSpecimen />
        </Specimen>
      </Section>

      <Section
        id="form"
        number={number('form')}
        title="Formulaire"
        note="FormMessage porte l’erreur ; le champ reçoit aria-invalid. L’erreur ci-dessous est réelle : cliquez sur « Vérifier »."
      >
        <Specimen
          name="Form"
          signature="FormItem, FormLabel, FormControl, FormDescription, FormMessage"
        >
          <FormSpecimen />
        </Specimen>
      </Section>

      <Section
        id="select"
        number={number('select')}
        title="Liste déroulante"
        note="Le contenu s’ouvre dans un portail : il se rend dans le thème ambiant de la page, donc en clair."
      >
        <Specimen name="Select" signature="défaut, avec valeur, désactivé">
          <div className="grid w-full gap-3">
            <Select>
              <SelectTrigger aria-label="Choisir une salle">
                <SelectValue placeholder="Choisir une salle" />
              </SelectTrigger>
              <SelectContent>
                {VENUE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue="plateau">
              <SelectTrigger aria-label="Salle sélectionnée">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENUE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select disabled>
              <SelectTrigger aria-label="Sélecteur désactivé">
                <SelectValue placeholder="Non modifiable" />
              </SelectTrigger>
              <SelectContent />
            </Select>
          </div>
        </Specimen>
      </Section>

      <Section
        id="combobox"
        number={number('combobox')}
        title="Sélecteur avec recherche"
        note="Textes par défaut en français. Une option désactivée affiche son motif. Ouvre dans un portail, donc en clair."
      >
        <Specimen name="Combobox" signature="options, value, onValueChange">
          <ComboboxSpecimen />
        </Specimen>
        <Specimen name="Combobox" signature="disabled">
          <Combobox options={VENUE_OPTIONS} disabled placeholder="Choisir une salle" />
        </Specimen>
      </Section>

      <Section id="checkbox" number={number('checkbox')} title="Case à cocher">
        <Specimen name="Checkbox" signature="décochée, cochée, désactivée">
          <CheckboxSpecimen />
        </Specimen>
      </Section>

      <Section id="switch" number={number('switch')} title="Interrupteur">
        <Specimen name="Switch" signature="off, on, désactivé">
          <Switch aria-label="Inactif" />
          <Switch defaultChecked aria-label="Actif" />
          <Switch disabled aria-label="Désactivé" />
        </Specimen>
      </Section>

      <Section
        id="input-otp"
        number={number('input-otp')}
        title="Code à usage unique"
        note="Chiffres en mono. Utilisé à la connexion et à la validation d’un passage."
      >
        <Specimen name="InputOTP" signature="maxLength=6, vide et rempli">
          <div className="grid w-full gap-4">
            <InputOTP maxLength={6}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <InputOTP maxLength={6} value="062318" onChange={() => undefined}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </Specimen>
      </Section>

      <Section id="tabs" number={number('tabs')} title="Onglets">
        <Specimen name="Tabs" signature="TabsList, TabsTrigger, TabsContent">
          <Tabs defaultValue="presents" className="w-full">
            <TabsList>
              <TabsTrigger value="presents">Présents</TabsTrigger>
              <TabsTrigger value="attendus">Attendus</TabsTrigger>
              <TabsTrigger value="absents" disabled>
                Absents
              </TabsTrigger>
            </TabsList>
            <TabsContent value="presents" className="pt-3 text-sm">
              14 membres présents à 06:30.
            </TabsContent>
            <TabsContent value="attendus" className="pt-3 text-sm">
              4 membres attendus.
            </TabsContent>
          </Tabs>
        </Specimen>
      </Section>

      <Section
        id="dropdown-menu"
        number={number('dropdown-menu')}
        title="Menu déroulant"
        note="Ouvre dans un portail, donc en clair."
      >
        <Specimen name="DropdownMenu" signature="Trigger, Label, Item, Separator">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Membre</DropdownMenuLabel>
              <DropdownMenuItem>
                <SearchIcon />
                Voir la fiche
              </DropdownMenuItem>
              <DropdownMenuItem>Modifier l’abonnement</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Suspendre l’accès</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Specimen>
      </Section>
    </>
  );
}
