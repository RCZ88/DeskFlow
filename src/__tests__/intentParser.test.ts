import { describe, it, expect } from 'vitest'
import { parseIntent, getSuggestions } from '../services/intentParser'

describe('parseIntent', () => {
  describe('noop', () => {
    it('returns noop for empty input', () => {
      expect(parseIntent('')).toEqual({ type: 'noop' })
    })
    it('returns noop for whitespace only', () => {
      expect(parseIntent('   ')).toEqual({ type: 'noop' })
    })
  })

  describe('slash commands → cards', () => {
    it('/focus opens focus card', () => {
      expect(parseIntent('/focus')).toEqual({ type: 'open_card', cardType: 'focus', args: '' })
    })
    it('/plan opens plan card', () => {
      expect(parseIntent('/plan')).toEqual({ type: 'open_card', cardType: 'plan', args: '' })
    })
    it('/digest opens digest card', () => {
      expect(parseIntent('/digest')).toEqual({ type: 'open_card', cardType: 'digest', args: '' })
    })
    it('/reflect opens reflect card', () => {
      expect(parseIntent('/reflect')).toEqual({ type: 'open_card', cardType: 'reflect', args: '' })
    })
    it('/finance opens finance card', () => {
      expect(parseIntent('/finance')).toEqual({ type: 'open_card', cardType: 'finance', args: '' })
    })
    it('/focus with args passes args', () => {
      expect(parseIntent('/focus today')).toEqual({ type: 'open_card', cardType: 'focus', args: 'today' })
    })
  })

  describe('slash commands → data', () => {
    it('/unread runs command', () => {
      expect(parseIntent('/unread')).toEqual({ type: 'run_command', command: 'unread', args: '' })
    })
    it('/inbox with args', () => {
      expect(parseIntent('/inbox 5')).toEqual({ type: 'run_command', command: 'inbox', args: '5' })
    })
    it('/sync runs command', () => {
      expect(parseIntent('/sync')).toEqual({ type: 'run_command', command: 'sync', args: '' })
    })
    it('/email with search', () => {
      expect(parseIntent('/email meeting')).toEqual({ type: 'run_command', command: 'email', args: 'meeting' })
    })
  })

  describe('slash commands → AI', () => {
    it('/help sends to AI', () => {
      expect(parseIntent('/help')).toEqual({ type: 'send_to_ai', prompt: '/help' })
    })
  })

  describe('unknown commands', () => {
    it('returns error for unknown slash', () => {
      const result = parseIntent('/blahblah')
      expect(result.type).toBe('error')
      expect(result.message).toContain('Unknown command')
    })
  })

  describe('keyword matching', () => {
    it('"show my goals" opens focus', () => {
      expect(parseIntent('show my goals')).toEqual({ type: 'open_card', cardType: 'focus' })
    })
    it('"what are my goals" opens focus', () => {
      expect(parseIntent('what are my goals')).toEqual({ type: 'open_card', cardType: 'focus' })
    })
    it('"show finances" opens finance', () => {
      expect(parseIntent('show finances')).toEqual({ type: 'open_card', cardType: 'finance' })
    })
    it('"my wallet" opens finance', () => {
      expect(parseIntent('my wallet balance')).toEqual({ type: 'open_card', cardType: 'finance' })
    })
    it('"review today" opens reflect', () => {
      expect(parseIntent('review today')).toEqual({ type: 'open_card', cardType: 'reflect' })
    })
    it('"what\'s in the news" opens digest', () => {
      expect(parseIntent("what's in the news")).toEqual({ type: 'open_card', cardType: 'digest' })
    })
  })

  describe('conversational → AI', () => {
    it('"what should I focus on today?" sends to AI', () => {
      expect(parseIntent('what should I focus on today?')).toEqual({ type: 'send_to_ai', prompt: 'what should I focus on today?' })
    })
    it('"help me plan my morning" matches plan keyword', () => {
      expect(parseIntent('help me plan my morning')).toEqual({ type: 'open_card', cardType: 'plan' })
    })
  })
})

describe('getSuggestions', () => {
  it('returns empty for empty input', () => {
    expect(getSuggestions('')).toEqual([])
  })

  it('filters slash commands by query', () => {
    const results = getSuggestions('/foc')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(s => s.name.includes('focus'))).toBe(true)
  })

  it('returns natural language suggestions for non-slash input', () => {
    const results = getSuggestions('show')
    expect(results.length).toBeGreaterThan(0)
  })
})
