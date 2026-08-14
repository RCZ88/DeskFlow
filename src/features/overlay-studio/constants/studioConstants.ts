export const PIPELINE_STEPS = [
  { key: 'source', label: 'Source', icon: 'Film' },
  { key: 'transcript', label: 'Transcript', icon: 'FileText' },
  { key: 'visual-evidence', label: 'Visual Evidence', icon: 'Eye' },
  { key: 'cut-plan', label: 'Cut Plan', icon: 'Scissors' },
  { key: 'scene-plan', label: 'Scene Plan', icon: 'Layers' },
  { key: 'visualizer', label: 'Preview', icon: 'Play' },
  { key: 'export', label: 'Export', icon: 'Download' },
] as const

export const OVERLAY_COLORS: Record<string, string> = {
  hook: '#fbbf24', body: '#e2e8f0', caption: '#94a3b8', bullet: '#22d3ee', keyword: '#22d3ee',
}

export const SAFE_ZONE_COLORS: Record<string, string> = {
  forbidden: 'bg-red-500/10 border border-red-500/30',
  discouraged: 'bg-amber-500/10 border border-amber-500/30',
  reserved: 'bg-cyan-500/10 border border-cyan-500/30',
  preferred: 'bg-emerald-500/10 border border-emerald-500/20',
}
