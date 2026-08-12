import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, Calendar, TrendingUp, Newspaper, Plug, Clock,
  ListTodo, Bell, MessageSquare, Layers, ChevronRight, ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import type { CardType } from '../../../types/canvas'

interface CardDrawerProps {
  open: boolean
  onToggle: () => void
  onAddCard: (type: CardType) => void
}

interface CardTemplate {
  type: CardType
  label: string
  description: string
  icon: LucideIcon
  color: string
  category: 'core' | 'content' | 'tools' | 'special'
}

export const CARD_TEMPLATES: CardTemplate[] = [
  // Core cards
  { type: 'focus', label: 'Focus Goals', description: 'Daily goals and focus tracking', icon: Target, color: '#f472b6', category: 'core' },
  { type: 'plan', label: 'Long-term Plan', description: 'Long-term goals and planning notes', icon: TrendingUp, color: '#a78bfa', category: 'core' },
  { type: 'finance', label: 'Finance', description: 'Balance, income, and expenses', icon: TrendingUp, color: '#34d399', category: 'core' },
  { type: 'digest', label: 'Research Digest', description: 'Research topics and summaries', icon: Newspaper, color: '#22d3ee', category: 'core' },
  { type: 'reflect', label: 'Reflections', description: 'Daily reflection summaries', icon: Bell, color: '#c084fc', category: 'core' },

  // Content cards
  { type: 'response', label: 'AI Response', description: 'Text response from the AI', icon: MessageSquare, color: '#60a5fa', category: 'content' },
  { type: 'annotation', label: 'Annotation', description: 'Notes and reminders', icon: MessageSquare, color: '#fb923c', category: 'content' },

  // Tool cards
  { type: 'connectors', label: 'Connectors', description: 'Email and calendar integration', icon: Plug, color: '#2dd4bf', category: 'tools' },
  { type: 'schedule', label: 'Weekly Schedule', description: '7-day schedule overview', icon: Calendar, color: '#f87171', category: 'tools' },
  { type: 'deadlines', label: 'Deadlines', description: 'Deadline tracker', icon: Clock, color: '#f97316', category: 'tools' },
  { type: 'planner', label: 'Daily Planner', description: 'Timeline with goals and tasks', icon: ListTodo, color: '#38bdf8', category: 'tools' },

  // Special cards
  { type: 'group', label: 'Group', description: 'Container for grouped cards', icon: Layers, color: '#818cf8', category: 'special' },
]

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  content: 'Content',
  tools: 'Tools',
  special: 'Special',
}

const CATEGORY_ORDER = ['core', 'content', 'tools', 'special']

export function CardDrawer({ open, onToggle, onAddCard }: CardDrawerProps) {
  const [hoveredType, setHoveredType] = useState<string | null>(null)

  const handleAdd = useCallback((type: CardType) => {
    onAddCard(type)
  }, [onAddCard])

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    cards: CARD_TEMPLATES.filter(t => t.category === cat),
  }))

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] bg-black/30 backdrop-blur-sm"
            onClick={onToggle}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[190] w-[320px] bg-[rgba(18,18,18,0.95)] backdrop-blur-xl border-l border-zinc-800/60 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
              <div>
                <h3 className="text-sm font-semibold text-white">Add Card</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Click to add to canvas</p>
              </div>
              <button
                onClick={onToggle}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Card list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {grouped.map(({ category, label, cards }) => (
                <div key={category}>
                  <div className="px-1 mb-2">
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
                  </div>
                  <div className="space-y-1.5">
                    {cards.map(template => {
                      const Icon = template.icon
                      const isHovered = hoveredType === template.type
                      return (
                        <button
                          key={template.type}
                          onClick={() => handleAdd(template.type)}
                          onMouseEnter={() => setHoveredType(template.type)}
                          onMouseLeave={() => setHoveredType(null)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-150"
                          style={{
                            background: isHovered
                              ? `linear-gradient(135deg, ${template.color}10, ${template.color}05)`
                              : 'transparent',
                            border: `1px solid ${isHovered ? template.color + '30' : 'transparent'}`,
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150"
                            style={{
                              background: `${template.color}15`,
                              color: template.color,
                              boxShadow: isHovered ? `0 0 12px ${template.color}20` : 'none',
                            }}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-zinc-200 truncate">{template.label}</div>
                            <div className="text-[11px] text-zinc-500 truncate">{template.description}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
