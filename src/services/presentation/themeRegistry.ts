// Theme Registry — Data-driven theme system
// Sourced from overlay-style-lab.html: 10 palettes + 10 font combos + 5 packaged kits

export interface ThemeDefinition {
  id: string
  label: string
  description: string
  tokens: {
    bg: string; surface: string; border: string; fg: string; muted: string
    accent: string; accent2: string; warning: string; accentGlow: string
    fontHeader: string; fontBody: string; fontMono: string
  }
}

// ── 10 Color Palettes (from overlay-style-lab.html) ──
export const PALETTES = [
  { id: 'terracotta-study', name: 'Terracotta Study', cat: 'general', bg: '#F5E9DA', text: '#3B2A1E', accent: '#C97C5D', accent2: '#8A9A5B', accent3: '#6B4226' },
  { id: 'neon-nightlife', name: 'Neon Nightlife', cat: 'catchy', bg: '#0D0221', text: '#FFFFFF', accent: '#FF00E4', accent2: '#00F0FF', accent3: '#FFF200' },
  { id: 'clean-mono', name: 'Clean Mono', cat: 'general', bg: '#FFFFFF', text: '#111111', accent: '#2D5BFF', accent2: '#6E6E6E', accent3: '#E5E5E5' },
  { id: 'sunset-pop', name: 'Sunset Pop', cat: 'catchy', bg: '#011627', text: '#FDFFFC', accent: '#FF6B35', accent2: '#F7C548', accent3: '#2EC4B6' },
  { id: 'pastel-dream', name: 'Pastel Dream', cat: 'catchy', bg: '#FFF7FA', text: '#3A3A3A', accent: '#FF7FB0', accent2: '#5AA9D9', accent3: '#54B892' },
  { id: 'editorial-ivory', name: 'Editorial Ivory', cat: 'general', bg: '#FAF7F2', text: '#1C1C1C', accent: '#A88B5B', accent2: '#B0342D', accent3: '#7A7A7A' },
  { id: 'cyberpunk-extreme', name: 'Cyberpunk Extreme', cat: 'catchy', bg: '#1A1A2E', text: '#FFFFFF', accent: '#FF003C', accent2: '#00FFA3', accent3: '#FFEA00' },
  { id: 'earth-beige', name: 'Earth Beige', cat: 'general', bg: '#EFE3D0', text: '#3F3F3F', accent: '#5C4033', accent2: '#A47551', accent3: '#D9A566' },
  { id: 'bubblegum-cartoon', name: 'Bubblegum Cartoon', cat: 'catchy', bg: '#FFFFFF', text: '#2B2B2B', accent: '#FF6FB5', accent2: '#4ADEDE', accent3: '#FFD23F' },
  { id: 'slate-minimal', name: 'Slate Minimal', cat: 'general', bg: '#F4F4F5', text: '#18181B', accent: '#3B82F6', accent2: '#71717A', accent3: '#DC2626' },
] as const

// ── 10 Font Combos (from overlay-style-lab.html) ──
export const FONT_COMBOS = [
  { id: 'iron-headline', name: 'Iron Headline', cat: 'catchy', display: 'Anton', body: 'Inter', accent: 'Space Mono', headlineCase: 'uppercase', headlineSize: '27px' },
  { id: 'soft-standard', name: 'Soft Standard', cat: 'general', display: 'Poppins', body: 'Poppins', accent: 'Caveat', headlineCase: 'none', headlineSize: '23px' },
  { id: 'editorial-calm', name: 'Editorial Calm', cat: 'general', display: 'Playfair Display', body: 'Lora', accent: 'DM Sans', headlineCase: 'none', headlineSize: '25px' },
  { id: 'cartoon-pop', name: 'Cartoon Pop', cat: 'catchy', display: 'Bangers', body: 'Baloo 2', accent: 'Fredoka', headlineCase: 'uppercase', headlineSize: '26px' },
  { id: 'street-grit', name: 'Street Grit', cat: 'catchy', display: 'Bebas Neue', body: 'Space Grotesk', accent: 'Archivo Black', headlineCase: 'uppercase', headlineSize: '30px' },
  { id: 'minimal-luxe', name: 'Minimal Luxe', cat: 'general', display: 'Cormorant Garamond', body: 'Montserrat', accent: 'Cormorant Garamond', headlineCase: 'none', headlineSize: '26px' },
  { id: 'bubble-y2k', name: 'Bubble Y2K', cat: 'catchy', display: 'Titan One', body: 'Baloo 2', accent: 'Chewy', headlineCase: 'none', headlineSize: '24px' },
  { id: 'build-in-public', name: 'Build in Public', cat: 'general', display: 'Manrope', body: 'Inter', accent: 'IBM Plex Mono', headlineCase: 'none', headlineSize: '23px' },
  { id: 'handwritten-note', name: 'Handwritten Note', cat: 'general', display: 'Permanent Marker', body: 'Nunito Sans', accent: 'Kalam', headlineCase: 'none', headlineSize: '23px' },
  { id: 'techno-future', name: 'Techno Future', cat: 'catchy', display: 'Unbounded', body: 'Space Grotesk', accent: 'JetBrains Mono', headlineCase: 'none', headlineSize: '22px' },
] as const

// ── 5 Packaged Kits (font + palette pre-paired) ──
const KIT_THEMES: ThemeDefinition[] = [
  {
    id: 'kit-cartoon-sunshine', label: 'Cartoon Sunshine', description: 'Comedic hooks, reaction cuts, big reveals.',
    tokens: { bg: '#FFFFFF', surface: 'rgba(0,0,0,0.04)', border: 'rgba(0,0,0,0.08)', fg: '#2B2B2B', muted: '#888', accent: '#FF6FB5', accent2: '#4ADEDE', warning: '#FFD23F', accentGlow: 'rgba(255,111,181,0.15)', fontHeader: 'Bangers', fontBody: 'Baloo 2', fontMono: 'Fredoka' },
  },
  {
    id: 'kit-terracotta-editorial', label: 'Terracotta Editorial', description: 'Reflective voiceover, aesthetic lifestyle content.',
    tokens: { bg: '#F5E9DA', surface: 'rgba(59,42,30,0.06)', border: 'rgba(59,42,30,0.12)', fg: '#3B2A1E', muted: '#8A7A6A', accent: '#C97C5D', accent2: '#8A9A5B', warning: '#6B4226', accentGlow: 'rgba(201,124,93,0.15)', fontHeader: 'Playfair Display', fontBody: 'Lora', fontMono: 'DM Sans' },
  },
  {
    id: 'kit-neon-streetwear', label: 'Neon Streetwear', description: 'Hook-window openers, hype cuts, tech/gaming edits.',
    tokens: { bg: '#1A1A2E', surface: 'rgba(255,0,60,0.06)', border: 'rgba(255,0,60,0.15)', fg: '#FFFFFF', muted: '#7a7a8a', accent: '#FF003C', accent2: '#00FFA3', warning: '#FFEA00', accentGlow: 'rgba(255,0,60,0.2)', fontHeader: 'Bebas Neue', fontBody: 'Space Grotesk', fontMono: 'Archivo Black' },
  },
  {
    id: 'kit-build-clean', label: 'Build in Public Clean', description: 'Dev-log captions, code-demo call-outs, UI walkthroughs.',
    tokens: { bg: '#F4F4F5', surface: 'rgba(0,0,0,0.03)', border: 'rgba(0,0,0,0.08)', fg: '#18181B', muted: '#71717A', accent: '#3B82F6', accent2: '#71717A', warning: '#DC2626', accentGlow: 'rgba(59,130,246,0.15)', fontHeader: 'Manrope', fontBody: 'Inter', fontMono: 'IBM Plex Mono' },
  },
  {
    id: 'kit-warm-journal', label: 'Warm Handwritten Journal', description: 'Personal story segments, behind-the-scenes, diary-style.',
    tokens: { bg: '#EFE3D0', surface: 'rgba(63,63,63,0.06)', border: 'rgba(63,63,63,0.12)', fg: '#3F3F3F', muted: '#8a7a6a', accent: '#5C4033', accent2: '#A47551', warning: '#D9A566', accentGlow: 'rgba(92,64,51,0.15)', fontHeader: 'Permanent Marker', fontBody: 'Nunito Sans', fontMono: 'Kalam' },
  },
]

// Build standalone palette themes (each palette paired with Manrope/Inter/IBM Plex Mono as default)
const PALETTE_THEMES: ThemeDefinition[] = PALETTES.map(p => ({
  id: `pal-${p.id}`, label: p.name, description: `${p.cat} palette`,
  tokens: {
    bg: p.bg, surface: hexToRgba(p.text, 0.04), border: hexToRgba(p.text, 0.1), fg: p.text,
    muted: p.accent2, accent: p.accent, accent2: p.accent2, warning: p.accent3,
    accentGlow: hexToRgba(p.accent, 0.15), fontHeader: 'Manrope', fontBody: 'Inter', fontMono: 'IBM Plex Mono',
  },
}))

export const THEME_REGISTRY: ThemeDefinition[] = [...KIT_THEMES, ...PALETTE_THEMES]

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function getTheme(id: string): ThemeDefinition {
  return THEME_REGISTRY.find(t => t.id === id) || THEME_REGISTRY[0]
}

export function getThemeTokens(id: string): Record<string, string> {
  const theme = getTheme(id)
  const tokens: Record<string, string> = {}
  for (const [key, value] of Object.entries(theme.tokens)) {
    tokens[`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value
  }
  return tokens
}

export function getThemeFromCombo(paletteId: string, comboId: string): ThemeDefinition {
  const pal = PALETTES.find(p => p.id === paletteId) || PALETTES[0]
  const combo = FONT_COMBOS.find(f => f.id === comboId) || FONT_COMBOS[0]
  return {
    id: `custom-${paletteId}-${comboId}`,
    label: `${combo.name} × ${pal.name}`,
    description: `${combo.cat} font combo + ${pal.cat} palette`,
    tokens: {
      bg: pal.bg, surface: hexToRgba(pal.text, 0.04), border: hexToRgba(pal.text, 0.1), fg: pal.text,
      muted: pal.accent2, accent: pal.accent, accent2: pal.accent2, warning: pal.accent3,
      accentGlow: hexToRgba(pal.accent, 0.15), fontHeader: combo.display, fontBody: combo.body, fontMono: combo.accent,
    },
  }
}
