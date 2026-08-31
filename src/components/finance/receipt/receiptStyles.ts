export interface ReceiptStyle {
  id: string;
  name: string;
  description: string;
  preview: string;
  bg: string;
  surface: string;
  border: string;
  accent: string;
  accentBg: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  divider: string;
  headerBg: string;
  headerBorder: string;
  headerText: string;
  rowAlt: string;
  totalBg: string;
  totalBorder: string;
  fontFamily: string;
  headingFont: string;
  monoFont: string;
  borderRadius: string;
  layout: 'classic' | 'minimal' | 'bold' | 'glass' | 'swiss';
  headerStyle: 'left' | 'center' | 'split';
  showGridLines: boolean;
  showDividerLine: boolean;
  totalStyle: 'box' | 'line' | 'banner' | 'pill';
  stampColor: string;
}

export const RECEIPT_STYLES: ReceiptStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Formal invoice — clean lines, serif headings, traditional receipt layout',
    preview: 'Serif headings, ruled lines, centered total',
    bg: '#ffffff',
    surface: '#fafafa',
    border: '#e5e7eb',
    accent: '#1e293b',
    accentBg: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    divider: '#e2e8f0',
    headerBg: '#0f172a',
    headerBorder: '#1e293b',
    headerText: '#ffffff',
    rowAlt: '#f8fafc',
    totalBg: '#0f172a',
    totalBorder: '#0f172a',
    fontFamily: 'Georgia, "Times New Roman", "Noto Serif", serif',
    headingFont: 'Georgia, "Times New Roman", "Noto Serif", serif',
    monoFont: '"Courier New", Courier, "Lucida Console", monospace',
    borderRadius: '2px',
    layout: 'classic',
    headerStyle: 'center',
    showGridLines: true,
    showDividerLine: true,
    totalStyle: 'box',
    stampColor: '#0f172a',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-clean — lots of whitespace, thin type, understated elegance',
    preview: 'Thin weight, generous spacing, hairline dividers',
    bg: '#ffffff',
    surface: '#ffffff',
    border: '#f0f0f0',
    accent: '#111111',
    accentBg: '#f9f9f9',
    text: '#111111',
    textSecondary: '#666666',
    textMuted: '#bbbbbb',
    divider: '#eeeeee',
    headerBg: '#ffffff',
    headerBorder: '#111111',
    headerText: '#111111',
    rowAlt: '#fafafa',
    totalBg: '#111111',
    totalBorder: '#111111',
    fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
    headingFont: 'Inter, -apple-system, system-ui, sans-serif',
    monoFont: '"Courier New", Courier, "Lucida Console", monospace',
    borderRadius: '0px',
    layout: 'minimal',
    headerStyle: 'left',
    showGridLines: false,
    showDividerLine: true,
    totalStyle: 'line',
    stampColor: '#111111',
  },
  {
    id: 'bold',
    name: 'Executive',
    description: 'Premium executive — deep navy header, gold accent, refined typography',
    preview: 'Navy header, gold accent, clean serif headings',
    bg: '#ffffff',
    surface: '#f8fafc',
    border: '#cbd5e1',
    accent: '#b45309',
    accentBg: '#fffbeb',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    divider: '#e2e8f0',
    headerBg: '#0f172a',
    headerBorder: '#1e293b',
    headerText: '#f1f5f9',
    rowAlt: '#f8fafc',
    totalBg: '#0f172a',
    totalBorder: '#1e293b',
    fontFamily: 'Georgia, "Times New Roman", serif',
    headingFont: 'Georgia, "Times New Roman", serif',
    monoFont: '"Courier New", Courier, "Lucida Console", monospace',
    borderRadius: '4px',
    layout: 'bold',
    headerStyle: 'split',
    showGridLines: false,
    showDividerLine: true,
    totalStyle: 'banner',
    stampColor: '#b45309',
  },
  {
    id: 'glass',
    name: 'Slate',
    description: 'Modern dark — clean charcoal surfaces, crisp white text, subtle teal accent',
    preview: 'Dark charcoal, white text, teal accent lines',
    bg: '#111827',
    surface: '#1f2937',
    border: '#374151',
    accent: '#0d9488',
    accentBg: 'rgba(13,148,136,0.1)',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    textMuted: '#6b7280',
    divider: '#374151',
    headerBg: '#064e3b',
    headerBorder: '#065f46',
    headerText: '#ecfdf5',
    rowAlt: 'rgba(255,255,255,0.03)',
    totalBg: '#064e3b',
    totalBorder: '#065f46',
    fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
    headingFont: 'Inter, -apple-system, system-ui, sans-serif',
    monoFont: '"Courier New", Courier, "Lucida Console", monospace',
    borderRadius: '8px',
    layout: 'glass',
    headerStyle: 'left',
    showGridLines: false,
    showDividerLine: true,
    totalStyle: 'pill',
    stampColor: '#0d9488',
  },
  {
    id: 'swiss',
    name: 'Swiss',
    description: 'Swiss grid — strict alignment, numbered sections, Helvetica aesthetic',
    preview: 'Numbered sections, grid lines, asymmetric layout',
    bg: '#ffffff',
    surface: '#ffffff',
    border: '#000000',
    accent: '#000000',
    accentBg: '#f5f5f5',
    text: '#000000',
    textSecondary: '#555555',
    textMuted: '#999999',
    divider: '#000000',
    headerBg: '#000000',
    headerBorder: '#000000',
    headerText: '#ffffff',
    rowAlt: '#f5f5f5',
    totalBg: '#000000',
    totalBorder: '#000000',
    fontFamily: 'Inter, -apple-system, "Helvetica Neue", Helvetica, sans-serif',
    headingFont: 'Inter, -apple-system, "Helvetica Neue", Helvetica, sans-serif',
    monoFont: '"Courier New", Courier, "Lucida Console", monospace',
    borderRadius: '0px',
    layout: 'swiss',
    headerStyle: 'split',
    showGridLines: true,
    showDividerLine: true,
    totalStyle: 'box',
    stampColor: '#000000',
  },
];

export function getReceiptStyle(id: string): ReceiptStyle {
  return RECEIPT_STYLES.find(s => s.id === id) || RECEIPT_STYLES[0];
}
