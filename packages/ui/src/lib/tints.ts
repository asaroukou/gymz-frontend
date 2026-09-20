/** The five pastel tints, rotated by position (The Tile Rule). */
export const TINTS = ['bleu', 'vert', 'sable', 'rose', 'lavande'] as const;
export type TintName = (typeof TINTS)[number];

const CLASSES: Record<TintName, string> = {
  bleu: 'bg-tint-bleu',
  vert: 'bg-tint-vert',
  sable: 'bg-tint-sable',
  rose: 'bg-tint-rose',
  lavande: 'bg-tint-lavande',
};

export function tintForIndex(index: number): TintName {
  const i = ((index % TINTS.length) + TINTS.length) % TINTS.length;
  return TINTS[i]!;
}

export function tintClass(tint: TintName): string {
  return CLASSES[tint];
}
