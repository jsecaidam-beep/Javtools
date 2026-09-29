export type BadgeColor = 'none' | 'blue' | 'green' | 'orange' | 'gray' | 'red' | 'yellow' | 'purple';

export type CellAlign = 'left' | 'center' | 'right';

export interface TableCell {
  id: string;
  value: string;
  align?: CellAlign;
  badgeColor?: BadgeColor;
  bgColor?: string; // Optional custom background color (e.g. #90C34F, #FFFF00, #F4911E, #E5243B)
  textColor?: string; // Optional custom text color (e.g. #000000, #FFFFFF)
  isBold?: boolean;
  rowSpan?: number;
  colSpan?: number;
  isProgressBar?: boolean;
  progressPercent?: number; // 0 - 100 if isProgressBar is true
  isSpannedChild?: boolean; // True if cell is covered by another cell's rowSpan/colSpan
}

export interface TableRow {
  id: string;
  cells: TableCell[];
  isGroupHeader?: boolean;
  groupLabel?: string;
  rowBgColor?: string;
}

export interface TableHeaderCell {
  value: string;
  colSpan?: number;
  rowSpan?: number;
  bgColor?: string;
  textColor?: string;
}

export interface TableData {
  title: string;
  subtitle?: string;
  headers: string[];
  headerRows?: TableHeaderCell[][]; // Optional multi-row headers like in the user's SAN/CARI matrix
  headerBgColors?: string[]; // Per-column header background color override
  rows: TableRow[];
  notes?: string;
  source?: string;
  suggestedChartType?: 'bar' | 'horizontalBar' | 'pie' | 'doughnut' | 'line' | 'stackedBar';
  chartLabelCol?: number;
  chartValueCols?: number[];
  tableStylePreset?: 'ach-official' | 'cari-severity' | 'monitoring-kpi' | 'clean-minimal';
  highlightStyle?: 'full-cell' | 'colored-text' | 'soft-pastel' | 'badge-pill' | 'clean-none'; // Style for severity and colored cells
  wordFitMode?: 'autofit' | 'content-compact' | 'fixed-100'; // Margins and page fit for Word export
}

export interface PredefinedTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  data: TableData;
}
