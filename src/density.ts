export const DENSITY_LABELS: ReadonlyArray<[number, string]> = [
  [20, 'Plain English'],
  [40, 'Light'],
  [60, 'Moderate'],
  [80, 'Heavy'],
  [100, 'Maximum Synergy'],
];

export function activeTickIndex(value: number): number {
  const activeIndex = DENSITY_LABELS.findIndex(([threshold]) => value <= threshold);
  return activeIndex === -1 ? DENSITY_LABELS.length - 1 : activeIndex;
}
