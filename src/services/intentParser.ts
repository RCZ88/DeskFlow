/**
 * IntentParser — routes user input to canvas actions.
 * No NLP, just keyword matching + slash command routing.
 */

import { getAllCommands, findCommand, fillPrompt } from './customSlashCommands'

export type IntentType =
  | 'open_card'
  | 'run_command'
  | 'send_to_ai'
  | 'custom_command'
  | 'clarify'
  | 'error'
  | 'noop'

export interface Intent {
  type: IntentType
  cardType?: string
  command?: string
  args?: string
  prompt?: string
  options?: string[]
  message?: string
}

// Keyword → card type mapping
const KEYWORD_MAP: Record<string, string> = {
  'goals': 'focus',
  'goal': 'focus',
  'today goals': 'focus',
  'daily goals': 'focus',
  'my goals': 'focus',
  'show goals': 'focus',
  'plan': 'plan',
  'long-term': 'plan',
  'longterm': 'plan',
  'milestones': 'plan',
  'show plan': 'plan',
  'digest': 'digest',
  'news': 'digest',
  'what\'s new': 'digest',
  'headlines': 'digest',
  'finance': 'finance',
  'money': 'finance',
  'wallet': 'finance',
  'balance': 'finance',
  'spending': 'finance',
  'subscriptions': 'finance',
  'reflect': 'reflect',
  'review': 'reflect',
  'yesterday': 'reflect',
  'how did i do': 'reflect',
}

// Slash commands that map to card types
const SLASH_CARD_MAP: Record<string, string> = {
  'focus': 'focus',
  'plan': 'plan',
  'digest': 'digest',
  'reflect': 'reflect',
  'finance': 'finance',
}

// Commands that should be sent to AI (conversational)
const AI_SEND_COMMANDS = new Set(['plan', 'digest', 'reflect', 'focus', 'help'])

// Data commands that fetch and display directly
const DATA_COMMANDS = new Set(['unread', 'inbox', 'calendar', 'today', 'sync', 'email'])

export function parseIntent(input: string): Intent {
  const trimmed = input.trim()
  if (!trimmed) return { type: 'noop' }

  // Slash command
  if (trimmed.startsWith('/')) {
    const [cmd, ...args] = trimmed.slice(1).split(' ')
    const argStr = args.join(' ').trim()
    const cmdLower = cmd.toLowerCase()

    // Check if it maps to a card type
    if (SLASH_CARD_MAP[cmdLower]) {
      return { type: 'open_card', cardType: SLASH_CARD_MAP[cmdLower], args: argStr }
    }

    // Check if it's a data command (fetches and shows in transcript)
    if (DATA_COMMANDS.has(cmdLower)) {
      return { type: 'run_command', command: cmdLower, args: argStr }
    }

    // Check if it should go to AI
    if (AI_SEND_COMMANDS.has(cmdLower)) {
      return { type: 'send_to_ai', prompt: trimmed }
    }

    // Check custom commands
    const custom = findCommand(cmdLower)
    if (custom) {
      const prompt = fillPrompt(custom.prompt, argStr)
      return { type: 'custom_command', command: cmdLower, args: argStr, prompt }
    }

    return { type: 'error', message: `Unknown command: /${cmd}` }
  }

  // Natural language — check keywords
  const lower = trimmed.toLowerCase()
  for (const [keyword, cardType] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      return { type: 'open_card', cardType }
    }
  }

  // Conversational — send to AI
  return { type: 'send_to_ai', prompt: trimmed }
}

/**
 * Get autocomplete suggestions for partial input.
 */
export function getSuggestions(input: string): Array<{ name: string; description: string; category: string }> {
  const trimmed = input.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('/')) {
    const query = trimmed.slice(1).toLowerCase()
    const builtIn = [
      { name: '/focus', description: 'Open focus card', category: 'Cards' },
      { name: '/plan', description: 'Open plan card', category: 'Cards' },
      { name: '/digest', description: 'Open digest card', category: 'Cards' },
      { name: '/reflect', description: 'Open reflect card', category: 'Cards' },
      { name: '/finance', description: 'Open finance card', category: 'Cards' },
      { name: '/unread', description: 'Show unread emails', category: 'Data' },
      { name: '/inbox', description: 'Show recent emails', category: 'Data' },
      { name: '/calendar', description: 'Show upcoming events', category: 'Data' },
      { name: '/today', description: 'Today at a glance', category: 'Data' },
      { name: '/sync', description: 'Sync connectors', category: 'Data' },
      { name: '/email', description: 'Search emails', category: 'Data' },
    ]
    const custom = getAllCommands().map(c => ({
      name: `/${c.name}`,
      description: c.description,
      category: 'Custom',
    }))
    return [...builtIn, ...custom].filter(s =>
      s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
    )
  }

  // Natural language suggestions
  const lower = trimmed.toLowerCase()
  const suggestions = [
    { name: 'Show my goals', description: 'Open focus card', category: 'Quick' },
    { name: 'What should I focus on?', description: 'Ask AI for focus advice', category: 'Quick' },
    { name: 'Show my finances', description: 'Open finance card', category: 'Quick' },
    { name: 'Review today', description: 'Open reflect card', category: 'Quick' },
  ]
  return suggestions.filter(s => s.name.toLowerCase().includes(lower))
}
