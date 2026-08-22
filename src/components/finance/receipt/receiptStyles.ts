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
    rowAlt: '#f8fafc',
    totalBg: '#0f172a',
    totalBorder: '#0f172a',
    fontFamily: 'Georgia, "Times New Roman", serif',
    headingFont: 'Georgia, "Times New Roman", serif',
    monoFont: '"Courier New", Courier, monospace',
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
    rowAlt: '#fafafa',
    totalBg: '#111111',
    totalBorder: '#111111',
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFont: 'Inter, system-ui, sans-serif',
    monoFont: 'JetBrains Mono, monospace',
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
    name: 'Bold',
    description: 'High contrast — heavy weights, bright accent, strong visual hierarchy',
    preview: 'Heavy type, colored header, thick borders',
    bg: '#ffffff',
    surface: '#ffffff',
    border: '#d1d5db',
    accent: '#dc2626',
    accentBg: '#fef2f2',
    text: '#111827',
    textSecondary: '#4b5563',
    textMuted: '#9ca3af',
    divider: '#e5e7eb',
    headerBg: '#dc2626',
    headerBorder: '#dc2626',
    rowAlt: '#f9fafb',
    totalBg: '#dc2626',
    totalBorder: '#dc2626',
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFont: 'Inter, system-ui, sans-serif',
    monoFont: 'JetBrains Mono, monospace',
    borderRadius: '6px',
    layout: 'bold',
    headerStyle: 'split',
    showGridLines: false,
    showDividerLine: false,
    totalStyle: 'banner',
    stampColor: '#dc2626',
  },
  {
    id: 'glass',
    name: 'Glass',
    description: 'Dark glassmorphic — frosted surfaces, subtle glow, modern digital feel',
    preview: 'Dark backdrop, glass panels, neon accent glow',
    bg: '#0a0a0f',
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    accent: '#a78bfa',
    accentBg: 'rgba(167,139,250,0.08)',
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#475569',
    divider: 'rgba(255,255,255,0.06)',
    headerBg: 'rgba(167,139,250,0.12)',
    headerBorder: 'rgba(167,139,250,0.2)',
    rowAlt: 'rgba(255,255,255,0.02)',
    totalBg: 'rgba(167,139,250,0.15)',
    totalBorder: 'rgba(167,139,250,0.3)',
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFont: 'Inter, system-ui, sans-serif',
    monoFont: 'JetBrains Mono, monospace',
    borderRadius: '12px',
    layout: 'glass',
    headerStyle: 'left',
    showGridLines: false,
    showDividerLine: true,
    totalStyle: 'pill',
    stampColor: '#a78bfa',
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
    rowAlt: '#f5f5f5',
    totalBg: '#000000',
    totalBorder: '#000000',
    fontFamily: 'Inter, "Helvetica Neue", Helvetica, sans-serif',
    headingFont: 'Inter, "Helvetica Neue", Helvetica, sans-serif',
    monoFont: 'JetBrains Mono, monospace',
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
