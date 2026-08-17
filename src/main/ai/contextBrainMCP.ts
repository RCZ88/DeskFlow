/**
 * ContextBrainMCP — MCP Server for DeskFlow Context System
 * 
 * Exposes context brain as an MCP server so any MCP-compatible AI
 * (Claude, ChatGPT desktop, Cursor, etc.) can query the user's context.
 * 
 * Runs on HTTP (stateless per MCP 2026-07-28 spec).
 * Hardened: localhost-only bind, optional token auth, rate limiting.
 */

import * as http from 'http'
import * as brain from './contextBrain'
import * as userContext from './userContextService'

const PORT = 54322

// ═══ Security ═══
const RATE_LIMIT_PER_MIN = 60
let rateBuckets: Map<string, number[]> = new Map()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = (rateBuckets.get(ip) || []).filter(t => now - t < 60000)
  if (bucket.length >= RATE_LIMIT_PER_MIN) {
    rateBuckets.set(ip, bucket)
    return true
  }
  bucket.push(now)
  rateBuckets.set(ip, bucket)
  return false
}

function checkToken(req: http.IncomingMessage): boolean {
  // Optional token: set env DESKFLOW_MCP_TOKEN to require it
  const expected = process.env.DESKFLOW_MCP_TOKEN
  if (!expected) return true
  const provided = req.headers['x-deskflow-mcp-token']
  return provided === expected
}

// ═══ MCP Protocol Handlers ═══

function handleInitialize(): any {
  return {
    jsonrpc: '2.0',
    result: {
      protocolVersion: '2026-07-28',
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
      },
      serverInfo: { name: 'deskflow-context-brain', version: '1.1.0' },
    },
  }
}

function handleToolsList(): any {
  return {
    jsonrpc: '2.0',
    result: {
      tools: [
        {
          name: 'search_context',
          description: 'Search the user\'s context memory using keyword, graph, or hybrid strategies. Returns ranked facts, episodes, and related entities.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              strategy: { type: 'string', enum: ['keyword', 'graph', 'hybrid', 'all'], default: 'keyword', description: 'Retrieval strategy' },
              limit: { type: 'number', default: 20, description: 'Max results' },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_entity',
          description: 'Get the full current state of an entity (all current facts, no history).',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Entity name to look up' },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_entity_history',
          description: 'Get the bitemporal history of an entity\'s facts (when things changed).',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Entity name' },
            },
            required: ['name'],
          },
        },
        {
          name: 'log_episode',
          description: 'Write a new episode into the context system (e.g. "remember that I decided X"). Also queues LLM enrichment.',
          inputSchema: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source: external_ai, voice_note, manual' },
              content: { type: 'string', description: 'The content to remember' },
            },
            required: ['source', 'content'],
          },
        },
        {
          name: 'get_stats',
          description: 'Get statistics about the context brain (episode count, entity count, fact count).',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_user_profile_summary',
          description: 'Get a compact summary of the user\'s derived context profile (traits, interests, communication style, focus). Does not expose raw private signals.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_active_facts',
          description: 'Get all current (non-expired) facts in the knowledge graph.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_recent_signals',
          description: 'Get the most recent high-confidence context signals (preferences, corrections, habits).',
          inputSchema: { type: 'object', properties: { limit: { type: 'number', default: 10 } } },
        },
      ],
    },
  }
}

function handleToolsCall(name: string, args: any): any {
  switch (name) {
    case 'search_context': {
      let strategies = ['keyword']
      if (args.strategy === 'all' || args.strategy === 'hybrid') strategies = ['keyword', 'graph']
      else if (args.strategy === 'graph') strategies = ['graph']
      const result = brain.retrieve(args.query, strategies)
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              query: args.query,
              strategy: result.strategy,
              facts: result.facts.slice(0, args.limit || 20).map(f => ({
                predicate: f.predicate,
                value: f.objectLiteral || f.objectId,
                confidence: f.confidence,
                current: !f.validTo,
              })),
              entities: result.entities.map(e => ({ name: e.name, type: e.type })),
              episodes: result.episodes.slice(0, 5).map(e => ({
                source: e.source,
                content: e.content.slice(0, 300),
                when: e.occurredAt,
              })),
            }, null, 2),
          }],
        },
      }
    }
    case 'get_entity': {
      const entities = brain.findEntities(args.name)
      if (entities.length === 0) {
        return { jsonrpc: '2.0', result: { content: [{ type: 'text', text: `No entity found matching "${args.name}"` }] } }
      }
      const entity = entities[0]
      const facts = brain.getCurrentFacts(entity.id)
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              entity: { name: entity.name, type: entity.type, aliases: entity.aliases },
              currentFacts: facts.map(f => ({ predicate: f.predicate, value: f.objectLiteral || f.objectId, confidence: f.confidence })),
              firstSeen: entity.firstSeen,
              lastSeen: entity.lastSeen,
            }, null, 2),
          }],
        },
      }
    }
    case 'get_entity_history': {
      const entities = brain.findEntities(args.name)
      if (entities.length === 0) {
        return { jsonrpc: '2.0', result: { content: [{ type: 'text', text: `No entity found matching "${args.name}"` }] } }
      }
      const history = brain.getFactHistory(entities[0].id)
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              entity: entities[0].name,
              history: history.map(f => ({
                predicate: f.predicate,
                value: f.objectLiteral || f.objectId,
                validFrom: f.validFrom,
                validTo: f.validTo || '(current)',
                confidence: f.confidence,
              })),
            }, null, 2),
          }],
        },
      }
    }
    case 'log_episode': {
      const epId = brain.logEpisode(args.source || 'external_ai', args.content)
      if (epId && (args.content || '').length >= 40) brain.createExtractionJob(epId)
      return {
        jsonrpc: '2.0',
        result: {
          content: [{ type: 'text', text: `Episode logged: ${epId}` }],
        },
      }
    }
    case 'get_stats': {
      const stats = brain.getBrainStats()
      const jobStats = brain.getJobStats()
      return {
        jsonrpc: '2.0',
        result: {
          content: [{ type: 'text', text: JSON.stringify({ ...stats, jobs: jobStats }, null, 2) }],
        },
      }
    }
    case 'get_user_profile_summary': {
      const profile = userContext.getProfile()
      const interests = Object.values(profile.interests || {})
        .sort((a: any, b: any) => b.confidence - a.confidence)
        .slice(0, 5)
        .map((i: any) => i.content)
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              summary: profile.summary,
              communication_style: Object.values(profile.communicationStyle || {}).map((c: any) => c.content),
              top_interests: interests,
              active_focus: interests[0] || null,
              growth_markers: (profile.growthMarkers || []).slice(-3).map((m: any) => m.label),
              context_version: profile.contextVersion,
            }, null, 2),
          }],
        },
      }
    }
    case 'get_active_facts': {
      const facts = brain.getAllCurrentFacts()
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(facts.slice(0, 50).map(f => ({
              predicate: f.predicate,
              value: f.objectLiteral || f.objectId,
              confidence: f.confidence,
              since: f.validFrom,
            })), null, 2),
          }],
        },
      }
    }
    case 'get_recent_signals': {
      const signals = userContext.getSignals(undefined, undefined, args.limit || 10)
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(signals.map(s => ({
              signal_type: s.signalType,
              content: s.content,
              confidence: s.confidence,
              occurrences: s.occurrenceCount,
              last_seen_at: new Date(s.lastSeenAt).toISOString(),
            })), null, 2),
          }],
        },
      }
    }
    default:
      return { jsonrpc: '2.0', error: { code: -32601, message: `Unknown tool: ${name}` } }
  }
}

function handleResourcesList(): any {
  return {
    jsonrpc: '2.0',
    result: {
      resources: [
        { uri: 'context://recent-episodes', name: 'Recent Episodes', description: 'Last 20 episodes from all sources', mimeType: 'application/json' },
        { uri: 'context://active-facts', name: 'Active Facts', description: 'All current (non-expired) facts', mimeType: 'application/json' },
        { uri: 'context://stats', name: 'Brain Stats', description: 'Episode/entity/fact counts', mimeType: 'application/json' },
        { uri: 'context://user-profile-summary', name: 'User Profile Summary', description: 'Compact derived profile summary', mimeType: 'application/json' },
        { uri: 'context://recent-signals', name: 'Recent Signals', description: 'Latest high-confidence context signals', mimeType: 'application/json' },
      ],
    },
  }
}

function handleResourcesRead(uri: string): any {
  switch (uri) {
    case 'context://recent-episodes': {
      const episodes = brain.getEpisodes(undefined, 20)
      return {
        jsonrpc: '2.0',
        result: {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(episodes.map(e => ({
              source: e.source,
              content: e.content.slice(0, 500),
              when: e.occurredAt,
            })), null, 2),
          }],
        },
      }
    }
    case 'context://active-facts': {
      const facts = brain.getAllCurrentFacts()
      return {
        jsonrpc: '2.0',
        result: {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(facts.map(f => ({
              predicate: f.predicate,
              value: f.objectLiteral || f.objectId,
              confidence: f.confidence,
            })), null, 2),
          }],
        },
      }
    }
    case 'context://stats': {
      const stats = brain.getBrainStats()
      return {
        jsonrpc: '2.0',
        result: {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(stats, null, 2) }],
        },
      }
    }
    case 'context://user-profile-summary': {
      const profile = userContext.getProfile()
      const interests = Object.values(profile.interests || {})
        .sort((a: any, b: any) => b.confidence - a.confidence)
        .slice(0, 5)
        .map((i: any) => i.content)
      return {
        jsonrpc: '2.0',
        result: {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              summary: profile.summary,
              communication_style: Object.values(profile.communicationStyle || {}).map((c: any) => c.content),
              top_interests: interests,
            }, null, 2),
          }],
        },
      }
    }
    case 'context://recent-signals': {
      const signals = userContext.getSignals(undefined, undefined, 10)
      return {
        jsonrpc: '2.0',
        result: {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(signals.map(s => ({
              signal_type: s.signalType,
              content: s.content,
              confidence: s.confidence,
            })), null, 2),
          }],
        },
      }
    }
    default:
      return { jsonrpc: '2.0', error: { code: -32601, message: `Unknown resource: ${uri}` } }
  }
}

// ═══ HTTP Server ═══

export function startMcpServer(): http.Server | null {
  const server = http.createServer((req, res) => {
    const ip = (req.socket.remoteAddress || 'local').replace('::ffff:', '')

    // Token auth
    if (!checkToken(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' } }))
      return
    }

    // Rate limiting
    if (isRateLimited(ip)) {
      res.writeHead(429, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32005, message: 'Rate limit exceeded (60 req/min)' } }))
      return
    }

    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end('Method not allowed')
      return
    }

    let body = ''
    let tooLarge = false
    req.on('data', chunk => {
      body += chunk
      if (body.length > 100000) { tooLarge = true; req.destroy() }
    })
    req.on('end', () => {
      try {
        if (tooLarge) {
          res.writeHead(413)
          res.end('Payload too large')
          return
        }
        const msg = JSON.parse(body)
        let response: any

        switch (msg.method) {
          case 'initialize': response = handleInitialize(); break
          case 'tools/list': response = handleToolsList(); break
          case 'tools/call': response = handleToolsCall(msg.params?.name, msg.params?.arguments || {}); break
          case 'resources/list': response = handleResourcesList(); break
          case 'resources/read': response = handleResourcesRead(msg.params?.uri); break
          case 'notifications/initialized': response = null; break
          default: response = { jsonrpc: '2.0', error: { code: -32601, message: `Method not found: ${msg.method}` } }
        }

        if (response) {
          response.id = msg.id
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(response))
        } else {
          res.writeHead(204)
          res.end()
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }))
      }
    })
  })

  server.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE') {
      console.warn(`[ContextBrain] MCP port ${PORT} already in use — MCP server not started`)
    } else {
      console.error('[ContextBrain] MCP server error:', err?.message)
    }
  })

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[ContextBrain] MCP server running on http://127.0.0.1:${PORT}`)
  })

  return server
}