import { useState } from 'react'
import { BookOpen, Zap, Target, Eye, MessageSquare, Lightbulb, ShieldCheck, TrendingUp, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { Card, Chip, GhostButton } from './ui'
import { BlurFade, BentoCard } from './ui-laminar'
import { cn } from '@/lib/utils'

const FORMATS = [
  { id: 'listicle', name: 'The Listicle', structure: 'Hook + 3 items + CTA', best: 'Mistakes, tips, steps, tools', max: '30-40s', color: '#f5c518', example: '"3 mistakes killing your ML progress"', banned: false },
  { id: 'proof-first', name: 'The Proof-First', structure: 'Hook + shocking proof + mechanism + CTA', best: 'Security flaws, bugs, leaks', max: '25-35s', color: '#ef4444', example: '"Your AI is bleeding money"', banned: false },
  { id: 'before-after', name: 'The Before/After', structure: 'Hook + broken state + fixed state + how', best: 'Refactors, optimizations', max: '30-40s', color: '#10b981', example: '"Your code vs optimized code"', banned: false },
  { id: 'single-insight', name: 'The Single Insight', structure: 'Hook + one diagram + one explanation + CTA', best: 'Math concepts, one-line tricks', max: '20-30s', color: '#3b82f6', example: '"The entire SVM in one line of NumPy"', banned: false },
  { id: 'story', name: 'The Story', structure: 'Hook + problem + struggle + solution + CTA', best: 'Personal journey (risky)', max: '45-60s', color: '#8b5cf6', example: '"How I learned SVM in 3 days"', banned: false },
  { id: 'reaction', name: 'The Reaction', structure: 'Hook + original clip + your reaction + verdict', best: 'Reviews, hot takes', max: '30-45s', color: '#ec4899', example: '"This tutorial is wrong"', banned: false },
]

const BANNED_FORMATS = ['Framework Explanation', 'Tutorial', 'Series Episode', 'Deep Dive']

const HOOK_FRAMEWORKS = [
  { id: 'shock-logic', name: 'Shock-to-Logic', template: '"Stop doing X. It\'s the reason you\'re getting Y."', example: '"Stop copying sklearn code. It\'s why you can\'t debug."', color: '#ef4444' },
  { id: 'specific-result', name: 'Specific Result', template: '"I got [X-result] in [X-time] by doing this."', example: '"I got 6× views in 2 weeks by adding visual overlays."', color: '#10b981' },
  { id: 'open-loop', name: 'Open Loop', template: '"Wait for the last part — this is where everyone gets it wrong."', example: '"Wait for mistake 3 — this is the one that killed my progress."', color: '#f5c518' },
  { id: 'contrarian', name: 'Contrarian Take', template: '"Unpopular opinion: [common advice] is actually holding you back."', example: '"Unpopular opinion: Frameworks are making you dumber."', color: '#8b5cf6' },
  { id: 'pov', name: 'Relatable Pain (POV)', template: '"POV: You [do X]… and [bad outcome] still happens."', example: '"POV: You import sklearn… and still can\'t explain SVM."', color: '#3b82f6' },
  { id: 'speed-run', name: 'Speed-Run', template: '"How I [achieved X] in [absurdly short time]."', example: '"How I learned SVM in 3 days instead of 3 months."', color: '#ec4899' },
  { id: 'proof-first', name: 'Proof First', template: '"[Concrete number/broken state]. Here\'s what that means."', example: '"60 views on my last video. Here\'s why."', color: '#06b6d4' },
]

const SEO_PHRASES = [
  { phrase: 'machine learning from scratch', where: 'First 5s', signal: 'High-save niche' },
  { phrase: 'Python tutorial', where: 'Flash as text', signal: 'Education bucket' },
  { phrase: 'AI engineering', where: 'Say naturally', signal: 'Career-intent' },
  { phrase: 'build in public', where: 'Say at close', signal: 'Community signal' },
  { phrase: 'save this for later', where: 'Say at end', signal: 'Direct save trigger' },
  { phrase: 'repo in bio', where: 'Say at end', signal: 'Profile visit signal' },
]

const BANNED_WORDS = ['Hey guys', 'In this video', 'So basically', 'Kind of', 'Sort of']

const FRAMEWORKS = [
  { id: 'font', name: '3-Font Hierarchy', rules: ['Hook: Anton 64pt Yellow, 3px black stroke', 'Body: League Spartan 48pt White, 3px black stroke', 'Caption: Montserrat Bold 40pt White/Cyan, 3px black stroke'] },
  { id: 'hook', name: 'Hook Constraints', rules: ['Maximum 6 words', 'Must deliver stakes immediately', 'Use "you" or "I" — write for the ear', 'No robotic, abstract language'] },
  { id: 'format', name: 'Format Rules', rules: ['Full face centered/upper-third, no small face cam', 'Visual asset required every video', 'Hard cut every 3-4s, no fades', 'Face cam zone: bottom-right 270×360px, 12px radius', 'Right 320px and bottom 400px = NO TEXT EVER'] },
  { id: 'ml', name: '4-Stage ML Learning', rules: ['Stage 1: Pure Python — build from scratch, no libraries', 'Stage 2: NumPy — vectorize, replace loops with arrays', 'Stage 3: PyTorch — use libraries with understanding', 'Stage 4: Hardware — CUDA/GPU optimization'] },
  { id: '3am', name: '3 AM Rule', rules: ['No strategic decisions after 10 PM', 'AI must enforce sleep over strategy debates at night'] },
]

const VISUAL_LAYERS = [
  { layer: 'Layer 1', desc: 'Main content (screen recording, code, diagram)', color: '#3b82f6' },
  { layer: 'Layer 2', desc: 'Face cam (small, bottom-right)', color: '#10b981' },
  { layer: 'Layer 3', desc: 'Text overlay / annotation / animation', color: '#f5c518' },
]

const SCENE_PATTERNS = [
  { name: 'Pattern A (A/B Cut)', desc: 'Face (3s) → Screen (5s) → Face (2s) → Screen (4s)' },
  { name: 'Pattern B (Zoom Cascade)', desc: 'Wide (2s) → Medium (3s) → Close (2s) → Wide (2s)' },
  { name: 'Pattern C (Split Screen)', desc: 'Left = "Wrong way" (red), Right = "Right way" (green)' },
]

const DECISION_RULES = [
  'Never generate production blueprints without Phase 1 validation',
  'Never suggest formats from the BANNED list',
  'Never give bullet points to say — only frames (visual + one line)',
  'Never suggest context-first — proof first, mechanism second, context never',
  'Never let user film without pre-made visual assets',
  'Score < 0.6 = REJECTED (regenerate that phrase)',
  'Evidence must quote the frame\'s own wording (no hand-waving)',
  'Every video ≤ 45 seconds unless explicitly requested long-form',
  'One CTA only (comment keyword / save / share)',
  'Post at WIB 7-10 AM (EST 7-10 PM)',
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors">
      {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
    </button>
  )
}

export function PlaybookView() {
  const [openSection, setOpenSection] = useState<string | null>('formats')
  const [openFormat, setOpenFormat] = useState<string | null>(null)
  const [openFramework, setOpenFramework] = useState<string | null>(null)

  const toggle = (id: string) => setOpenSection(openSection === id ? null : id)

  const sections = [
    { id: 'formats', label: 'Format Taxonomy', icon: <Target size={14} />, count: FORMATS.length },
    { id: 'hooks', label: 'Hook Frameworks', icon: <Zap size={14} />, count: HOOK_FRAMEWORKS.length },
    { id: 'seo', label: 'Hidden SEO Phrases', icon: <Eye size={14} />, count: SEO_PHRASES.length },
    { id: 'frameworks', label: 'Established Frameworks', icon: <ShieldCheck size={14} />, count: FRAMEWORKS.length },
    { id: 'visual', label: 'Visual Dynamism', icon: <Lightbulb size={14} />, count: VISUAL_LAYERS.length },
    { id: 'rules', label: 'Decision Rules', icon: <MessageSquare size={14} />, count: DECISION_RULES.length },
  ]

  return (
    <section className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="text-[#f5c518]" />
        <div>
          <div className="text-sm font-semibold text-zinc-100">Clement's Playbook</div>
          <div className="text-[10px] text-zinc-500">Formats, hooks, SEO, frameworks, visual rules, decision constraints</div>
        </div>
      </div>

      {sections.map(sec => (
        <div key={sec.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <button onClick={() => toggle(sec.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <span className="text-[#f5c518]">{sec.icon}</span>
              <span className="text-xs font-medium text-zinc-200">{sec.label}</span>
              <Chip className="text-[9px]">{sec.count}</Chip>
            </div>
            {openSection === sec.id ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
          </button>

          {openSection === sec.id && (
            <div className="border-t border-white/[0.06] px-4 py-3">
              {/* FORMATS */}
              {sec.id === 'formats' && (
                <div className="space-y-2">
                  {FORMATS.map(f => (
                    <button key={f.id} onClick={() => setOpenFormat(openFormat === f.id ? null : f.id)}
                      className="w-full rounded-lg border border-white/[0.06] p-3 text-left transition-all hover:border-white/[0.12] hover:bg-white/[0.03]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                          <span className="text-xs font-medium text-zinc-200">{f.name}</span>
                          <Chip className="text-[9px]">{f.max}</Chip>
                        </div>
                        {openFormat === f.id ? <ChevronDown size={10} className="text-zinc-500" /> : <ChevronRight size={10} className="text-zinc-500" />}
                      </div>
                      {openFormat === f.id && (
                        <div className="mt-2 space-y-1.5 text-[10px] text-zinc-400">
                          <div><span className="text-zinc-600">Structure: </span>{f.structure}</div>
                          <div><span className="text-zinc-600">Best for: </span>{f.best}</div>
                          <div className="flex items-center gap-1"><span className="text-zinc-600">Example:</span> <span className="italic text-zinc-300">{f.example}</span> <CopyButton text={f.example} /></div>
                        </div>
                      )}
                    </button>
                  ))}
                  <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.03] p-3">
                    <div className="mb-1 text-[10px] font-semibold tracking-wider text-rose-400 uppercase">Banned Formats</div>
                    <div className="flex flex-wrap gap-1.5">
                      {BANNED_FORMATS.map(f => <Chip key={f} className="border-rose-500/25 bg-rose-500/10 text-rose-400 text-[9px]">{f}</Chip>)}
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500">These require too much audience buy-in for current level</div>
                  </div>
                </div>
              )}

              {/* HOOKS */}
              {sec.id === 'hooks' && (
                <div className="grid grid-cols-2 gap-2">
                  {HOOK_FRAMEWORKS.map(h => (
                    <div key={h.id} className="rounded-lg border border-white/[0.06] p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: h.color }} />
                        <span className="text-[11px] font-medium text-zinc-200">{h.name}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 italic mb-1">{h.template}</div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <span className="truncate">{h.example}</span>
                        <CopyButton text={h.example} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SEO */}
              {sec.id === 'seo' && (
                <div className="space-y-2">
                  {SEO_PHRASES.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-2.5">
                      <span className="text-[11px] font-medium text-zinc-200 flex-1">"{p.phrase}"</span>
                      <Chip className="text-[9px]">{p.where}</Chip>
                      <span className="text-[10px] text-zinc-500">{p.signal}</span>
                      <CopyButton text={p.phrase} />
                    </div>
                  ))}
                  <div className="mt-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.03] p-3">
                    <div className="mb-1 text-[10px] font-semibold tracking-wider text-rose-400 uppercase">Algorithm Poison — DO NOT SAY</div>
                    <div className="flex flex-wrap gap-1.5">
                      {BANNED_WORDS.map(w => <Chip key={w} className="border-rose-500/25 bg-rose-500/10 text-rose-400 text-[9px]">{w}</Chip>)}
                    </div>
                  </div>
                </div>
              )}

              {/* FRAMEWORKS */}
              {sec.id === 'frameworks' && (
                <div className="space-y-2">
                  {FRAMEWORKS.map(f => (
                    <button key={f.id} onClick={() => setOpenFramework(openFramework === f.id ? null : f.id)}
                      className="w-full rounded-lg border border-white/[0.06] p-3 text-left transition-all hover:border-white/[0.12]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-200">{f.name}</span>
                        {openFramework === f.id ? <ChevronDown size={10} className="text-zinc-500" /> : <ChevronRight size={10} className="text-zinc-500" />}
                      </div>
                      {openFramework === f.id && (
                        <ul className="mt-2 space-y-1">
                          {f.rules.map((r, i) => <li key={i} className="text-[10px] text-zinc-400 flex items-start gap-1.5"><span className="text-zinc-600">•</span>{r}</li>)}
                        </ul>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* VISUAL */}
              {sec.id === 'visual' && (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">3-Layer Rule</div>
                    <div className="text-[10px] text-zinc-400 mb-2">Every scene must have at least 2 visual layers:</div>
                    <div className="space-y-1.5">
                      {VISUAL_LAYERS.map(l => (
                        <div key={l.layer} className="flex items-center gap-2 rounded-lg border border-white/[0.06] p-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                          <span className="text-[10px] font-medium text-zinc-300">{l.layer}:</span>
                          <span className="text-[10px] text-zinc-500">{l.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Scene Switching Patterns</div>
                    <div className="space-y-1.5">
                      {SCENE_PATTERNS.map(p => (
                        <div key={p.name} className="rounded-lg border border-white/[0.06] p-2.5">
                          <div className="text-[10px] font-medium text-zinc-300">{p.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{p.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Sound Design</div>
                    <div className="space-y-1 text-[10px] text-zinc-400">
                      <div><span className="text-zinc-600">Transitions:</span> Whoosh (scene changes), Click (text appearing), Pop (badges), Ding (success)</div>
                      <div><span className="text-zinc-600">Music:</span> Duck to 20% when speaking, ramp to 100% during pauses</div>
                      <div><span className="text-zinc-600">Tempo:</span> 120-140 BPM fast tutorials, 90-110 BPM explanations</div>
                    </div>
                  </div>
                </div>
              )}

              {/* RULES */}
              {sec.id === 'rules' && (
                <div className="space-y-1.5">
                  {DECISION_RULES.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-white/[0.06] p-2.5">
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded bg-[#f5c518]/10 text-center text-[9px] font-bold leading-4 text-[#f5c518]">{i + 1}</span>
                      <span className="text-[10px] text-zinc-300">{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
