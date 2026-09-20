/**
 * The primitives the /design preview must cover. `id` is both the component
 * filename in packages/ui/src/components and the anchor id on the primitives
 * page. design-registry.test.ts asserts this list matches the directory, so a
 * new primitive cannot land without a specimen.
 */

export interface PrimitiveEntry {
  id: string;
  /** French label shown in the TOC and the section header. */
  title: string;
  group: 'controls' | 'display';
}

export const PRIMITIVES: readonly PrimitiveEntry[] = [
  // Controls and forms
  { id: 'button', title: 'Bouton', group: 'controls' },
  { id: 'input', title: 'Champ de saisie', group: 'controls' },
  { id: 'textarea', title: 'Zone de texte', group: 'controls' },
  { id: 'label', title: 'Étiquette', group: 'controls' },
  { id: 'form', title: 'Formulaire', group: 'controls' },
  { id: 'select', title: 'Liste déroulante', group: 'controls' },
  { id: 'combobox', title: 'Sélecteur avec recherche', group: 'controls' },
  { id: 'checkbox', title: 'Case à cocher', group: 'controls' },
  { id: 'switch', title: 'Interrupteur', group: 'controls' },
  { id: 'input-otp', title: 'Code à usage unique', group: 'controls' },
  { id: 'tabs', title: 'Onglets', group: 'controls' },
  { id: 'dropdown-menu', title: 'Menu déroulant', group: 'controls' },

  // Display, feedback and overlays
  { id: 'badge', title: 'Badge', group: 'display' },
  { id: 'alert', title: 'Alerte', group: 'display' },
  { id: 'capacity', title: 'Capacité', group: 'display' },
  { id: 'progress', title: 'Barre de progression', group: 'display' },
  { id: 'stat', title: 'Chiffres clés', group: 'display' },
  { id: 'table', title: 'Tableau', group: 'display' },
  { id: 'card', title: 'Carte', group: 'display' },
  { id: 'empty', title: 'État vide', group: 'display' },
  { id: 'skeleton', title: 'Squelette de chargement', group: 'display' },
  { id: 'avatar', title: 'Avatar', group: 'display' },
  { id: 'separator', title: 'Séparateur', group: 'display' },
  { id: 'dialog', title: 'Boîte de dialogue', group: 'display' },
  { id: 'sheet', title: 'Panneau latéral', group: 'display' },
  { id: 'popover', title: 'Popover', group: 'display' },
  { id: 'tooltip', title: 'Infobulle', group: 'display' },
  { id: 'sonner', title: 'Notification', group: 'display' },

  // The comptoir clair trio (front desk) plus the brand mark
  { id: 'tile', title: 'Tuile', group: 'display' },
  { id: 'command-bar', title: 'Barre de commande', group: 'display' },
  { id: 'chip', title: 'Puce', group: 'display' },
  { id: 'wordmark', title: 'Marque', group: 'display' },
];

export function primitivesInGroup(group: PrimitiveEntry['group']): readonly PrimitiveEntry[] {
  return PRIMITIVES.filter((entry) => entry.group === group);
}
