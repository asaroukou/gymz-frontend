'use client';

import { PageFrame, type TocEntry } from '../_chrome/page-frame';
import { CONTROL_SECTIONS, ControlSpecimens } from './controls';
import { DISPLAY_SECTIONS, DisplaySpecimens } from './display';

const SECTIONS: readonly TocEntry[] = [...CONTROL_SECTIONS, ...DISPLAY_SECTIONS];

export default function PrimitivesPage() {
  return (
    <PageFrame
      title="Primitives"
      intro="Chaque composant de packages/ui, avec ses variantes, ses tailles et ses états pilotés par props. Le survol et le focus clavier sont annotés plutôt que simulés : une classe ne peut pas mentir sur un état qu’elle ne peut pas déclencher."
      entries={SECTIONS}
    >
      <ControlSpecimens entries={SECTIONS} />
      <DisplaySpecimens entries={SECTIONS} />
    </PageFrame>
  );
}
