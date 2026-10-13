export type PageFormat = 'carta' | 'oficio';

// Oficio used in Guatemala: 8.5 × 13 inches, distinct from US Legal.
export const PAGE_FORMATS = {
  carta: { label: 'Carta', dimensions: '8.5 × 11 pulg.', height: 660 },
  oficio: { label: 'Oficio', dimensions: '8.5 × 13 pulg.', height: 780 },
} as const;
export const PAGE_WIDTH = 510;
