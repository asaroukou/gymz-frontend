import { PageFrame } from '../_chrome/page-frame';
import { ControlSpecimens } from './controls';
import { DisplaySpecimens } from './display';
import { PRIMITIVE_SECTIONS } from './sections';

export default function PrimitivesPage() {
  return (
    <PageFrame
      title="Primitives"
      intro="Chaque composant de packages/ui, avec ses variantes, ses tailles et ses états pilotés par props. Le survol et le focus clavier sont annotés plutôt que simulés : une classe ne peut pas mentir sur un état qu’elle ne peut pas déclencher."
      entries={PRIMITIVE_SECTIONS}
    >
      <ControlSpecimens entries={PRIMITIVE_SECTIONS} />
      <DisplaySpecimens entries={PRIMITIVE_SECTIONS} />
    </PageFrame>
  );
}
